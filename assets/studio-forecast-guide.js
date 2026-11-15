/* Forecast Lab CSV wizard + honest holdout validation. Browser-only. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const dataAPI=window.ListPullData,math=window.ListPullMath;
 if(!dataAPI||!math)return;
 let uploaded=null,source='Synthetic example';
 const el=(tag,text)=>{const node=document.createElement(tag);node.textContent=text;return node;};
 const format=x=>Number(x).toLocaleString(undefined,{maximumFractionDigits:2});
 const status=message=>{$('forecast-import-message').textContent=message;};
 function readValues(){
  const values=$('forecast-series').value.trim().split(/[\s,;]+/).filter(Boolean).map(Number);
  return values.length>=8&&values.length<=120&&values.every(Number.isFinite)?values:null;
 }
 function refreshExplain(){
  const values=readValues();if(!values)return;
  const count=Number($('forecast-horizon').value)||8;
  const projection=math.fitArima110(values,count);
  const first=projection.forecast[0].point,last=values[values.length-1];
  const delta=first-last;
  const summary=$('forecast-business-summary');summary.replaceChildren();
  const title=el('h3','In everyday language');
  const description=el('p','From '+values.length+' observed values ('+source+'), the next-step model estimate is '+format(first)+', '+(delta>=0?'up ':'down ')+format(Math.abs(delta))+' compared with the latest reading ('+format(last)+'). This is a model scenario, not a guaranteed future measurement.');
  summary.append(title,description);
  const back=$('forecast-backtest');back.replaceChildren();
  const intro=el('h3','How did this method do on recent known data?');back.append(intro);
  const holdout=Math.min(10,Math.max(3,Math.floor(values.length*.2)));
  const train=values.slice(0,-holdout),actual=values.slice(-holdout);
  if(train.length<8){back.append(el('p','Need more history for a basic holdout evaluation. Add at least 12 data points.'));return}
  const forecast=math.fitArima110(train,holdout).forecast.map(p=>p.point);
  const mae=forecast.reduce((a,v,i)=>a+Math.abs(v-actual[i]),0)/holdout;
  const baseline=train[train.length-1];
  const naiveMae=actual.reduce((a,v)=>a+Math.abs(v-baseline),0)/holdout;
  const line=el('p','On the last '+holdout+' held-out observations: model mean absolute error '+format(mae)+' vs. simple “repeat the last value” baseline '+format(naiveMae)+'.');
  const note=el('p',mae<naiveMae?'The model beat this simple baseline on this one holdout. That does not establish future accuracy.':'The model did not outperform the simple baseline on this holdout. More data, different models or diagnostics may be needed.');
  note.className='forecast-quality-note';
  const caution=el('p','Holdout measurements use past data only. Confidence bands remain illustrative and are not calibrated, especially on sparse or volatile series.');
  back.append(line,note,caution);
 }
 function addOptions(target,keys,selected,includeBlank=false){
  const select=$(target);select.replaceChildren();
  if(includeBlank){const opt=el('option','No date column (original row order)');opt.value='';select.append(opt);}
  for(const key of keys){const opt=el('option',key);opt.value=key;select.append(opt);}
  if(selected&&keys.includes(selected))select.value=selected;
 }
 function useColumn(){
  if(!uploaded)return;
  const key=$('forecast-column').value,dateKey=$('forecast-date-column').value;
  let chosen=uploaded.rows.map((row,i)=>({value:dataAPI.cleanNumber(row[key]),when:dateKey?String(row[dateKey]||''):null,index:i})).filter(row=>row.value!==null);
  if(dateKey){
   const parses=chosen.map(row=>Date.parse(row.when));
   if(parses.every(Number.isFinite))chosen.sort((a,b)=>Date.parse(a.when)-Date.parse(b.when)||a.index-b.index);
   else chosen.sort((a,b)=>a.when.localeCompare(b.when)||a.index-b.index);
  }
  const removed=uploaded.rows.length-chosen.length;
  if(chosen.length<8){status('At least 8 valid numeric observations are required for “'+key+'”.');return}
  if(chosen.length>120)chosen=chosen.slice(-120);
  $('forecast-series').value=chosen.map(item=>item.value).join(', ');
  source='CSV: '+uploaded.name+' / '+key;
  status('Imported '+chosen.length+' observations from “'+key+'”; '+removed+' empty/non-numeric values skipped. '+(dateKey?'Ordered by '+dateKey+'.':'Using original row order.'));
  $('forecast-run').click();
 }
 $('forecast-upload').addEventListener('change',async event=>{
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;
  if(file.size>3*1024*1024){status('File too large. Use a CSV under 3 MB.');return}
  try{
   const parsed=dataAPI.parseCSV(await file.text());
   const profile=dataAPI.profile(parsed),nums=profile.filter(c=>c.type==='numeric').map(c=>c.key);
   if(!nums.length)throw Error('The file has no numeric field to forecast.');
   const dates=profile.filter(c=>c.type==='date'||/date|time|period|week|month/i.test(c.key)).map(c=>c.key);
   uploaded={...parsed,name:file.name.replace(/[<>]/g,'').slice(0,80)};
   $('forecast-import-fields').hidden=false;
   addOptions('forecast-column',nums,nums.find(k=>/sales|visits|demand|orders|cases|stock|quantity|value|revenue|count/i.test(k))||nums[0]);
   addOptions('forecast-date-column',dates,dates[0]||'',true);
   // Avoid silently sorting by an unverified time column.
   $('forecast-date-column').value='';
   useColumn();
  }catch(error){status('Could not import: '+error.message)}
 });
 $('forecast-column').addEventListener('change',useColumn);
 $('forecast-date-column').addEventListener('change',useColumn);
 $('forecast-run').addEventListener('click',refreshExplain);
 $('forecast-reset').addEventListener('click',()=>{source='Synthetic example';uploaded=null;$('forecast-import-fields').hidden=true;status('Loaded built-in synthetic example. No file uploaded.');refreshExplain()});
 $('forecast-example').addEventListener('change',()=>{source='Synthetic example';uploaded=null;$('forecast-import-fields').hidden=true;refreshExplain()});
 $('forecast-horizon').addEventListener('change',refreshExplain);
 refreshExplain();
})();
