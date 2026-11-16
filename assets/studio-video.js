/* ListPull Video Studio — local browser media timeline and composition.
 * Native playback + canvas + MediaRecorder + Web Audio, without a hosted editing service. */
(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const canvas=$('video-canvas');if(!canvas)return;
 const ctx=canvas.getContext('2d'),player=$('video-source'),sound=$('video-sound');
 const number=(id,fallback=0)=>{const n=Number($(id)?.value);return Number.isFinite(n)?n:fallback;};
 const limit=(v,a,b)=>Math.max(a,Math.min(b,v)),round=n=>Math.round((Number(n)||0)*100)/100;
 const uid=()=>Date.now()+'-'+Math.random().toString(36).slice(2,9);
 const code=t=>{t=Math.max(0,Number(t)||0);return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0')+'.'+String(Math.floor(t%1*100)).padStart(2,'0');};
 const status=s=>{$('video-status').textContent=String(s).slice(0,400);};
 const files=[],clips=[],titles=[],audioClips=[],overlays=[],images=new Map(),audioPlayers=new Map(),overlayPlayers=new Map(),pendingRelinks=new Map();
 let chosenMedia=null,selectedId=null,at=0,playing=false,raf=0,lastTime=0,sourceId=null;
 let width=1920,height=1080,fps=30,bitrate=8000000,sizeMode='auto',showGuides=false,dragging=null;
 let recorder=null,recording=false,cancelExport=false,voiceRecorder=null,voiceStream=null,voiceParts=[];
 let audioContext=null,mix=null,playerSource=null,videoGain=null,mediaSources=new Map();
 let undo=[],undoIndex=-1,restoring=false;
 const effects={none:'none',vibrant:'contrast(115%) saturate(138%)',cinematic:'contrast(125%) brightness(94%) saturate(91%)',mono:'grayscale(100%) contrast(110%)',warm:'sepia(25%) saturate(115%)',cool:'hue-rotate(18deg) saturate(115%)',blur:'blur(3px)'};
 const duration=c=>Math.max(.01,(c.out-c.in)/Math.max(.05,c.speed||1));
 const total=()=>clips.reduce((s,c)=>s+duration(c),0);
 const asset=id=>files.find(x=>x.id===id);
 const item=id=>clips.find(c=>c.id===id)||overlays.find(c=>c.id===id)||titles.find(c=>c.id===id)||audioClips.find(c=>c.id===id);
 const blocks=()=>{let start=0;return clips.map(clip=>{const end=start+duration(clip),v={clip,start,end};start=end;return v;});};
 const getBlock=t=>blocks().find((b,i)=>t>=b.start&&(t<b.end||(i===clips.length-1&&t<=b.end)));
 function save(){
  if(restoring)return;
  const value=JSON.stringify({clips,overlays,titles,audioClips,width,height,fps,bitrate,sizeMode});
  if(undo[undoIndex]===value)return;
  undo=undo.slice(0,undoIndex+1);undo.push(value);if(undo.length>40)undo.shift();undoIndex=undo.length-1;
 }
 function history(step){
  const next=undoIndex+step;if(next<0||next>=undo.length)return;
  restoring=true;try{
   undoIndex=next;const data=JSON.parse(undo[next]);
   clips.splice(0,clips.length,...data.clips);titles.splice(0,titles.length,...data.titles);
   audioClips.splice(0,audioClips.length,...data.audioClips);overlays.splice(0,overlays.length,...(data.overlays||[]));
   ({width,height,fps,bitrate}=data);sizeMode=data.sizeMode||'manual';resize();at=Math.min(at,total());renderAll();seek(at);status('Timeline history restored.');
  }finally{restoring=false}
 }
 function changed(message){save();renderAll();if(message)status(message);}
 function resize(){
  canvas.width=width;canvas.height=height;
  $('video-width').value=width;$('video-height').value=height;$('video-fps').value=fps;
  $('video-bitrate').value=round(bitrate/1e6);
  $('video-frame-size').textContent=width+' × '+height;
  $('video-quick-width').value=width;$('video-quick-height').value=height;
  canvas.style.aspectRatio=width+' / '+height;
  draw();
 }
 function setCanvasSize(w,h,reason='Canvas size updated.',manual=true){
  if(!Number.isSafeInteger(w)||!Number.isSafeInteger(h)||w<1||h<1){
   status('Enter positive whole-number canvas dimensions.');return false;
  }
  // Physical canvas allocation is subject to available browser memory. Never silently substitute another resolution.
  try{width=w;height=h;if(manual)sizeMode='manual';resize();changed(reason);return true;}
  catch(error){status('This device could not allocate the requested canvas: '+String(error.message||error));return false;}
 }
 function matchSource(){
  const a=asset(item(selectedId)?.assetId)||asset(chosenMedia)||asset(clips[0]?.assetId);
  if(!a||!a.width||!a.height){status('Select footage or an image in the media library first.');return;}
  setCanvasSize(a.width,a.height,'Canvas matched to '+a.name+' ('+a.width+' × '+a.height+').',true);
 }
 const defaults=()=>({x:50,y:50,scale:100,rotation:0,opacity:100,fit:'contain',
  cropLeft:0,cropRight:0,cropTop:0,cropBottom:0,brightness:0,contrast:0,saturation:0,keyframes:[]});
 function activeOffset(c,time=at){
  if(c.type==='title'||c.type==='overlay')return limit(time-c.start,0,Math.max(0,(c.end||0)-c.start));
  const b=blocks().find(x=>x.clip.id===c.id);return b?limit(time-b.start,0,duration(c)):0;
 }
 function visualAt(clip,offset=0){
  const keys=(clip.keyframes||[]).slice().sort((a,b)=>a.at-b.at);
  const result={x:clip.x??50,y:clip.y??50,scale:clip.scale??100,
   rotation:clip.rotation||0,opacity:clip.opacity??100};
  if(!keys.length)return result;
  const before=keys.filter(k=>k.at<=offset).at(-1)||keys[0];
  const after=keys.find(k=>k.at>=offset)||keys.at(-1);
  const delta=after.at-before.at;
  const frac=delta>0?limit((offset-before.at)/delta,0,1):0;
  for(const key of ['x','y','scale','rotation','opacity']){
   const a=Number(before[key]??result[key]),b=Number(after[key]??result[key]);
   result[key]=a+(b-a)*frac;
  }
  return result;
 }
 function renderKeyframes(c){
  const out=$('video-keyframe-list');out.replaceChildren();
  if(!c)return;
  const keys=(c.keyframes||[]).slice().sort((a,b)=>a.at-b.at);
  if(!keys.length){out.textContent='No keyframes yet · Position the playhead and click Add keyframe.';return;}
  for(const k of keys){
   const row=document.createElement('div');row.className='video-keyframe-row';
   const seekButton=document.createElement('button');seekButton.type='button';seekButton.textContent='◆ '+code(k.at);
   seekButton.addEventListener('click',()=>{
    const b=blocks().find(x=>x.clip.id===c.id);
    pause();seek((c.type==='title'||c.type==='overlay'?c.start:(b?.start||0))+k.at);
    fillInspector(c);
   });
   const remove=document.createElement('button');remove.type='button';remove.textContent='×';
   remove.setAttribute('aria-label','Remove keyframe at '+code(k.at));
   remove.addEventListener('click',()=>{c.keyframes=c.keyframes.filter(x=>x!==k);changed('Keyframe removed.');renderKeyframes(c);});
   row.append(seekButton,remove);out.append(row);
  }
 }
 function addKeyframe(){
  const c=item(selectedId);
  if(!c||c.type==='audio'){status('Select a video, image, overlay or title for animation.');return;}
  const atTime=round(activeOffset(c));
  const data={at:atTime};
  for(const [prop,id] of [['x','video-x'],['y','video-y'],['scale','video-scale'],
   ['rotation','video-rotation'],['opacity','video-opacity']])data[prop]=number(id,prop==='opacity'?100:0);
  c.keyframes=(c.keyframes||[]).filter(k=>Math.abs(k.at-atTime)>.025);
  c.keyframes.push(data);
  changed('Keyframe created at '+code(atTime)+'. Scrub to view animated motion.');
  renderKeyframes(c);seek(at);
 }
 function stamp(name,ext){const a=document.createElement('a');const url=URL.createObjectURL(ext.blob);
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 function download(blob,name){stamp(name,{blob});}
 async function measure(file){
  const url=URL.createObjectURL(file);
  const kind=/^video\//.test(file.type)?'video':/^audio\//.test(file.type)?'audio':'image';
  if(kind==='image'){
   const img=new Image();img.src=url;try{await img.decode();}catch(e){URL.revokeObjectURL(url);throw Error('Cannot open '+file.name);}
   images.set(url,img);return {id:uid(),name:file.name,kind,url,duration:5,width:img.naturalWidth,height:img.naturalHeight};
  }
  const el=document.createElement(kind);el.preload='metadata';el.src=url;
  await new Promise((resolve,reject)=>{
   const ok=()=>{cleanup();resolve()},fail=()=>{cleanup();reject(Error('Cannot decode '+file.name));};
   const cleanup=()=>{el.removeEventListener('loadedmetadata',ok);el.removeEventListener('error',fail);};
   el.addEventListener('loadedmetadata',ok);el.addEventListener('error',fail);el.load();
  }).catch(e=>{URL.revokeObjectURL(url);throw e});
  return {id:uid(),name:file.name,kind,url,duration:Number.isFinite(el.duration)?el.duration:5,
    width:el.videoWidth||0,height:el.videoHeight||0};
 }
 async function ingest(fileList){
  for(const file of [...fileList]){
   if(/\.srt$/i.test(file.name)){addSrt(await file.text());continue;}
   if(!/^(video|image|audio)\//.test(file.type))continue;
   const info=await measure(file);files.push(info);chosenMedia=info.id;
   for(const [oldId,name] of pendingRelinks){
    if(name.toLowerCase()!==info.name.toLowerCase())continue;
    for(const collection of [clips,overlays,audioClips]){
     for(const record of collection)if(record.assetId===oldId)record.assetId=info.id;
    }
    pendingRelinks.delete(oldId);
   }
  }
  renderAll();status('Media imported. Double-click an asset or select Add to timeline to edit.');
 }
 function addSrt(data){
  const chunks=data.replace(/\r/g,'').split(/\n\s*\n/);
  let n=0;
  for(const text of chunks){
   const line=text.split('\n').filter(Boolean),timeLine=line.findIndex(x=>x.includes('-->'));
   if(timeLine<0)continue;
   const parse=t=>{const m=t.trim().match(/(?:(\d+):)?(\d+):(\d+)[,.](\d+)/);
    if(!m)return null;return Number(m[1]||0)*3600+Number(m[2])*60+Number(m[3])+Number((m[4]+'00').slice(0,3))/1000;};
   const [s,e]=line[timeLine].split('-->').map(parse);
   if(!Number.isFinite(s)||!Number.isFinite(e)||e<=s)continue;
   titles.push({id:uid(),type:'title',text:line.slice(timeLine+1).join(' ').slice(0,300),start:s,end:e,
     size:58,color:'#ffffff',x:50,y:85,scale:100,rotation:0,animation:'none'});n++;
  }
  changed('Imported '+n+' caption segments from SRT.');
 }
 function addFileToTimeline(info){
  if(!info)return;
  if(info.kind==='audio'){
   const record={id:uid(),type:'audio',assetId:info.id,start:at,in:0,out:info.duration,speed:1,volume:100};
   audioClips.push(record);selectedId=record.id;
  }else{
   const first=clips.length===0;
   const record={id:uid(),type:info.kind,assetId:info.id,in:0,out:info.duration,speed:1,volume:100,
    ...defaults(),filter:'none',transition:'cut',fade:.5};
   clips.push(record);selectedId=record.id;
   if(first){
    at=0;
    if(sizeMode==='auto'&&info.width>0&&info.height>0){
     width=info.width;height=info.height;resize();
    }
   }
  }
  changed(info.name+' added. Preview is ready to edit; the full frame is preserved.');
  if(item(selectedId))fillInspector(item(selectedId));
  seek(at);
 }
 function renderLibrary(){
  const list=$('video-library');list.replaceChildren();
  for(const f of files){
   const li=document.createElement('li');li.tabIndex=0;
   li.className=chosenMedia===f.id?'is-selected':'';li.dataset.asset=f.id;
   const ico=document.createElement('span');ico.className='video-asset-icon';ico.textContent=f.kind==='video'?'🎞️':f.kind==='audio'?'♫':'▧';
   const text=document.createElement('div'),title=document.createElement('strong'),small=document.createElement('small');
   title.textContent=f.name;small.textContent=f.kind+' · '+code(f.duration);
   text.append(title,small);li.append(ico,text);
   li.addEventListener('click',()=>{chosenMedia=f.id;renderLibrary();});
   li.addEventListener('dblclick',()=>addFileToTimeline(f));
   li.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();chosenMedia=f.id;renderLibrary();}});
   list.append(li);
  }
 }
 function renderTrack(element,collection,kind){
  element.replaceChildren();
  for(const c of collection){
   const btn=document.createElement('button');btn.type='button';btn.draggable=true;
   btn.className=c.id===selectedId?'is-selected':'';btn.dataset.type=kind;
   const a=asset(c.assetId);
   btn.textContent=kind==='title'?(c.text||'Title').slice(0,27):(a?.name||'Missing media').slice(0,26);
   const small=document.createElement('span');small.textContent=kind==='title'||kind==='overlay'?
     code(c.start)+' - '+code(c.end):code(duration(c));
   btn.append(small);btn.style.minWidth=limit((kind==='title'||kind==='overlay'?c.end-c.start:duration(c))*16,85,500)+'px';
   btn.addEventListener('click',()=>{selectedId=c.id;renderAll();fillInspector(c);if(kind==='title'||kind==='overlay'){pause();seek(Math.min(c.start,total()));}else seek(at);});
   btn.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',c.id);});
   btn.addEventListener('dragover',e=>e.preventDefault());
   btn.addEventListener('drop',e=>{
    e.preventDefault();const dragged=e.dataTransfer.getData('text/plain');
    const ix=collection.findIndex(x=>x.id===dragged),to=collection.indexOf(c);
    if(ix>=0&&ix!==to){collection.splice(to,0,collection.splice(ix,1)[0]);changed('Timeline clips reordered.');}
   });
   element.append(btn);
  }
 }
 function renderAll(){
  renderLibrary();renderTrack($('video-clip-track'),clips,'clip');renderTrack($('video-overlay-track'),overlays,'overlay');
  renderTrack($('video-title-track'),titles,'title');renderTrack($('video-audio-track'),audioClips,'audio');
  const len=total();$('video-project-duration').textContent='Duration '+code(len);
  $('video-timecode').textContent=code(at)+' / '+code(len);
  $('video-current').textContent=code(at);
  $('video-scrub').max=Math.max(.01,len);$('video-scrub').value=Math.min(at,len);
  const has=clips.length>0;$('video-empty').hidden=has;
  draw();
 }
 function fillInspector(c){
  $('video-selected-title').textContent=c.type==='title'?'Title / caption':(asset(c.assetId)?.name||'Select a clip');
  switchTab('clip');
  const isTitle=c.type==='title';
  $('video-title-fields').hidden=!isTitle;
  const position=visualAt(c,activeOffset(c));
  const values={
   'video-in':c.in||0,'video-out':c.out||0,'video-speed':c.speed||1,'video-volume':c.volume??100,
   'video-x':position.x,'video-y':position.y,'video-scale':position.scale,'video-rotation':position.rotation,
   'video-filter':c.filter||'none','video-transition':c.transition||'cut','video-fade':c.fade??.5,
   'video-fit':c.fit||'contain','video-opacity':position.opacity,
   'video-crop-left':c.cropLeft||0,'video-crop-right':c.cropRight||0,
   'video-crop-top':c.cropTop||0,'video-crop-bottom':c.cropBottom||0,
   'video-brightness':c.brightness||0,'video-contrast':c.contrast||0,'video-saturation':c.saturation||0,
   'video-caption-text':c.text||'','video-title-size':c.size||66,
   'video-title-color':c.color||'#ffffff','video-title-start':c.start||0,
   'video-title-end':c.end||0,'video-title-animation':c.animation||'none'
  };
  for(const [id,v] of Object.entries(values))$(id).value=v;
  for(const name of ['opacity','brightness','contrast','saturation'])
   $('video-'+name+'-label').textContent=$('video-'+name).value+(name==='opacity'?'%':'');
  renderKeyframes(c);
 }
 function applyInspector(){
  const c=item(selectedId);if(!c){status('Select a clip or title first.');return;}
  const fields=c.type==='title'?{
   text:$('video-caption-text').value.slice(0,280),size:Math.max(1,number('video-title-size')),
   color:$('video-title-color').value,start:Math.max(0,number('video-title-start')),
   end:Math.max(0,number('video-title-end')),animation:$('video-title-animation').value,
   x:number('video-x'),y:number('video-y'),scale:Math.max(1,number('video-scale')),rotation:number('video-rotation'),opacity:number('video-opacity',100)
  }:{
   in:Math.max(0,number('video-in')),out:Math.max(0,number('video-out')),speed:limit(number('video-speed',1),.05,16),
   volume:limit(number('video-volume',100),0,200),x:number('video-x'),y:number('video-y'),
   scale:Math.max(1,number('video-scale')),rotation:number('video-rotation'),
   opacity:limit(number('video-opacity',100),0,100),fit:$('video-fit').value,
   cropLeft:limit(number('video-crop-left'),0,99),cropRight:limit(number('video-crop-right'),0,99),
   cropTop:limit(number('video-crop-top'),0,99),cropBottom:limit(number('video-crop-bottom'),0,99),
   brightness:limit(number('video-brightness'),-100,100),
   contrast:limit(number('video-contrast'),-100,100),
   saturation:limit(number('video-saturation'),-100,100),filter:$('video-filter').value,
   transition:$('video-transition').value,fade:Math.max(0,number('video-fade'))
  };
  if(c.type==='title'&&fields.end<=fields.start){status('Title end must be later than its start.');return;}
  if(c.type!=='title'&&c.type!=='audio'){
   if(fields.cropLeft+fields.cropRight>=100||fields.cropTop+fields.cropBottom>=100){status('Crop sides must leave some visible pixels.');return;}
   const a=asset(c.assetId);if(fields.out<=fields.in||fields.out>(a?.duration||Infinity)+.1){
    status('Clip out-point must be after its in-point and within the source media.');return;
   }
  }
  Object.assign(c,fields);
  const key=(c.keyframes||[]).find(k=>Math.abs(k.at-activeOffset(c))<.025);
  if(key)for(const field of ['x','y','scale','rotation','opacity'])key[field]=fields[field]??key[field];
  at=Math.min(at,total());changed('Edits applied to the preview and exported video.');seek(at);
 }
 function switchTab(name){
  document.querySelectorAll('[data-video-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.videoTab===name)));
  document.querySelectorAll('[data-video-panel]').forEach(p=>p.hidden=p.dataset.videoPanel!==name);
 }
 function filterName(name){return effects[name]||'none';}
 function mediaBounds(element,clip,time=at,blockStart=0){
  const mw=element?.videoWidth||element?.naturalWidth||asset(clip.assetId)?.width||width;
  const mh=element?.videoHeight||element?.naturalHeight||asset(clip.assetId)?.height||height;
  const left=limit(clip.cropLeft||0,0,99),right=limit(clip.cropRight||0,0,99);
  const top=limit(clip.cropTop||0,0,99),bottom=limit(clip.cropBottom||0,0,99);
  const sx=mw*left/100,sy=mh*top/100,sw=mw*Math.max(.001,1-(left+right)/100),
    sh=mh*Math.max(.001,1-(top+bottom)/100);
  const fit=clip.fit||'contain';
  let w,h;
  if(fit==='stretch'){w=width;h=height;}
  else{
   const factor=(fit==='cover'?Math.max:Math.min)(width/sw,height/sh);
   w=sw*factor;h=sh*factor;
  }
  const visual=visualAt(clip,time-blockStart);
  const scale=Math.max(.001,visual.scale/100);
  return {sx,sy,sw,sh,x:width*visual.x/100,y:height*visual.y/100,
    w:w*scale,h:h*scale,rotation:visual.rotation,opacity:visual.opacity};
 }
 function visualFilter(c){
  return [filterName(c.filter),
    'brightness('+(100+(c.brightness||0))+'%)',
    'contrast('+(100+(c.contrast||0))+'%)',
    'saturate('+(100+(c.saturation||0))+'%)'].join(' ');
 }
 function drawMedia(element,clip,alpha=1,time=at,offset=0){
  if(!element)return;
  if(element.tagName==='VIDEO'&&element.readyState<2)return;
  const rect=mediaBounds(element,clip,time,offset);
  ctx.save();
  ctx.globalAlpha=limit(alpha*(rect.opacity/100),0,1);ctx.filter=visualFilter(clip);
  ctx.translate(rect.x,rect.y);ctx.rotate((rect.rotation||0)*Math.PI/180);
  try{ctx.drawImage(element,rect.sx,rect.sy,rect.sw,rect.sh,-rect.w/2,-rect.h/2,rect.w,rect.h);}catch(e){}
  ctx.restore();return rect;
 }
 function drawTitle(t,time){
  if(time<t.start||time>=t.end)return;
  const duration=t.end-t.start,progress=(time-t.start)/duration,position=visualAt(t,time-t.start);
  let alpha=limit(position.opacity/100,0,1),y=position.y/100*height;
  if(t.animation==='fade')alpha*=limit(Math.min(progress,1-progress)*5,0,1);
  if(t.animation==='rise')y+=Math.max(0,1-progress*5)*height*.12;
  ctx.save();ctx.globalAlpha=alpha;ctx.translate(width*position.x/100,y);
  ctx.rotate((position.rotation||0)*Math.PI/180);
  ctx.textAlign='center';ctx.textBaseline='middle';
  const fontSize=Math.round((t.size||64)*(position.scale||100)/100);
  ctx.font='800 '+fontSize+'px system-ui,sans-serif';
  ctx.lineWidth=Math.max(3,fontSize/9);ctx.strokeStyle='#101324b8';
  ctx.shadowColor='#000a';ctx.shadowBlur=18;ctx.fillStyle=t.color||'#fff';
  const max=width*.83,words=String(t.text||'').split(/\s+/);
  let line='',lines=[];
  for(const word of words){
   const next=line?line+' '+word:word;
   if(ctx.measureText(next).width>max&&line){lines.push(line);line=word;}else line=next;
  }
  if(line)lines.push(line);
  const spacing=fontSize*1.25,start=-(lines.length-1)*spacing/2;
  lines.slice(0,6).forEach((part,i)=>{ctx.strokeText(part,0,start+i*spacing,max);ctx.fillText(part,0,start+i*spacing,max);});
  const measured=Math.min(max,Math.max(85,...lines.map(text=>ctx.measureText(text).width)));
  ctx.restore();
  return {x:width*position.x/100,y,w:measured,h:Math.max(fontSize,spacing*lines.length),
    rotation:position.rotation};
 }
 function overlayElement(clip){
  const a=asset(clip.assetId);if(!a)return null;
  if(a.kind==='image')return images.get(a.url)||null;
  if(a.kind!=='video')return null;
  let video=overlayPlayers.get(clip.id);
  if(!video){
   video=document.createElement('video');video.src=a.url;video.preload='auto';video.muted=true;
   video.playsInline=true;
   for(const event of ['loadeddata','seeked','timeupdate'])video.addEventListener(event,()=>{
     if(!recording&&!playing)draw();
   });
   overlayPlayers.set(clip.id,video);video.load();
  }
  return video;
 }
 function syncOverlays(){
  const active=new Set();
  for(const o of overlays){
   if(at<o.start||at>=o.end)continue;
   active.add(o.id);
   const a=asset(o.assetId);if(a?.kind!=='video')continue;
   const video=overlayElement(o);if(!video)continue;
   const expected=o.in+(at-o.start)*(o.speed||1);
   if(video.readyState>=1&&Math.abs(video.currentTime-expected)>.065){
    try{video.currentTime=limit(expected,0,Math.max(0,video.duration-.01));}catch(e){}
   }
   video.playbackRate=o.speed||1;
   if(playing&&video.paused)video.play().catch(()=>{});
  }
  for(const [id,video] of overlayPlayers)if(!active.has(id))video.pause();
 }
 function draw(time=at,controls=!recording){
  ctx.save();ctx.filter='none';ctx.clearRect(0,0,width,height);
  ctx.fillStyle='#131d2e';ctx.fillRect(0,0,width,height);
  const current=getBlock(time);let selectedRect=null;
  if(current){
   const a=asset(current.clip.assetId);
   const element=a?.kind==='image'?images.get(a.url):a?.kind==='video'?player:null;
   const transition=current.clip.transition==='fade'?Math.min(current.clip.fade||.5,current.end-current.start):0;
   const elapsed=time-current.start;
   const alpha=transition?limit(Math.min(elapsed,current.end-time)/transition,0,1):1;
   const rect=drawMedia(element,current.clip,alpha,time,current.start);
   if(current.clip.id===selectedId)selectedRect=rect;
  }
  for(const overlay of overlays){
   if(time<overlay.start||time>=overlay.end)continue;
   const rect=drawMedia(overlayElement(overlay),overlay,1,time,overlay.start);
   if(overlay.id===selectedId)selectedRect=rect;
  }
  for(const title of titles){
   const rect=drawTitle(title,time);
   if(title.id===selectedId)selectedRect=rect;
  }
  if(controls&&showGuides){
   ctx.strokeStyle='#ffffff55';ctx.lineWidth=Math.max(1,width/1800);
   ctx.setLineDash([Math.max(4,width/250),Math.max(4,width/250)]);
   for(const value of [1/3,2/3]){
    ctx.beginPath();ctx.moveTo(width*value,0);ctx.lineTo(width*value,height);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,height*value);ctx.lineTo(width,height*value);ctx.stroke();
   }
   ctx.setLineDash([]);
  }
  if(controls&&selectedRect){
   ctx.save();ctx.translate(selectedRect.x,selectedRect.y);
   ctx.rotate((selectedRect.rotation||0)*Math.PI/180);
   const w=selectedRect.w,h=selectedRect.h;
   ctx.strokeStyle='#ffc69b';ctx.lineWidth=Math.max(2,width/700);
   ctx.setLineDash([Math.max(5,width/180),Math.max(3,width/330)]);
   ctx.strokeRect(-w/2,-h/2,w,h);ctx.setLineDash([]);
   ctx.fillStyle='#ffffff';ctx.strokeStyle='#e48c63';ctx.lineWidth=Math.max(2,width/1200);
   for(const x of [-w/2,w/2])for(const y of [-h/2,h/2]){
    const radius=Math.max(4,width/230);ctx.beginPath();ctx.arc(x,y,radius,0,Math.PI*2);ctx.fill();ctx.stroke();
   }
   ctx.restore();
  }
  ctx.restore();
 }
 function seek(t){
  at=limit(Number(t)||0,0,total());
  const b=getBlock(at),a=b?asset(b.clip.assetId):null;
  if(a?.kind==='video'&&sourceId!==a.id){
   sourceId=a.id;player.src=a.url;player.load();
  }
  if(a?.kind==='video'){
   const expected=b.clip.in+(at-b.start)*b.clip.speed;
   if(Math.abs(player.currentTime-expected)>.22&&Number.isFinite(player.duration)){
    try{player.currentTime=limit(expected,0,Math.max(0,player.duration-.02));}catch(e){}
   }
   player.playbackRate=b.clip.speed;
   player.volume=audioContext?1:limit(b.clip.volume/100,0,1);
   if(videoGain)videoGain.gain.value=limit(b.clip.volume/100,0,2);
   if(playing&&player.paused)player.play().catch(()=>{});
  }else if(!player.paused)player.pause();
  syncSound();syncOverlays();draw();renderTime();
 }
 function renderTime(){
  $('video-timecode').textContent=code(at)+' / '+code(total());
  $('video-current').textContent=code(at);
  $('video-scrub').max=Math.max(.01,total());
  $('video-scrub').value=Math.min(at,total());
 }
 function activeSoundPlayback(){
  return audioClips.filter(c=>at>=c.start&&at<c.start+duration(c));
 }
 function syncSound(){
  const active=activeSoundPlayback(),keys=new Set(active.map(c=>c.id));
  for(const [id,el] of audioPlayers){
   if(!keys.has(id)&&!el.paused)el.pause();
  }
  for(const clip of active){
   const a=asset(clip.assetId);if(!a)continue;
   let el=audioPlayers.get(clip.id);
   if(!el){
    el=document.createElement('audio');el.src=a.url;el.preload='auto';el.playsInline=true;
    el.crossOrigin='anonymous';audioPlayers.set(clip.id,el);
   }
   const expected=clip.in+(at-clip.start)*clip.speed;
   if(Number.isFinite(el.duration)&&Math.abs(el.currentTime-expected)>.24){
    try{el.currentTime=limit(expected,0,Math.max(0,el.duration-.02));}catch(e){}
   }
   el.volume=audioContext?1:limit(clip.volume/100,0,1);el.playbackRate=clip.speed;
   const routed=mediaSources.get(el);if(routed)routed.gain.gain.value=limit(clip.volume/100,0,2);
   if(playing&&el.paused)el.play().catch(()=>{});
  }
 }
 function tick(t){
  if(!playing)return;
  const delta=lastTime?Math.min(.1,(t-lastTime)/1000):0;lastTime=t;
  at=Math.min(total(),at+delta);
  seek(at);
  if(at>=total()){pause();seek(total());return;}
  raf=requestAnimationFrame(tick);
 }
 function play(){
  if(!clips.length){status('Add a video or image clip to the timeline first.');return;}
  if(at>=total())at=0;
  playing=true;lastTime=0;
  $('video-play').textContent='⏸ Pause';
  if(audioContext?.state==='suspended')audioContext.resume().catch(()=>{});
  seek(at);raf=requestAnimationFrame(tick);
 }
 function pause(){
  playing=false;cancelAnimationFrame(raf);raf=0;lastTime=0;
  $('video-play').textContent='▶ Play';
  player.pause();audioPlayers.forEach(el=>el.pause());overlayPlayers.forEach(el=>el.pause());
 }
 function addTitle(){
  const start=Math.min(at,total()),end=start+Math.max(1,Math.min(4,total()-start||4));
  const t={id:uid(),type:'title',text:'Your story starts here',start,end,size:76,color:'#ffffff',
    x:50,y:80,scale:100,rotation:0,opacity:100,animation:'none',keyframes:[]};
  titles.push(t);selectedId=t.id;changed('Added editable animated title.');
  fillInspector(t);seek(at);
 }
 function addOverlay(){
  const a=asset(chosenMedia);
  if(!a||a.kind==='audio'){status('Select a photo or video from the media library first.');return;}
  if(!clips.length){status('Add a main clip to the timeline first.');return;}
  const start=limit(at,0,Math.max(0,total()-.05));
  const available=Math.max(.05,total()-start);
  const out=Math.min(available,a.duration);
  const o={id:uid(),type:'overlay',assetId:a.id,start,end:start+out,in:0,out,speed:1,volume:0,
   ...defaults(),scale:45,fit:'contain',filter:'none',transition:'cut',fade:.3};
  overlays.push(o);selectedId=o.id;changed('Overlay added. Drag or resize it in the preview.');
  fillInspector(o);seek(at);
 }
 function split(){
  const b=getBlock(at);
  if(!b||at<=b.start+.05||at>=b.end-.05){status('Move the playhead inside a clip to split it.');return;}
  const c=b.clip,i=clips.indexOf(c),cut=c.in+(at-b.start)*c.speed;
  const offset=at-b.start,current=visualAt(c,offset);
  const keys=(c.keyframes||[]).slice();
  const next={...c,id:uid(),in:cut,
    keyframes:keys.filter(k=>k.at>=offset).map(k=>({...k,at:k.at-offset}))};
  if(keys.length&&next.keyframes.length&&!next.keyframes.some(k=>Math.abs(k.at)<.025))
   next.keyframes.unshift({at:0,...current});
  c.keyframes=keys.filter(k=>k.at<=offset);
  c.out=cut;clips.splice(i+1,0,next);selectedId=next.id;changed('Split into two independently editable clips.');
  fillInspector(next);seek(at);
 }
 function sample(){
  if(clips.length&&!confirm('Replace this video timeline with a sample? Save your project first.'))return;
  pause();clips.length=0;overlays.length=0;titles.length=0;audioClips.length=0;at=0;
  const colors=['#4b337d','#185d59','#f19e71'];const prompts=['Create the moment','Tell your story','Made with ListPull'];
  for(let i=0;i<3;i++){
   const temp=document.createElement('canvas');temp.width=1280;temp.height=720;
   const g=temp.getContext('2d'),gradient=g.createLinearGradient(0,0,1280,720);
   gradient.addColorStop(0,colors[i]);gradient.addColorStop(1,'#12283c');
   g.fillStyle=gradient;g.fillRect(0,0,1280,720);
   g.fillStyle=['#e4c69d','#a8e5d2','#ffd9b1'][i];
   g.beginPath();g.arc(1000,210,155,0,Math.PI*2);g.fill();
   const img=new Image();img.src=temp.toDataURL('image/png');
   const id=uid(),url=img.src;images.set(url,img);
   files.push({id,kind:'image',name:'ListPull Sample Scene '+(i+1)+'.png',url,duration:4,width:1280,height:720});
   clips.push({id:uid(),type:'image',assetId:id,in:0,out:4,speed:1,volume:0,...defaults(),
     filter:'none',transition:'fade',fade:.45});
   titles.push({id:uid(),type:'title',text:prompts[i],start:i*4+.35,end:i*4+3.65,size:92,
     color:'#ffffff',x:50,y:71,scale:100,rotation:0,animation:'rise'});
  }
  sourceId=null;selectedId=null;if(sizeMode==='auto'){width=1280;height=720;}resize();changed('Three-scene video sample ready. Play, split, edit titles and export.');seek(0);
 }
 function drawSnapshot(){
  draw(at,false);canvas.toBlob(blob=>{if(blob)download(blob,'listpull-video-still.png');draw();},'image/png');
 }
 function pickMime(request){
  const webm=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  const mp4=['video/mp4;codecs=h264,aac','video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4'];
  const list=request==='mp4'?mp4:request==='webm'?webm:[...mp4,...webm];
  return list.find(t=>MediaRecorder.isTypeSupported(t))||null;
 }
 async function setupAudio(){
  if(audioContext)return;
  const AC=window.AudioContext||window.webkitAudioContext;
  if(!AC)return;
  audioContext=new AC();mix=audioContext.createMediaStreamDestination();
  try{
   playerSource=audioContext.createMediaElementSource(player);
   videoGain=audioContext.createGain();videoGain.gain.value=1;
   playerSource.connect(videoGain);videoGain.connect(audioContext.destination);videoGain.connect(mix);
  }catch(e){status('Original video audio capture unavailable: '+e.message);}
 }
 function wireAudioElement(element){
  if(!audioContext||mediaSources.has(element))return;
  try{
   const src=audioContext.createMediaElementSource(element),gain=audioContext.createGain();
   src.connect(gain);gain.connect(audioContext.destination);gain.connect(mix);
   mediaSources.set(element,{src,gain});
  }catch(e){}
 }
 async function exportVideo(){
  if(recording||!clips.length){status('Add a clip before exporting.');return;}
  if(!canvas.captureStream||!window.MediaRecorder){status('Video encoding is not supported by this browser.');return;}
  const mime=pickMime($('video-export-type').value);
  if(!mime){status('This browser does not offer a compatible MP4/WebM encoder for the selected format.');return;}
  pause();const original=at;at=0;recording=true;cancelExport=false;
  switchTab('project');$('video-cancel-export').hidden=false;
  $('video-export-status').textContent='Preparing on-device video export…';
  $('video-export-progress').value=0;
  const chunks=[];let audioWarning='';
  try{
   await setupAudio();
   if(audioContext)await audioContext.resume();
   for(const c of audioClips){
    const a=asset(c.assetId);if(!a)continue;
    let el=audioPlayers.get(c.id);
    if(!el){el=new Audio(a.url);el.preload='auto';audioPlayers.set(c.id,el);}
    wireAudioElement(el);
    const chain=mediaSources.get(el);if(chain)chain.gain.gain.value=limit(c.volume/100,0,2);
   }
   const stream=canvas.captureStream(limit(fps,1,120));
   for(const track of mix?.stream?.getAudioTracks()||[])stream.addTrack(track);
   recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:bitrate});
   recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
   const done=new Promise((resolve,reject)=>{
    recorder.onstop=resolve;recorder.onerror=e=>reject(e.error||Error('Video encoding failed'));
   });
   recorder.start(800);
   play();
   let last=performance.now();
   while(playing&&!cancelExport&&at<total()-.025){
    await new Promise(resolve=>setTimeout(resolve,125));
    const current=performance.now();
    if(current-last>2500){audioWarning='Export experienced a slow rendering frame.';}
    last=current;
    $('video-export-progress').value=limit(at/Math.max(.01,total())*100,0,100);
    $('video-export-status').textContent='Rendering '+Math.round(at/total()*100)+'% · '+code(at)+' / '+code(total());
   }
   pause();if(recorder.state!=='inactive')recorder.stop();await done;
   stream.getTracks().forEach(t=>t.stop());
   if(cancelExport){status('Export canceled.');$('video-export-status').textContent='Export canceled.';return;}
   const blob=new Blob(chunks,{type:mime.split(';')[0]});
   if(blob.size<1000)throw Error('Video encoding produced no frames.');
   const ext=mime.includes('mp4')?'mp4':'webm';
   download(blob,'listpull-video-'+Date.now()+'.'+ext);
   $('video-export-progress').value=100;
   $('video-export-status').textContent='Downloaded '+ext.toUpperCase()+' · '+(blob.size/1024/1024).toFixed(1)+' MB. '+audioWarning;
   status('Your video was exported from the timeline.');
  }catch(error){
   status('Video export failed: '+String(error.message||error).slice(0,280));
   $('video-export-status').textContent='Export failed: '+String(error.message||error).slice(0,180);
  }finally{
   if(recorder?.state==='recording')recorder.stop();
   pause();at=Math.min(original,total());seek(at);
   $('video-cancel-export').hidden=true;recording=false;
  }
 }
 function saveProject(){
  const summary={version:1,project:{width,height,fps,bitrate},
   assets:files.map(({id,name,kind,duration,width,height})=>({id,name,kind,duration,width,height})),
   clips,overlays,titles,audioClips,sizeMode};
  download(new Blob([JSON.stringify(summary,null,2)],{type:'application/json'}),'listpull-video-project.json');
  status('Editable timeline saved. Keep original media files with this project to reopen it.');
 }
 async function openProject(file){
  const data=JSON.parse(await file.text());
  if(!data?.project||!Array.isArray(data.clips))throw Error('Invalid project file.');
  pause();({width,height,fps,bitrate}=data.project);sizeMode=data.sizeMode||'manual';
  clips.splice(0,clips.length,...data.clips);overlays.splice(0,overlays.length,...(data.overlays||[]));titles.splice(0,titles.length,...(data.titles||[]));
  audioClips.splice(0,audioClips.length,...(data.audioClips||[]));
  const matched=new Map(files.map(x=>[x.name,x]));
  for(const descriptor of data.assets||[]){
   const local=matched.get(descriptor.name);
   if(!local)pendingRelinks.set(descriptor.id,descriptor.name);
   if(local)for(const collection of [clips,overlays,audioClips]){
    for(const record of collection)if(record.assetId===descriptor.id)record.assetId=local.id;
   }
  }
  resize();at=0;sourceId=null;changed(pendingRelinks.size?'Timeline loaded. Import the matching original media files to relink '+pendingRelinks.size+' assets.':'Timeline loaded and media connected.');seek(at);
 }
 async function voiceover(){
  if(voiceRecorder?.state==='recording'){voiceRecorder.stop();return;}
  if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){status('Microphone recording is unavailable in this browser.');return;}
  try{
   voiceStream=await navigator.mediaDevices.getUserMedia({audio:true});voiceParts=[];
   voiceRecorder=new MediaRecorder(voiceStream);
   voiceRecorder.ondataavailable=e=>{if(e.data.size)voiceParts.push(e.data);};
   const begin=at,started=performance.now();
   voiceRecorder.onstop=async()=>{
    voiceStream.getTracks().forEach(t=>t.stop());voiceStream=null;
    const blob=new Blob(voiceParts,{type:voiceRecorder.mimeType||'audio/webm'});
    const file=new File([blob],'Voiceover '+Date.now()+(blob.type.includes('mp4')?'.m4a':'.webm'),{type:blob.type});
    try{await ingest([file]);const media=files.at(-1);
     audioClips.push({id:uid(),type:'audio',assetId:media.id,start:begin,in:0,out:Math.min(media.duration,(performance.now()-started)/1000),
      speed:1,volume:100});changed('Voiceover added to the audio track.');}
    catch(e){status(e.message);}
    document.querySelector('[data-video="record-voice"]').textContent='● Record voiceover';
   };
   voiceRecorder.start();
   document.querySelector('[data-video="record-voice"]').textContent='■ Stop recording';
   status('Recording from microphone… press Stop recording when finished.');
  }catch(e){status('Microphone could not start: '+e.message);}
 }
 function command(name){
  if(name==='demo'){sample();return;}
  if(name==='add-media'){addFileToTimeline(asset(chosenMedia));return;}
  if(name==='play'){playing?pause():play();return;}
  if(name==='previous'){pause();seek(0);return;}
  if(name==='next'){pause();seek(total());return;}
  if(name==='undo'){history(-1);return;}
  if(name==='redo'){history(1);return;}
  if(name==='split'){split();return;}
  if(name==='add-overlay'){addOverlay();return;}
  if(name==='keyframe'){addKeyframe();return;}
  if(name==='clear-keyframes'){const o=item(selectedId);if(o){o.keyframes=[];changed('Animation keyframes cleared.');fillInspector(o);seek(at);}return;}
  if(name==='toggle-guides'){showGuides=!showGuides;document.querySelector('[data-video="toggle-guides"]').setAttribute('aria-pressed',String(showGuides));draw();return;}
  if(name==='add-title'){addTitle();return;}
  if(name==='add-music'){$('video-upload').click();switchTab('clip');status('Import an audio file and add it to the timeline.');return;}
  if(name==='record-voice'){voiceover();return;}
  if(name==='snapshot'){drawSnapshot();return;}
  if(name==='save'){saveProject();return;}
  if(name==='export'){exportVideo();return;}
  if(name==='cancel-export'){cancelExport=true;return;}
  if(name==='match-source'){matchSource();return;}
  if(name==='apply-quick-size'){setCanvasSize(Math.round(number('video-quick-width')),Math.round(number('video-quick-height')),'Custom canvas size applied.');return;}
  if(name==='fit-clip'||name==='fill-clip'){const o=item(selectedId);if(o){o.fit=name==='fit-clip'?'contain':'cover';fillInspector(o);changed(name==='fit-clip'?'Entire source frame fitted to canvas.':'Source fills canvas. Adjust crop in the inspector.');seek(at);}return;}
  if(name==='reset-transform'){const o=item(selectedId);if(o){Object.assign(o,defaults(),{filter:'none'});fillInspector(o);changed('Original framing and appearance restored.');seek(at);}return;}
  if(name==='apply-project'){
   const w=Math.round(number('video-width')),h=Math.round(number('video-height')),
    f=Math.round(number('video-fps')),rate=number('video-bitrate');
   if(w<16||h<16||f<1||rate<=0){status('Use positive project resolution, frame rate and bitrate.');return;}
   fps=f;bitrate=rate*1e6;setCanvasSize(w,h,'Canvas and export settings updated.');return;
  }
  if(name==='remove'){
   if(!selectedId){status('Select a timeline item first.');return;}
   for(const group of [clips,overlays,titles,audioClips]){
    const i=group.findIndex(x=>x.id===selectedId);if(i>=0){group.splice(i,1);break;}
   }selectedId=null;at=Math.min(at,total());changed('Selected item removed.');seek(at);return;
  }
 }
 function previewPoint(event){
  const bounds=canvas.getBoundingClientRect();
  if(!bounds.width||!bounds.height)return null;
  return {x:(event.clientX-bounds.left)*width/bounds.width,
   y:(event.clientY-bounds.top)*height/bounds.height};
 }
 function hitBox(c){
  if(!c)return null;
  if(c.type==='title'){
   if(at<c.start||at>=c.end)return null;
   const state=visualAt(c,at-c.start),fs=(c.size||66)*state.scale/100;
   return {x:state.x*width/100,y:state.y*height/100,
    w:Math.min(width*.82,Math.max(fs*2,String(c.text||'').length*fs*.46)),
    h:fs*1.6,rotation:state.rotation||0};
  }
  const block=blocks().find(b=>b.clip.id===c.id);
  if(c.type!=='overlay'&&!block)return null;
  if(c.type==='overlay'&&(at<c.start||at>=c.end))return null;
  const a=asset(c.assetId);
  return mediaBounds(a?.kind==='image'?images.get(a.url):a?.kind==='video'?
    (c.type==='overlay'?overlayElement(c):player):null,c,at,c.type==='overlay'?c.start:block?.start||0);
 }
 function pickPreviewObject(p){
  const activeTitles=titles.filter(x=>at>=x.start&&at<x.end).reverse();
  const activeOverlays=overlays.filter(x=>at>=x.start&&at<x.end).reverse();
  const main=getBlock(at)?.clip;
  for(const o of [...activeTitles,...activeOverlays,...(main?[main]:[])]){
   const rect=hitBox(o);if(!rect)continue;
   const dx=p.x-rect.x,dy=p.y-rect.y,angle=-(rect.rotation||0)*Math.PI/180;
   const x=dx*Math.cos(angle)-dy*Math.sin(angle);
   const y=dx*Math.sin(angle)+dy*Math.cos(angle);
   const margin=Math.max(8,width/150);
   if(Math.abs(x)<=rect.w/2+margin&&Math.abs(y)<=rect.h/2+margin){
    const corner=Math.abs(Math.abs(x)-rect.w/2)<margin*3&&Math.abs(Math.abs(y)-rect.h/2)<margin*3;
    return {item:o,mode:corner?'resize':'move',rect};
   }
  }
  return null;
 }
 function previewDown(event){
  if(event.button!==0||recording)return;
  const p=previewPoint(event);if(!p)return;
  const hit=pickPreviewObject(p);if(!hit)return;
  pause();selectedId=hit.item.id;
  const key=(hit.item.keyframes||[]).find(k=>Math.abs(k.at-activeOffset(hit.item))<.03);
  const state=visualAt(hit.item,activeOffset(hit.item));
  dragging={id:hit.item.id,mode:hit.mode,start:p,
   scale:state.scale,x:state.x,y:state.y,
   distance:Math.max(1,Math.hypot(p.x-hit.rect.x,p.y-hit.rect.y)),
   key};
  canvas.setPointerCapture(event.pointerId);
  renderAll();fillInspector(hit.item);event.preventDefault();
 }
 function previewMove(event){
  if(!dragging)return;
  const p=previewPoint(event);if(!p)return;
  const o=item(dragging.id);if(!o)return;
  const next={};
  if(dragging.mode==='resize'){
   const rect=hitBox(o);if(!rect)return;
   const distance=Math.hypot(p.x-rect.x,p.y-rect.y);
   next.scale=limit(dragging.scale*distance/dragging.distance,1,1500);
  }else{
   next.x=dragging.x+(p.x-dragging.start.x)/width*100;
   next.y=dragging.y+(p.y-dragging.start.y)/height*100;
  }
  for(const [key,value] of Object.entries(next)){
   if(dragging.key)dragging.key[key]=value;
   else o[key]=value;
   const field=$('video-'+key);if(field)field.value=round(value);
  }
  draw();event.preventDefault();
 }
 function previewUp(){
  if(!dragging)return;
  const edited=item(dragging.id);dragging=null;
  changed('Preview transform updated. Changes are reflected in the video export.');
  if(edited)fillInspector(edited);draw();
 }
 function startup(){
  document.querySelectorAll('[data-video]').forEach(button=>button.addEventListener('click',()=>command(button.dataset.video)));
  document.querySelectorAll('[data-video-tab]').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.videoTab)));
  document.querySelectorAll('[data-video-size]').forEach(button=>button.addEventListener('click',()=>{
    const [w,h]=button.dataset.videoSize.split(',').map(Number);
    setCanvasSize(w,h,'Canvas changed to '+w+' × '+h+'.');
  }));
  $('video-quick-preset').addEventListener('change',event=>{
    const value=event.target.value;
    if(value&&value!=='custom'){const [w,h]=value.split(',').map(Number);setCanvasSize(w,h,'Canvas preset applied.');}
    else if(value==='custom')$('video-quick-width').focus();
    event.target.value='';
  });
  for(const id of ['video-quick-width','video-quick-height']){
    $(id).addEventListener('keydown',event=>{
      if(event.key==='Enter'){event.preventDefault();command('apply-quick-size');}
    });
  }
  for(const name of ['opacity','brightness','contrast','saturation']){
    const field=$('video-'+name),out=$('video-'+name+'-label');
    field.addEventListener('input',()=>{out.textContent=field.value+(name==='opacity'?'%':'');});
    field.addEventListener('change',()=>{if(selectedId)applyInspector();});
  }
  $('video-apply').addEventListener('click',applyInspector);
  $('video-scrub').addEventListener('input',e=>{pause();seek(e.target.value);});
  const input=$('video-upload');input.addEventListener('change',()=>ingest(input.files).catch(e=>status(e.message)).finally(()=>input.value=''));
  const project=$('video-project-open');project.addEventListener('change',()=>{
    if(project.files[0])openProject(project.files[0]).catch(e=>status(e.message)).finally(()=>project.value='');
  });
  const drop=$('video-import-drop');
  drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('is-dragging');});
  drop.addEventListener('dragleave',()=>drop.classList.remove('is-dragging'));
  drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('is-dragging');ingest(e.dataTransfer.files).catch(err=>status(err.message));});
  document.addEventListener('keydown',e=>{
    if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;
    if(e.key===' '){e.preventDefault();playing?pause():play();}
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();history(e.shiftKey?1:-1);}
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='y'){e.preventDefault();history(1);}
  });
  for(const event of ['loadeddata','seeked','canplay','timeupdate']){
    player.addEventListener(event,()=>{
      if(!recording||event!=='timeupdate')draw();
    });
  }
  player.addEventListener('loadedmetadata',()=>{
    const b=getBlock(at);
    if(b&&asset(b.clip.assetId)?.kind==='video'){
      const time=b.clip.in+(at-b.start)*b.clip.speed;
      const next=limit(time,0,Math.max(0,player.duration-.005));
      if(Number.isFinite(next)&&Math.abs(player.currentTime-next)>.01){
        try{player.currentTime=next;}catch(e){}
      }
    }
  });
  player.addEventListener('error',()=>status('This video could not be decoded in the current browser. Try another format or codec.'));
  canvas.addEventListener('pointerdown',previewDown);
  canvas.addEventListener('pointermove',previewMove);
  canvas.addEventListener('pointerup',previewUp);
  canvas.addEventListener('pointercancel',previewUp);
    resize();save();renderAll();
  window.ListPullVideo=Object.freeze({
   inspect:()=>({width,height,fps,duration:total(),clips:clips.map(c=>({name:asset(c.assetId)?.name||'missing media',
      duration:round(duration(c)),filter:c.filter,speed:c.speed})),titles:titles.map(t=>({text:t.text,start:t.start,end:t.end})),
      audio:audioClips.length}),
   applyTitles:list=>{
    if(!Array.isArray(list))throw Error('No title suggestions provided.');
    for(const t of list.slice(0,12)){
     const start=limit(Number(t.start)||0,0,Math.max(0,total())),
      end=limit(Number(t.end)||start+2,start+.1,total()||start+2);
     titles.push({id:uid(),type:'title',text:String(t.text||'').slice(0,200),start,end,size:limit(Number(t.size)||70,12,240),
      x:limit(Number(t.x)||50,0,100),y:limit(Number(t.y)||75,0,100),color:/^#[0-9a-f]{6}$/i.test(t.color)?t.color:'#fff',
      scale:100,rotation:0,animation:['none','fade','rise'].includes(t.animation)?t.animation:'fade'});
    }changed('AI-suggested titles added as editable timeline items.');
   }
  });
 }
 startup();
})();