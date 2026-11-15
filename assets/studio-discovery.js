/* Guided ListPull discovery interface. CSV analysis occurs only in the browser.
 * Exploratory cohort comparisons and inventory scenarios are NOT validated predictions. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const engine=window.ListPullData;
 if(!engine){$('discovery-status').textContent='Data tools unavailable. Please refresh.';return;}
 let data=null,profile=[],lastReport=null;
 const allKeys=['discovery-group','discovery-outcome','discovery-item','discovery-stock','discovery-demand','discovery-action-a','discovery-action-b','discovery-reward-a','discovery-reward-b'];
 const node=(tag,cls,txt)=>{
   const e=document.createElement(tag);
   if(cls)e.className=cls;
   if(txt!==undefined)e.textContent=String(txt);
   return e;
 };
 const fmt=n=>Number(n).toLocaleString(undefined,{maximumFractionDigits:2});
 const pct=n=>Number.isFinite(n)?(n*100).toFixed(1)+'%':'N/A';
 const setStatus=msg=>{$('discovery-status').textContent=msg;};
 function badge(label){
  const x=node('span','',label);$('discovery-quality').append(x);
 }
 function fillSelect(id,prefer,allowed=null){
  const sel=$(id);sel.replaceChildren();
  const candidates=allowed&&allowed.length?allowed:data.headers;
  for(const key of candidates){
   const opt=node('option','',key);
   opt.value=key;sel.append(opt);
  }
  if(candidates.includes(prefer))sel.value=prefer;
 }
 function loadDataset(set){
  data=set;profile=engine.profile(set);lastReport=null;
  $('discovery-download').disabled=true;
  $('discovery-demo-download').disabled=!set.demo;
  $('discovery-dataset-name').textContent=set.name+' · '+fmt(set.rows.length)+' rows';
  const suggest=engine.suggest(set,profile);
  $('discovery-goal').value=suggest.goal==='nash'?'nash':suggest.goal;
  const categories=profile.filter(p=>p.type==='category'||p.type==='text').map(p=>p.key);
  const numbers=profile.filter(p=>p.type==='numeric').map(p=>p.key);
  fillSelect('discovery-group',suggest.group,categories);
  fillSelect('discovery-outcome',suggest.outcome,[...numbers,...profile.filter(p=>p.type==='category'&&p.unique<=15).map(p=>p.key)]);
  fillSelect('discovery-item',suggest.item);
  fillSelect('discovery-stock',suggest.stock,numbers);
  fillSelect('discovery-demand',suggest.demand,numbers);
  fillSelect('discovery-action-a',suggest.actionA,categories);
  fillSelect('discovery-action-b',suggest.actionB,categories);
  fillSelect('discovery-reward-a',suggest.rewardA,numbers);
  fillSelect('discovery-reward-b',suggest.rewardB,numbers);
  $('discovery-uplift').value='0';$('discovery-uplift-value').value='+0%';
  showGoal();showPositive();
  renderSchema();
  const q=engine.quality(data,profile),area=$('discovery-quality');area.replaceChildren();
  badge(q.rows+' records');badge(q.columns+' fields');badge(q.completeness+'% populated');
  q.issues.slice(0,2).forEach(issue=>badge('⚠ '+issue));
  $('discovery-insights').replaceChildren(node('p','', 'Your data is ready. Select “Analyze the data” to see the results.'));
  setStatus('Detected '+q.columns+' columns. No information left your device.');
  document.querySelectorAll('[data-demo]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.demo===set.demoId)));
  analyze();
 }
 function showGoal(){
  const choice=$('discovery-goal').value;
  $('discovery-group-fields').hidden=choice!=='groups';
  $('discovery-stock-fields').hidden=choice!=='stockout';
  $('discovery-nash-fields').hidden=choice!=='nash';
 }
 function showPositive(){
   const key=$('discovery-outcome').value,field=profile.find(x=>x.key===key);
   const relevant=field?.type==='category'&&field.unique<=15;
   $('discovery-positive-field').hidden=!relevant;
   if(relevant){
     const values=field.top.map(v=>v[0]);
     fillSelect('discovery-positive',values.find(v=>/^(yes|true|success|on.time|renewed|retained)$/i.test(v))||values[0],values);
   }
 }
 function renderSchema(){
  $('discovery-schema-count').textContent='('+profile.length+')';
  const parent=$('discovery-schema-body');
  parent.replaceChildren();
  const table=node('table');
  const head=node('tr');
  ['Field','Detected','Filled'].forEach(v=>head.append(node('th','',v)));
  table.append(head);
  for(const col of profile){
   const row=node('tr');
   row.append(node('td','',col.key),node('td','',col.type),node('td','',col.completeness+'%'));
   table.append(row);
  }
  parent.append(table);
 }
 function chartTable(headers,rows,ratioIdx=null){
  const scroll=node('div','discovery-table-scroll'),table=node('table','discovery-results-table');
  const head=node('thead'),tr=node('tr');
  headers.forEach(h=>tr.append(node('th','',h)));head.append(tr);table.append(head);
  const body=node('tbody');
  for(const row of rows){
   const r=node('tr');
   row.forEach((col,j)=>{
    const cell=node('td','',col);
    if(j===ratioIdx&&Number.isFinite(Number(col))){
      const bar=node('div','discovery-bar'),fill=node('span');
      fill.style.width=Math.max(0,Math.min(100,Number(col)))+'%';
      bar.append(fill);cell.append(bar);
    }
    r.append(cell);
   });
   body.append(r);
  }
  table.append(body);scroll.append(table);return scroll;
 }
 function metric(parent,value,label){
  const box=node('div');box.append(node('strong','',value),node('span','',label));parent.append(box);
 }
 function message(parent,text){
  parent.append(node('p','discovery-insight-note',text));
 }
 function visualBars(items,{title='',twoSeries=false,percentage=false}={}){
   const section=node('div','outcome-chart');
   section.append(node('h4','',title));
   if(!items.length){section.append(node('p','','No matching items in this scenario.'));return section;}
   const limited=items.slice(0,7),height=limited.length*52+42,NS='http://www.w3.org/2000/svg';
   const svg=document.createElementNS(NS,'svg');
   svg.setAttribute('viewBox','0 0 830 '+height);
   svg.setAttribute('role','img');svg.setAttribute('aria-label',title);
   const el=(tag,attrs,text)=>{
     const e=document.createElementNS(NS,tag);
     for(const [k,v] of Object.entries(attrs||{}))e.setAttribute(k,String(v));
     if(text!==undefined)e.textContent=String(text);
     return e;
   };
   const highest=twoSeries?Math.max(1,...limited.flatMap(x=>[x.a,x.b])):Math.max(1,...limited.map(x=>Math.abs(x.a)));
   for(let i=0;i<limited.length;i++){
     const item=limited[i],y=24+i*52;
     svg.append(el('text',{x:195,y:y+18,'text-anchor':'end',fill:'#dbe1f5','font-size':18},String(item.label).slice(0,19)));
     svg.append(el('rect',{x:210,y:y+2,width:540,height:twoSeries?14:23,rx:6,fill:'#24374e'}));
     svg.append(el('rect',{x:210,y:y+2,width:Math.max(1,540*Math.max(0,item.a)/highest),height:twoSeries?14:23,rx:6,fill:'#74dfc4'}));
     if(twoSeries){
       svg.append(el('rect',{x:210,y:y+21,width:540,height:14,rx:6,fill:'#24374e'}));
       svg.append(el('rect',{x:210,y:y+21,width:Math.max(1,540*Math.max(0,item.b)/highest),height:14,rx:6,fill:'#ffa96b'}));
     }
     const value=percentage?(item.a*100).toFixed(1)+'%':fmt(item.a)+(twoSeries?' / '+fmt(item.b):'');
     svg.append(el('text',{x:770,y:y+19,fill:'#f8e9df','font-size':16},value));
   }
   section.append(svg);
   if(twoSeries)section.append(node('p','outcome-chart-legend','● Available stock     ● Scenario demand'));
   return section;
 }
 function nashAnalysis(){
  const keys={actionA:$('discovery-action-a').value,actionB:$('discovery-action-b').value,rewardA:$('discovery-reward-a').value,rewardB:$('discovery-reward-b').value};
  const out=engine.deriveNash(data,keys);
  const calculation=window.ListPullMath.solve2x2(out.A,out.B);
  const pack={kind:'nash',matrix:out,solution:calculation,sourceRows:data.rows.length,notes:[
    'Payoffs are observed averages, not causal estimates of what would occur under an intervention.',
    'The source must record each of four action combinations at least three times.',
    'A stable strategic choice does not predict demand, customers or future movement.'
  ]};
  const result=$('discovery-insights');
  result.replaceChildren(node('h3','','What the observed decisions suggest'));
  result.append(node('p','', 'We grouped historical records by each party’s action and estimated the average recorded payoff for both parties. The resulting matrix can be edited in the advanced Nash workbench.'));
  const badges=node('div','discovery-insight-badges');
  metric(badges,calculation.equilibria.length,'Representative equilibria');
  metric(badges,fmt(Math.min(...out.counts.flat())),'Smallest cell sample');
  metric(badges,fmt(data.rows.length),'Observed records');
  result.append(badges);
  result.append(visualBars(out.actionsA.flatMap((a,i)=>out.actionsB.map((b,j)=>({label:a+' / '+b,a:Math.max(0,out.A[i][j]),b:Math.max(0,out.B[i][j])}))),{title:'Average recorded result for each choice',twoSeries:true}));
  result.append(chartTable(['Party A action','Party B action','A avg payoff','B avg payoff','Samples'],
   out.actionsA.flatMap((a,i)=>out.actionsB.map((b,j)=>[a,b,fmt(out.A[i][j]),fmt(out.B[i][j]),fmt(out.counts[i][j])]))));
  if(calculation.equilibria.length){
   const best=calculation.equilibria[0];
   message(result,'Example stable mix: Party A uses “'+out.actionsA[0]+'” '+pct(best.x[0])+' of the time; Party B uses “'+out.actionsB[0]+'” '+pct(best.y[0])+' of the time. This is a theoretical equilibrium of estimated payoffs, not a validated outcome forecast.');
  }
  message(result,'Observed data may reflect selection bias or factors not represented in the matrix; validate the payoff assumptions before operational use.');
  const set=(id,val)=>{$(id).value=String(val);};
  set('player-a','Party A');set('player-b','Party B');
  set('a0',out.actionsA[0]);set('a1',out.actionsA[1]);set('b0',out.actionsB[0]);set('b1',out.actionsB[1]);
  for(let i=0;i<2;i++)for(let j=0;j<2;j++){
   set('pay-a'+i+j,Number(out.A[i][j].toFixed(3)));
   set('pay-b'+i+j,Number(out.B[i][j].toFixed(3)));
  }
  $('solve-game').click();
  const open=node('button','btn secondary','Inspect & edit the payoff matrix ↗');
  open.type='button';open.addEventListener('click',()=>{
   const details=$('advanced-game');details.open=true;details.scrollIntoView({behavior:'smooth',block:'start'});
  });
  result.append(open);
  return pack;
 }
 function analyze(){
  if(!data){setStatus('Choose a sample or upload a CSV.');return}
  try{
   const goal=$('discovery-goal').value;
   if(goal==='nash'){lastReport=nashAnalysis();}
   else{
    const mapping=goal==='stockout'?{
      goal,stock:$('discovery-stock').value,demand:$('discovery-demand').value,item:$('discovery-item').value,uplift:Number($('discovery-uplift').value)
    }:{goal,group:$('discovery-group').value,outcome:$('discovery-outcome').value,positive:$('discovery-positive').value};
    const out=engine.analyze(data,mapping);
    const result=$('discovery-insights');
    result.replaceChildren();
    const top=node('div','discovery-insight-badges');
    if(out.kind==='stockout'){
      result.append(node('h3','','Which items may need replenishment?'));
      result.append(node('p','', 'Using the stock and demand values you selected, these items have inventory at or below the assumed demand. Try the slider to compare a demand increase or decrease.'));
      metric(top,fmt(out.count),'Items at or below scenario demand');
      metric(top,pct(out.share),'Share of reviewed items');
      metric(top,(out.uplift>=0?'+':'')+pct(out.uplift),'Demand assumption adjustment');
      result.append(top);
      result.append(visualBars(out.flagged.map(item=>({label:item.item,a:item.stock,b:item.adjustedDemand})),{title:'Items to check: stock compared with expected demand',twoSeries:true}));
      const dataRows=out.flagged.map(item=>[item.item,fmt(item.stock),fmt(item.adjustedDemand),fmt(item.gap)]);
      result.append(chartTable(['Item','Available','Scenario demand','Balance'],dataRows));
      if(!out.count)message(result,'Under the assumptions and rows provided, no item falls at or below modeled demand.');
      message(result,'This is an inventory-balance scenario, not a learned forecast of the probability of running out. Demand forecasts and supplier lead times are not inferred here.');
    }else if(out.kind==='rates'){
      result.append(node('h3','','What share of records show this outcome?'));
      result.append(node('p','', 'Within each historical group, we counted how often “'+out.positive+'” appears in the selected field. This gives observed rates, not a validated likelihood of future behavior.'));
      metric(top,pct(out.share),'Overall observed rate');
      metric(top,fmt(out.total),'Records reviewed');
      metric(top,fmt(out.rows.length),'Groups compared');
      result.append(top);
      result.append(visualBars(out.rows.map(r=>({label:r.name,a:r.share})),{title:'Observed rate by group (share of records)',percentage:true}));
      const rows=out.rows.map(r=>[r.name,fmt(r.count),fmt(r.matched),pct(r.share),pct(r.interval[0])+'–'+pct(r.interval[1])]);
      result.append(chartTable(['Group','Records','Matches','Observed rate','Approx. 95% interval'],rows));
      message(result,'Intervals use a binomial independence assumption. Repeated customer records, correlated events or biased samples can invalidate that interpretation.');
      if(out.hasSparse)message(result,'One or more groups have fewer than 10 records. Treat those rates as highly uncertain.');
    }else{
      result.append(node('h3','','Where does the outcome differ?'));
      result.append(node('p','', 'We grouped the observed records by “'+out.mapping.group+'” and compared historical “'+out.mapping.outcome+'” values. This can reveal where an operational review may be useful.'));
      metric(top,fmt(out.overall),'Overall mean (represented groups)');
      metric(top,fmt(out.total),'Valid records analyzed');
      metric(top,fmt(out.rows.length),'Groups represented');
      result.append(top);
      const maxMean=Math.max(...out.rows.map(r=>Math.abs(r.mean)),1);
      result.append(visualBars(out.rows.map(r=>({label:r.name,a:Math.max(0,r.mean)})),{title:'Average outcome by group'}));
      const rows=out.rows.map(r=>[r.name,fmt(r.count),fmt(r.mean),fmt(r.median),String(Math.round(Math.max(0,r.mean)/maxMean*100))]);
      result.append(chartTable(['Group','Records','Average','Median','Relative scale %'],rows,4));
      if(out.hasSparse)message(result,'Some groups have fewer than five observations. Those averages can change substantially with new records.');
      message(result,'These are historical correlations, not evidence of cause. Future outcomes require additional assumptions, representative data and validation.');
    }
    if(out.excluded)message(result,out.excluded+' records were omitted because selected fields were blank or nonnumeric.');
    lastReport=out;
   }
   const q=engine.quality(data,profile);
   lastReport={datasetName:data.name,dataIsSynthetic:!!data.demo,generatedAt:new Date().toISOString(),quality:q,...lastReport};
   $('discovery-download').disabled=false;
   setStatus('Analysis complete. Review assumptions and export a summary if useful.');
  }catch(error){
   lastReport=null;$('discovery-download').disabled=true;
   $('discovery-insights').replaceChildren(node('p','discovery-insight-note',error.message));
   setStatus('Choose valid columns or another sample: '+error.message);
  }
 }
 document.querySelectorAll('[data-demo]').forEach(button=>button.addEventListener('click',()=>{
  const next=engine.makeDemo(button.dataset.demo);next.demoId=button.dataset.demo;
  loadDataset(next);
 }));
 $('discovery-upload').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;
  if(file.size>3*1024*1024){setStatus('Please choose a CSV under 3 MB.');return}
  try{
   const parsed=engine.parseCSV(await file.text());
   parsed.name=file.name.replace(/[<>]/g,'').slice(0,80);
   loadDataset(parsed);
  }catch(error){setStatus('Could not read CSV: '+error.message)}
 });
 $('discovery-outcome').addEventListener('change',()=>{showPositive();lastReport=null;$('discovery-download').disabled=true;});
 $('discovery-goal').addEventListener('change',()=>{
  showGoal();lastReport=null;$('discovery-download').disabled=true;
  $('discovery-insights').replaceChildren(node('p','','Choose your fields and select Analyze the data.'));
 });
 $('discovery-uplift').addEventListener('input',event=>{
  const n=Number(event.target.value);$('discovery-uplift-value').value=(n>=0?'+':'')+n+'%';
 });
 $('discovery-analyze').addEventListener('click',analyze);
 $('discovery-demo-download').addEventListener('click',()=>{
  if(!data?.demo)return;
  const escape=v=>'"'+String(v??'').replace(/"/g,'""')+'"';
  const rows=[data.headers.map(escape).join(','),...data.rows.map(row=>data.headers.map(key=>escape(row[key])).join(','))];
  const blob=new Blob([rows.join('\n')+'\n'],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='listpull-'+(data.demoId||'sample')+'-example.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 $('discovery-download').addEventListener('click',()=>{
  if(!lastReport)return;
  const blob=new Blob([JSON.stringify(lastReport,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='listpull-discovery-report.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 const starter=engine.makeDemo('inventory');starter.demoId='inventory';loadDataset(starter);
})();
