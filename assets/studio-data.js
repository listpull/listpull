/* ListPull Data Discovery — client-only schema profiling and descriptive simulations.
 * This is an exploratory analytics aid. It never asserts causality or a validated forecast.
 */
(function(root){
 'use strict';
 const MAX_ROWS=5000,MAX_COLUMNS=40;
 const sampleConfigs={
  inventory:{label:'Retail inventory',goal:'stockout',fields:['sku','category','on_hand','expected_demand'],rows:[]},
  customers:{label:'Customer spending',goal:'groups',fields:['segment','orders','spend','repeat_purchase'],rows:[]},
  deliveries:{label:'Delivery operations',goal:'groups',fields:['carrier','route','delay_minutes','delivered_on_time'],rows:[]},
  wildlife:{label:'Wildlife sightings',goal:'groups',fields:['location','species','sightings','observation_week'],rows:[]},
  movement:{label:'Animal movement tracking',goal:'movement',fields:['animal_id','timestamp','latitude','longitude'],rows:[]},
  farming:{label:'Agriculture',goal:'groups',fields:['crop','field','rainfall_mm','yield_kg'],rows:[]},
  health:{label:'Public health — aggregated',goal:'groups',fields:['region','report_week','case_count','clinic_capacity'],rows:[]},
  government:{label:'Public service operations',goal:'groups',fields:['service','district','processing_days','resolved'],rows:[]},
  strategic:{label:'Business strategy payoffs',goal:'nash',fields:['our_action','other_action','our_score','other_score'],rows:[]}
 };
 function makeDemo(key){
  const cfg=sampleConfigs[key]||sampleConfigs.inventory;
  const rows=[];
  if(key==='inventory'){const cats=['Toys','Clothing','Books','Garden'];for(let i=0;i<35;i++)rows.push(['SKU-'+String(i+1).padStart(3,'0'),cats[i%4],8+(i*17)%90,12+(i*13)%83]);}
  else if(key==='customers'){const seg=['New','Loyal','Seasonal','Business'];for(let i=0;i<80;i++){const s=i%4;rows.push([seg[s],1+(i*7)%12,Math.round(24+(i*19)%230+(s===1?130:0)),s===1||i%4===0?'Yes':'No']);}}
  else if(key==='deliveries'){const cr=['North','Metro','Coastal'];for(let i=0;i<72;i++){const d=(i*7)%61;rows.push([cr[i%3],['Local','Regional'][i%2],d,d<30?'Yes':'No']);}}
  else if(key==='wildlife'){const loc=['Wetland','Forest','Grassland','River'];const species=['Deer','Fox','Heron'];for(let i=0;i<60;i++)rows.push([loc[(i*3+Math.floor(i/7))%4],species[i%3],1+(i*5)%18,'2026-W'+String(1+Math.floor(i/6)).padStart(2,'0')]);}
  else if(key==='movement'){
    const animals=[{id:'Heron H-101',lat:38.512,long:-76.810,dy:.0021,dx:.0032},
      {id:'Deer D-204',lat:38.519,long:-76.796,dy:-.0015,dx:.0026},
      {id:'Fox F-007',lat:38.507,long:-76.822,dy:.0017,dx:-.0021}];
    for(const animal of animals)for(let i=0;i<12;i++){
      const time=new Date(Date.UTC(2026,9,1+i,8,0,0));
      rows.push([animal.id,time.toISOString(),(animal.lat+i*animal.dy+Math.sin(i*.6)*.0007).toFixed(6),
        (animal.long+i*animal.dx+Math.cos(i*.45)*.0006).toFixed(6)]);
    }
  }
  else if(key==='farming'){for(let i=0;i<56;i++){const crop=['Corn','Beans','Wheat','Soy'][i%4];rows.push([crop,'Field '+String(1+i%8),45+(i*13)%130,150+(i*27)%220]);}}
  else if(key==='health'){for(let i=0;i<48;i++)rows.push([['North','South','East','West'][i%4],'2026-W'+String(1+Math.floor(i/4)).padStart(2,'0'),3+(i*7)%45,35+(i*19)%80]);}
  else if(key==='government'){for(let i=0;i<72;i++)rows.push([['Permits','Benefits','Inspections'][i%3],['A','B','C','D'][i%4],2+(i*11)%26,i%5===0?'No':'Yes']);}
  else if(key==='strategic'){const a=['Cooperate','Compete'],b=['Share','Withhold'];for(let i=0;i<80;i++){const x=i%2,y=Math.floor(i/2)%2;const A=[[5,0],[3,2]],B=[[5,3],[0,2]];rows.push([a[x],b[y],A[x][y]+(i%3-1)*.2,B[x][y]+(i%5-2)*.15]);}}
  return {name:cfg.label,goal:cfg.goal,headers:[...cfg.fields],rows:rows.map(row=>Object.fromEntries(cfg.fields.map((h,i)=>[h,String(row[i])]))),demo:true};
 }
 function parseCSV(str){
  if(typeof str!=='string'||str.length>3*1024*1024)throw Error('Choose a CSV under 3 MB');
  const first=(str.replace(/^\uFEFF/,'').split(/\r?\n/).find(line=>line.trim())||'');
  const counts={',':(first.match(/,/g)||[]).length,';':(first.match(/;/g)||[]).length,'\t':(first.match(/\t/g)||[]).length};
  const sep=Object.keys(counts).sort((a,b)=>counts[b]-counts[a])[0];
  let data=[],row=[],field='',quoted=false,s=str.replace(/^\uFEFF/,'');
  for(let i=0;i<s.length;i++){
   const ch=s[i],next=s[i+1];
   if(quoted){
    if(ch==='"'&&next==='"'){field+='"';i++;}
    else if(ch==='"')quoted=false;
    else field+=ch;
   }else if(ch==='"'&&field==='')quoted=true;
   else if(ch===sep){row.push(field);field='';}
   else if(ch==='\n'||ch==='\r'){
    if(ch==='\r'&&next==='\n')i++;
    row.push(field);field='';
    if(row.some(v=>v.trim()))data.push(row);
    row=[];
    if(data.length>MAX_ROWS+1)throw Error('Limit 5,000 data rows per analysis');
   }else field+=ch;
  }
  if(quoted)throw Error('CSV contains an unclosed quoted field');
  if(field||row.length){row.push(field);if(row.some(v=>v.trim()))data.push(row);}
  if(data.length<2)throw Error('CSV needs column headers and at least one data row');
  const rawHeaders=data.shift().map(h=>h.trim());
  if(!rawHeaders.length||rawHeaders.length>MAX_COLUMNS||rawHeaders.some(h=>!h))throw Error('Use 1–40 named columns');
  const used=new Set();
  const headers=rawHeaders.map((h,i)=>{let name=h.slice(0,70);if(used.has(name))name=name+'_'+(i+1);used.add(name);return name;});
  const rows=[];
  data.forEach((r,i)=>{
   if(r.length!==headers.length)throw Error('Row '+(i+2)+' has '+r.length+' cells; expected '+headers.length);
   rows.push(Object.fromEntries(headers.map((h,j)=>[h,r[j].trim().slice(0,500)])));
  });
  return {name:'Uploaded CSV',headers,rows,demo:false};
 }
 function cleanNumber(v){if(v==null||String(v).trim()==='')return null;const x=Number(String(v).replace(/[$,%]/g,'').replace(/,/g,''));return Number.isFinite(x)?x:null;}
 function profile(data){
  if(!data?.headers||!data?.rows)throw Error('Missing dataset');
  return data.headers.map(key=>{
   const vals=data.rows.map(r=>String(r[key]??'').trim());
   const present=vals.filter(Boolean),nums=present.map(cleanNumber).filter(v=>v!==null);
   const unique=[...new Set(present)];
   const isoDates=present.filter(v=>/^\d{4}[-/]\d\d[-/]\d\d/.test(v)||/^\d{4}-W\d{1,2}$/.test(v)).length;
   const type=present.length&&nums.length/present.length>=.85?'numeric':present.length&&isoDates/present.length>=.8?'date':unique.length<=30?'category':'text';
   const pct=(present.length/Math.max(data.rows.length,1))*100;
   const avg=nums.length?nums.reduce((a,b)=>a+b,0)/nums.length:null;
   const top=[...new Map(unique.map(v=>[v,present.filter(x=>x===v).length])).entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
   return {key,type,filled:present.length,completeness:Math.round(pct),unique:unique.length,numericCount:nums.length,avg,top,examples:unique.slice(0,3)};
  });
 }
 function suggest(data,fields=profile(data)){
  const match=(rx,type)=>fields.find(f=>rx.test(f.key)&&(!type||f.type===type))?.key;
  const numeric=fields.filter(f=>f.type==='numeric');
  const category=fields.filter(f=>f.type==='category');
  const id=match(/sku|product|item/i);
  const stock=match(/on.hand|stock|inventory|available|quantity/i,'numeric');
  const demand=match(/demand|units.sold|sales.units|forecast.units|consumption/i,'numeric');
  const outcome=match(/spend|revenue|delay|duration|processing|yield|cases|sightings|count|volume|cost|price|score/i,'numeric')||numeric[0]?.key||null;
  const group=match(/segment|carrier|region|location|district|species|crop|service|category|channel|route/i)||category[0]?.key||null;
  let goal=stock&&demand?'stockout':'groups';
  if(fields.some(f=>/lat(itude)?/i.test(f.key))&&fields.some(f=>/lon(gitude)?|lng/i.test(f.key)))goal='movement';
  if(data.goal)goal=data.goal;
  return {goal,group,outcome,stock,demand,item:id||group||data.headers[0], actionA:match(/our.action|player.a|action.a/i),actionB:match(/other.action|player.b|action.b/i),rewardA:match(/our.score|payoff.a|reward.a/i,'numeric'),rewardB:match(/other.score|payoff.b|reward.b/i,'numeric')};
 }
 function avg(arr){return arr.reduce((a,b)=>a+b,0)/arr.length}
 function median(arr){const a=[...arr].sort((x,y)=>x-y),mid=Math.floor(a.length/2);return a.length%2?a[mid]:(a[mid-1]+a[mid])/2}
 function wilson(success,n){
  if(!n)return [null,null];
  const z=1.96,p=success/n,den=1+z*z/n;
  const center=(p+z*z/(2*n))/den;
  const margin=z*Math.sqrt((p*(1-p)+z*z/(4*n))/n)/den;
  return [Math.max(0,Math.min(p,center-margin)),Math.min(1,Math.max(p,center+margin))];
 }
 function analyze(data,opts={}){
  const fields=profile(data),mapping={...suggest(data,fields),...opts};
  if(!data.rows.length)throw Error('No records to analyze');
  if(mapping.goal==='stockout'){
   const {stock,demand,item}=mapping;
   if(!stock||!demand)throw Error('Select stock and demand columns first.');
   const factor=1+Math.max(-75,Math.min(200,Number(opts.uplift)||0))/100;
   const out=data.rows.flatMap((r,i)=>{
    const s=cleanNumber(r[stock]),d=cleanNumber(r[demand]);
    if(s==null||d==null||s<0||d<0)return [];
    return [{item:r[item]||'Row '+(i+2),stock:s,demand:d,adjustedDemand:d*factor,gap:s-d*factor,atRisk:s<=d*factor}];
   });
   if(out.length<3)throw Error('Need at least 3 valid stock/demand rows');
   const flagged=out.filter(x=>x.atRisk).sort((a,b)=>a.gap-b.gap);
   return {kind:'stockout',mapping,total:out.length,excluded:data.rows.length-out.length,count:flagged.length,share:flagged.length/out.length,flagged:flagged.slice(0,12),uplift:factor-1,interval:wilson(flagged.length,out.length),quality:quality(data,fields),method:'Inventory balance under an adjustable demand scenario; not a probabilistic stockout forecast'};
  }
  const key=mapping.group,metric=mapping.outcome;
  if(!key||!metric||key===metric)throw Error('Choose different grouping and outcome columns');
  if(!data.headers.includes(key)||!data.headers.includes(metric))throw Error('Choose columns present in the dataset');
  const field=fields.find(f=>f.key===metric);
  if(field?.type==='category'&&field.unique<=15){
    const target=opts.positive||field.top[0]?.[0];
    if(!target)throw Error('Choose the observed outcome to count.');
    const counters=new Map();let excluded=0;
    data.rows.forEach(r=>{
      const g=String(r[key]||'').trim(),v=String(r[metric]||'').trim();
      if(!g||!v){excluded++;return}
      if(!counters.has(g))counters.set(g,{count:0,matched:0});
      const obj=counters.get(g);obj.count++;if(v===target)obj.matched++;
    });
    const rows=[...counters.entries()].map(([name,v])=>({name,count:v.count,matched:v.matched,share:v.matched/v.count,interval:wilson(v.matched,v.count)})).sort((a,b)=>b.count-a.count).slice(0,15);
    if(!rows.length)throw Error('No matching category values were found.');
    const count=rows.reduce((a,b)=>a+b.count,0),matched=rows.reduce((a,b)=>a+b.matched,0);
    return {kind:'rates',mapping,positive:target,rows,total:count,matched,share:matched/count,excluded,hasSparse:rows.some(r=>r.count<10),quality:quality(data,fields),method:'Observed frequency by group with Wilson 95% intervals under an independence assumption. Correlation, not future probability or causation.'};
  }
  const groups=new Map();let excluded=0;
  data.rows.forEach(r=>{
   const group=String(r[key]||'').trim(),value=cleanNumber(r[metric]);
   if(!group||value==null){excluded++;return;}
   if(!groups.has(group))groups.set(group,[]);
   groups.get(group).push(value);
  });
  const ranked=[...groups.entries()].map(([name,values])=>({name,count:values.length,mean:avg(values),median:median(values),min:Math.min(...values),max:Math.max(...values)})).sort((a,b)=>b.count-a.count).slice(0,15);
  if(!ranked.length)throw Error('No comparable numeric values in your chosen outcome column');
  const all=ranked.flatMap(row=>groups.get(row.name));
  const hasSparse=ranked.some(r=>r.count<5);
  return {kind:'groups',mapping,total:all.length,excluded,rows:ranked,overall:avg(all),hasSparse,quality:quality(data,fields),method:'Historical descriptive comparison by group; no causal effects or future forecasts'};
 }
 function quality(data,fields){
  const avgFill=fields.reduce((a,b)=>a+b.completeness,0)/Math.max(fields.length,1);
  const issues=[];
  if(data.rows.length<30)issues.push('Small dataset: treat patterns as exploratory');
  if(avgFill<90)issues.push('Missing values may bias comparisons');
  if(fields.some(f=>f.type==='text'&&f.unique>data.rows.length*.9))issues.push('Identifier-like text columns should not be used as cohorts');
  return {rows:data.rows.length,columns:fields.length,completeness:Math.round(avgFill),issues};
 }

 function trackMovement(data,options={}){
  const fields=data.headers;
  const idKey=options.animalColumn||fields.find(x=>/animal|track|tag|device|subject/i.test(x));
  const timeKey=options.timeColumn||fields.find(x=>/time|date|observed_at/i.test(x));
  const latKey=options.latColumn||fields.find(x=>/^lat|latitude/i.test(x));
  const lonKey=options.lonColumn||fields.find(x=>/^lon|longitude|lng/i.test(x));
  if(![idKey,timeKey,latKey,lonKey].every(x=>fields.includes(x)))throw Error('Select animal ID, timestamp, latitude and longitude columns.');
  const animal=String(options.animalId||data.rows[0]?.[idKey]||'');
  const readings=data.rows.filter(x=>x[idKey]===animal).map(row=>({
    time:Date.parse(row[timeKey]),lat:cleanNumber(row[latKey]),lon:cleanNumber(row[lonKey])
  })).filter(p=>Number.isFinite(p.time)&&p.lat!==null&&p.lon!==null&&Math.abs(p.lat)<=90&&Math.abs(p.lon)<=180)
  .sort((a,b)=>a.time-b.time);
  if(readings.length<4)throw Error('Provide at least four location readings for one animal.');
  const latest=readings.slice(-12);
  for(let i=1;i<latest.length;i++)if(latest[i].time<=latest[i-1].time)throw Error('Tracking timestamps must be unique and increasing.');
  const diffs=latest.slice(1).map((p,i)=>(p.time-latest[i].time)/3600000);
  const last=latest[latest.length-1];
  const stepHours=diffs.slice(-3).sort((a,b)=>a-b)[1]||diffs[diffs.length-1];
  const steps=Math.max(1,Math.min(3,Math.round(Number(options.steps)||1)));
  const deltaA=latest.at(-1),deltaB=latest.at(-2),deltaC=latest.at(-3);
  const vx1=(deltaA.lon-deltaB.lon)/diffs.at(-1),vy1=(deltaA.lat-deltaB.lat)/diffs.at(-1);
  const vx2=(deltaB.lon-deltaC.lon)/diffs.at(-2),vy2=(deltaB.lat-deltaC.lat)/diffs.at(-2);
  const vx=.65*vx1+.35*vx2,vy=.65*vy1+.35*vy2;
  const projected={
    lat:last.lat+vy*stepHours*steps,
    lon:last.lon+vx*stepHours*steps,
    time:new Date(last.time+stepHours*steps*3600000).toISOString()
  };
  const haversine=(a,b)=>{
    const r=6371,toRad=x=>x*Math.PI/180,dlat=toRad(b.lat-a.lat),dlon=toRad(b.lon-a.lon);
    const t=Math.sin(dlat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dlon/2)**2;
    return 2*r*Math.asin(Math.min(1,Math.sqrt(t)));
  };
  const prior={lat:deltaB.lat+(deltaB.lat-deltaC.lat)*(diffs.at(-1)/diffs.at(-2)),
    lon:deltaB.lon+(deltaB.lon-deltaC.lon)*(diffs.at(-1)/diffs.at(-2))};
  const validationErrorKm=haversine(prior,deltaA);
  const speedKmh=haversine({lat:last.lat,lon:last.lon},{lat:last.lat+vy,lon:last.lon+vx});
  const uncertainKm=Math.max(.2,validationErrorKm*(1+steps)+.12*speedKmh*stepHours*steps);
  const issues=[];
  if(speedKmh>30)issues.push('Unusually high apparent movement speed; check timestamps and GPS records');
  if(stepHours>48)issues.push('Long gaps between locations can make projections less informative');
  if(validationErrorKm>2)issues.push('Past movement extrapolation did not closely match the last observed position');
  return {kind:'movement',animal,points:latest,projected,steps,intervalHours:stepHours,
    validationErrorKm,speedKmh,uncertaintyKm:uncertainKm,issues,
    method:'Short-term linear continuation of recent observed velocity; illustrative planning radius, not a calibrated wildlife location prediction'};
 }
 function deriveNash(data,mapping){
  const {actionA,actionB,rewardA,rewardB}=mapping;
  if(![actionA,actionB,rewardA,rewardB].every(k=>data.headers.includes(k)))throw Error('Map two action columns and two numeric payoff columns');
  const actionsA=[...new Set(data.rows.map(r=>String(r[actionA]||'').trim()).filter(Boolean))];
  const actionsB=[...new Set(data.rows.map(r=>String(r[actionB]||'').trim()).filter(Boolean))];
  if(actionsA.length!==2||actionsB.length!==2)throw Error('Each player must have exactly two observed actions');
  const A=[[0,0],[0,0]],B=[[0,0],[0,0]],counts=[[0,0],[0,0]];
  const groups=Array.from({length:2},()=>Array.from({length:2},()=>({a:[],b:[]})));
  data.rows.forEach(r=>{
   const i=actionsA.indexOf(String(r[actionA]||'').trim()),j=actionsB.indexOf(String(r[actionB]||'').trim());
   if(i<0||j<0)return;
   const v1=cleanNumber(r[rewardA]),v2=cleanNumber(r[rewardB]);if(v1===null||v2===null)return;
   groups[i][j].a.push(v1);groups[i][j].b.push(v2);
  });
  for(let i=0;i<2;i++)for(let j=0;j<2;j++){
   const g=groups[i][j];counts[i][j]=g.a.length;
   if(g.a.length<3)throw Error('At least 3 observed rows are required for each of the four strategy combinations');
   A[i][j]=avg(g.a);B[i][j]=avg(g.b);
  }
  return {A,B,actionsA,actionsB,counts,method:'Mean observed payoffs by pair of actions. Not counterfactual causal estimates; selection bias and confounding may affect equilibria.'};
 }
 const api=Object.freeze({parseCSV,profile,suggest,analyze,deriveNash,makeDemo,quality,cleanNumber,sampleConfigs,wilson,trackMovement});
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.ListPullData=api;
})(typeof window!=='undefined'?window:null);
