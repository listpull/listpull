/* ListPull Vector Studio - client-only, dependency-free illustration editor.
   The private svg-editor's layer/history/export concepts informed this clean-room
   implementation. No Fabric 3 or legacy CRA code is loaded on the public site. */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const W=960,H=640,STORE='listpull.vector.v1',MAX_HISTORY=50;
  const $=(id)=>document.getElementById(id);
  const stage=$('vector-stage'), layersUI=$('vector-layers');
  const props=[...document.querySelectorAll('[data-property]')];
  const status=$('vector-status');
  let doc={background:'#ffffff',layers:[]},selected=null,zoom=1;
  let snapshots=[],historyIndex=-1,drag=null;
  const colors={rect:'#ff9b58',ellipse:'#8e6be0',star:'#ffd562',text:'#192c55'};
  const isHex=v=>typeof v==='string'&&/^#[0-9a-fA-F]{6}$/.test(v);
  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
  const num=(value,defaultValue=0)=>Number.isFinite(Number(value))?Number(value):defaultValue;
  const id=()=>String(Date.now())+'-'+Math.random().toString(36).slice(2,9);
  const setStatus=s=>{status.textContent=s;};
  const cleanName=(name)=>String(name||'Layer').replace(/[<>]/g,'').slice(0,80);
  function safeImage(src){
    return typeof src==='string'&&src.length<8000000&&/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(src);
  }
  function cleanLayer(raw){
    if(!raw||!['rect','ellipse','star','text','image'].includes(raw.type))throw Error('Unsupported layer type');
    const layer={id:id(),type:raw.type,name:cleanName(raw.name),x:clamp(num(raw.x),-2000,3000),y:clamp(num(raw.y),-2000,3000),w:clamp(num(raw.w,120),1,3000),h:clamp(num(raw.h,100),1,3000),fill:isHex(raw.fill)?raw.fill:'#ff9b58',opacity:clamp(num(raw.opacity,1),0,1)};
    if(layer.type==='text')layer.text=String(raw.text||'Your text').slice(0,120);
    if(layer.type==='image'){if(!safeImage(raw.src))throw Error('Invalid embedded image');layer.src=raw.src;}
    return layer;
  }
  function cleanDoc(raw){
    if(!raw||!Array.isArray(raw.layers)||raw.layers.length>80)throw Error('This project is invalid or too large');
    return {background:isHex(raw.background)?raw.background:'#ffffff',layers:raw.layers.map(cleanLayer)};
  }
  function defaultDoc(){
    return {background:'#f9f3ed',layers:[
      {type:'rect',name:'Sky',x:0,y:0,w:960,h:640,fill:'#294477',opacity:1},
      {type:'ellipse',name:'Golden moon',x:624,y:65,w:220,h:220,fill:'#ffca83',opacity:1},
      {type:'star',name:'Big sparkle',x:120,y:142,w:125,h:125,fill:'#f9e2a3',opacity:1},
      {type:'ellipse',name:'Dreamy hill',x:110,y:445,w:760,h:340,fill:'#517a9e',opacity:1},
      {type:'text',name:'Headline',x:100,y:285,w:560,h:90,fill:'#ffffff',opacity:1,text:'MAKE SOMETHING MAGIC'}
    ].map(cleanLayer)};
  }
  function snapshot(){
    const raw=JSON.stringify(doc);
    if(snapshots[historyIndex]===raw)return;
    snapshots=snapshots.slice(0,historyIndex+1);
    snapshots.push(raw);
    if(snapshots.length>MAX_HISTORY)snapshots.shift();
    historyIndex=snapshots.length-1;
    try{if(raw.length<3500000)localStorage.setItem(STORE,raw);else setStatus('Design is too large for autosave; download a project file.');}
    catch(e){setStatus('Browser storage unavailable; use Save project for a backup.');}
    updateHistoryButtons();
  }
  function updateHistoryButtons(){
    $('vector-undo').disabled=historyIndex<=0;
    $('vector-redo').disabled=historyIndex>=snapshots.length-1;
  }
  function restoreHistory(delta){
    const i=historyIndex+delta;
    if(i<0||i>=snapshots.length)return;
    historyIndex=i;doc=cleanDoc(JSON.parse(snapshots[i]));
    if(!doc.layers.some(l=>l.id===selected))selected=null;
    // ID regeneration on restore requires selection by rendered layer instead.
    selected=null;render();updateHistoryButtons();
    try{localStorage.setItem(STORE,JSON.stringify(doc));}catch(e){}
    setStatus(delta<0?'Undone.':'Redone.');
  }
  function starPoints(layer){
    const cx=layer.x+layer.w/2,cy=layer.y+layer.h/2;
    let points=[];
    for(let i=0;i<10;i++){
      const theta=-Math.PI/2+i*Math.PI/5;
      const radius=i%2?0.42:1;
      points.push((cx+Math.cos(theta)*layer.w/2*radius).toFixed(2)+','+(cy+Math.sin(theta)*layer.h/2*radius).toFixed(2));
    }
    return points.join(' ');
  }
  function createLayerNode(layer){
    const tag=({rect:'rect',ellipse:'ellipse',star:'polygon',text:'text',image:'image'})[layer.type];
    const el=document.createElementNS(NS,tag);
    el.setAttribute('data-layer-id',layer.id);
    el.setAttribute('opacity',String(layer.opacity));
    if(layer.type==='rect'){el.setAttribute('x',layer.x);el.setAttribute('y',layer.y);el.setAttribute('width',layer.w);el.setAttribute('height',layer.h);el.setAttribute('rx','8');}
    if(layer.type==='ellipse'){el.setAttribute('cx',layer.x+layer.w/2);el.setAttribute('cy',layer.y+layer.h/2);el.setAttribute('rx',layer.w/2);el.setAttribute('ry',layer.h/2);}
    if(layer.type==='star')el.setAttribute('points',starPoints(layer));
    if(layer.type==='text'){
      el.setAttribute('x',layer.x);
      el.setAttribute('y',layer.y+layer.h*.77);
      el.setAttribute('font-family','system-ui, Arial, sans-serif');
      el.setAttribute('font-size',String(clamp(layer.h*.6,12,320)));
      el.setAttribute('font-weight','800');
      el.setAttribute('textLength',String(layer.w));
      el.setAttribute('lengthAdjust','spacingAndGlyphs');
      el.textContent=layer.text||'Text';
    }
    if(layer.type==='image'){
      el.setAttribute('x',layer.x);el.setAttribute('y',layer.y);
      el.setAttribute('width',layer.w);el.setAttribute('height',layer.h);
      el.setAttribute('preserveAspectRatio','xMidYMid meet');el.setAttribute('href',layer.src);
    }else el.setAttribute('fill',layer.fill);
    el.style.cursor='move';
    return el;
  }
  function render(){
    stage.replaceChildren();
    const bg=document.createElementNS(NS,'rect');
    bg.setAttribute('width',W);bg.setAttribute('height',H);bg.setAttribute('fill',doc.background);bg.setAttribute('pointer-events','none');
    stage.append(bg);
    for(const layer of doc.layers)stage.append(createLayerNode(layer));
    const layer=doc.layers.find(l=>l.id===selected);
    if(layer){
      const rect=document.createElementNS(NS,'rect');
      for(const [k,v] of Object.entries({x:layer.x-4,y:layer.y-4,width:layer.w+8,height:layer.h+8,fill:'none',stroke:'#ff5c95','stroke-width':3,'stroke-dasharray':'10 7','pointer-events':'none'}))rect.setAttribute(k,v);
      stage.append(rect);
    }
    renderLayers();renderProps(layer);
    $('vector-background').value=doc.background;
    $('vector-layer-count').textContent=String(doc.layers.length);
    $('vector-duplicate').disabled=!layer;$('vector-delete').disabled=!layer;
    $('vector-up').disabled=!layer||doc.layers.indexOf(layer)===doc.layers.length-1;
    $('vector-down').disabled=!layer||doc.layers.indexOf(layer)===0;
  }
  function renderLayers(){
    layersUI.replaceChildren();
    for(const layer of doc.layers.slice().reverse()){
      const li=document.createElement('li'),button=document.createElement('button'),symbol=document.createElement('span');
      button.type='button';button.setAttribute('aria-pressed',String(selected===layer.id));
      button.title='Select '+layer.name;symbol.textContent=({rect:'▭',ellipse:'◯',star:'✦',text:'T',image:'▧'})[layer.type];
      button.append(symbol,document.createTextNode(layer.name||layer.type));button.addEventListener('click',()=>{selected=layer.id;render();});
      li.append(button);layersUI.append(li);
    }
  }
  function renderProps(layer){
    $('vector-selection-name').textContent=layer?layer.name:'No selection';
    for(const input of props){
      input.disabled=!layer||(layer&&layer.type==='image'&&input.dataset.property==='fill');
      if(layer){
        const key=input.dataset.property;
        input.value=key==='opacity'?Math.round(layer.opacity*100):String(layer[key]??'');
      }
    }
    $('vector-opacity-output').textContent=layer?Math.round(layer.opacity*100)+'%':'—';
    $('vector-text-wrapper').hidden=!layer||layer.type!=='text';
  }
  function addLayer(type){
    const count=doc.layers.length;if(count>=80){setStatus('Maximum 80 layers.');return;}
    const w=type==='text'?430:type==='star'?160:220;
    const h=type==='text'?95:type==='star'?160:150;
    const layer=cleanLayer({type,name:({rect:'Rectangle',ellipse:'Ellipse',star:'Star',text:'Text'})[type]+' '+(count+1),x:280+count*7,y:190+count*7,w,h,fill:colors[type],opacity:1,text:type==='text'?'Your idea here':''});
    doc.layers.push(layer);selected=layer.id;snapshot();render();setStatus('Added '+type+' layer.');
  }
  function selectedLayer(){return doc.layers.find(l=>l.id===selected)}
  function action(type){
    const l=selectedLayer();if(!l)return;
    const index=doc.layers.indexOf(l);
    if(type==='duplicate'){
      if(doc.layers.length>=80)return setStatus('Maximum 80 layers.');
      const copy=cleanLayer({...l,x:l.x+25,y:l.y+25,name:l.name+' copy'});
      doc.layers.splice(index+1,0,copy);selected=copy.id;
    }
    if(type==='delete'){doc.layers.splice(index,1);selected=null}
    if(type==='up'&&index<doc.layers.length-1)[doc.layers[index],doc.layers[index+1]]=[doc.layers[index+1],doc.layers[index]];
    if(type==='down'&&index>0)[doc.layers[index],doc.layers[index-1]]=[doc.layers[index-1],doc.layers[index]];
    snapshot();render();
  }
  function point(event){
    const r=stage.getBoundingClientRect();
    return {x:(event.clientX-r.left)/r.width*W,y:(event.clientY-r.top)/r.height*H};
  }
  stage.addEventListener('pointerdown',event=>{
    const target=event.target.closest('[data-layer-id]');
    if(!target){selected=null;render();return;}
    selected=target.getAttribute('data-layer-id');const layer=selectedLayer();
    if(!layer)return;
    const p=point(event);
    drag={id:selected,p,startX:layer.x,startY:layer.y,changed:false,pointerId:event.pointerId};
    stage.setPointerCapture(event.pointerId);render();
    event.preventDefault();
  });
  stage.addEventListener('pointermove',event=>{
    if(!drag||drag.pointerId!==event.pointerId)return;
    const layer=doc.layers.find(l=>l.id===drag.id);if(!layer)return;
    const p=point(event);
    const nextX=clamp(Math.round(drag.startX+p.x-drag.p.x),-layer.w+10,W-10);
    const nextY=clamp(Math.round(drag.startY+p.y-drag.p.y),-layer.h+10,H-10);
    if(nextX!==layer.x||nextY!==layer.y){layer.x=nextX;layer.y=nextY;drag.changed=true;render();}
  });
  function endDrag(event){
    if(!drag||drag.pointerId!==event.pointerId)return;
    if(drag.changed){snapshot();setStatus('Layer moved.');}
    drag=null;
  }
  stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
  for(const input of props){
    input.addEventListener('change',()=>{
      const l=selectedLayer();if(!l)return;
      const key=input.dataset.property;
      if(key==='fill'){if(isHex(input.value))l.fill=input.value;}
      else if(key==='text')l.text=input.value.slice(0,120);
      else if(key==='opacity')l.opacity=clamp(num(input.value)/100,0,1);
      else if(['x','y','w','h'].includes(key))l[key]=clamp(num(input.value,l[key]),key==='x'||key==='y'?-2000:1,3000);
      snapshot();render();
    });
    if(input.dataset.property==='opacity')input.addEventListener('input',()=>{$('vector-opacity-output').textContent=input.value+'%';});
  }
  $('vector-background').addEventListener('change',event=>{if(!isHex(event.target.value))return;doc.background=event.target.value;snapshot();render()});
  document.querySelectorAll('[data-add]').forEach(btn=>btn.addEventListener('click',()=>addLayer(btn.dataset.add)));
  for(const name of ['duplicate','delete','up','down'])$('vector-'+name).addEventListener('click',()=>action(name));
  $('vector-undo').addEventListener('click',()=>restoreHistory(-1));
  $('vector-redo').addEventListener('click',()=>restoreHistory(1));
  function applyZoom(){stage.style.width='min('+Math.round(zoom*100)+'%, '+Math.round(880*zoom)+'px)';$('vector-zoom-label').textContent=Math.round(zoom*100)+'%';}
  $('vector-zoom-in').addEventListener('click',()=>{zoom=clamp(zoom+.2,.5,2);applyZoom()});
  $('vector-zoom-out').addEventListener('click',()=>{zoom=clamp(zoom-.2,.5,2);applyZoom()});
  function loadTemplate(name){
    if(snapshots.length>1&&!window.confirm('Replace this design with a template? Download a project backup if needed.'))return;
    const L=(type,name,x,y,w,h,fill,text)=>({type,name,x,y,w,h,fill,opacity:1,...(type==='text'?{text}: {})});
    let layers=[],bg='#ffffff';
    if(name==='blank')layers=[];
    else if(name==='badge'){
      bg='#fffaf0';layers=[
        L('ellipse','Label border',160,38,640,555,'#814fc4'),
        L('ellipse','Inner badge',195,72,570,490,'#ffe6ad'),
        L('star','Golden sparkle',386,107,190,174,'#ff9d58'),
        L('text','Brand title',220,290,530,90,'#673b7f','CREATIVE MARKET'),
        L('text','Subtitle',290,390,380,58,'#7b4d8e','MADE WITH CARE')
      ];
    }else if(name==='wildlife'){
      bg='#f7faf1';layers=[
        L('rect','Forest background',75,45,810,550,'#20594b'),
        L('ellipse','Forest moon',590,92,165,165,'#ffda9f'),
        L('ellipse','Forest hill',140,345,650,360,'#4f9273'),
        L('star','Firefly',175,158,105,105,'#ffbf77'),
        L('text','Wildlife title',165,292,625,90,'#ffffff','WILD & WONDERFUL'),
        L('text','Subtitle',280,402,405,60,'#fff0c6','EXPLORE NATURE')
      ];
    }else if(name==='promo'){
      bg='#f7eefc';layers=[
        L('rect','Purple poster',35,35,890,575,'#66429b'),
        L('ellipse','Sun',645,100,210,210,'#ffad73'),
        L('star','Sparkle',135,105,155,155,'#ffdb86'),
        L('text','Headline',125,255,700,116,'#ffffff','MAKE SOMETHING'),
        L('text','Subhead',215,365,545,88,'#f8d5ff','MAGICAL TODAY')
      ];
    }else return;
    doc={background:bg,layers:layers.map(cleanLayer)};
    selected=null;snapshot();render();setStatus('Loaded editable '+name+' template. Select a word or shape to customize it.');
  }
  document.querySelectorAll('[data-vector-template]').forEach(button=>button.addEventListener('click',()=>loadTemplate(button.dataset.vectorTemplate)));
  $('vector-reset').addEventListener('click',()=>{
    if(!window.confirm('Start a new design? Download your current project first if needed.'))return;
    doc={background:'#ffffff',layers:[]};selected=null;snapshot();render();setStatus('New blank design.');
  });
  document.addEventListener('keydown',event=>{
    const tag=event.target.tagName;if(['INPUT','TEXTAREA','SELECT'].includes(tag)||event.target.isContentEditable)return;
    const mod=event.metaKey||event.ctrlKey;
    if(mod&&event.key.toLowerCase()==='z'){event.preventDefault();restoreHistory(event.shiftKey?1:-1);return}
    if(mod&&event.key.toLowerCase()==='y'){event.preventDefault();restoreHistory(1);return}
    if(mod&&event.key.toLowerCase()==='d'){event.preventDefault();action('duplicate');return}
    if(!selectedLayer())return;
    if(event.key==='Delete'||event.key==='Backspace'){event.preventDefault();action('delete');return}
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();const l=selectedLayer(),step=event.shiftKey?10:1;
      if(event.key==='ArrowLeft')l.x-=step;if(event.key==='ArrowRight')l.x+=step;
      if(event.key==='ArrowUp')l.y-=step;if(event.key==='ArrowDown')l.y+=step;
      snapshot();render();
    }
  });
  function download(blob,name){
    const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=name;
    document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function buildSvg(){
    const svg=document.createElementNS(NS,'svg');
    svg.setAttribute('xmlns',NS);svg.setAttribute('width',W);svg.setAttribute('height',H);svg.setAttribute('viewBox','0 0 '+W+' '+H);
    const bg=document.createElementNS(NS,'rect');bg.setAttribute('width',W);bg.setAttribute('height',H);bg.setAttribute('fill',doc.background);svg.append(bg);
    doc.layers.forEach(l=>{const node=createLayerNode(l);node.removeAttribute('data-layer-id');node.removeAttribute('style');svg.append(node)});
    return new XMLSerializer().serializeToString(svg);
  }
  $('vector-export-svg').addEventListener('click',()=>{
    download(new Blob([buildSvg()],{type:'image/svg+xml;charset=utf-8'}),'listpull-vector.svg');setStatus('SVG downloaded.');
  });
  async function renderPng(){
    // Rasterize first-party shapes on Canvas; do not execute imported SVG.
    const c=document.createElement('canvas');c.width=W*2;c.height=H*2;
    const ctx=c.getContext('2d');ctx.scale(2,2);ctx.fillStyle=doc.background;ctx.fillRect(0,0,W,H);
    for(const l of doc.layers){
      ctx.save();ctx.globalAlpha=l.opacity;ctx.fillStyle=l.fill;
      if(l.type==='rect'){ctx.beginPath();if(typeof ctx.roundRect==='function')ctx.roundRect(l.x,l.y,l.w,l.h,8);else ctx.rect(l.x,l.y,l.w,l.h);ctx.fill();}
      if(l.type==='ellipse'){ctx.beginPath();ctx.ellipse(l.x+l.w/2,l.y+l.h/2,l.w/2,l.h/2,0,0,Math.PI*2);ctx.fill();}
      if(l.type==='star'){const pts=starPoints(l).split(' ').map(p=>p.split(',').map(Number));ctx.beginPath();pts.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.closePath();ctx.fill();}
      if(l.type==='text'){ctx.font='800 '+clamp(l.h*.6,12,320)+'px system-ui, Arial, sans-serif';ctx.textBaseline='alphabetic';ctx.fillText(l.text,l.x,l.y+l.h*.77,l.w);}
      if(l.type==='image'){
        const img=new Image();img.src=l.src;
        await img.decode();
        // SVG preserveAspectRatio="meet" equivalent
        const scale=Math.min(l.w/img.naturalWidth,l.h/img.naturalHeight);
        const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
        ctx.drawImage(img,l.x+(l.w-dw)/2,l.y+(l.h-dh)/2,dw,dh);
      }
      ctx.restore();
    }
    return new Promise((resolve,reject)=>c.toBlob(blob=>blob?resolve(blob):reject(Error('PNG encoding failed')),'image/png'));
  }
  async function resizeExport(blob){
    const preset=$('vector-export-size').value;
    const sizes={square:[1080,1080],banner:[1200,630],portrait:[1080,1350]};
    if(!sizes[preset])return {blob,name:'1920x1280'};
    const [width,height]=sizes[preset],url=URL.createObjectURL(blob);
    try{
      const img=new Image();img.src=url;await img.decode();
      const out=document.createElement('canvas');out.width=width;out.height=height;
      const ctx=out.getContext('2d'),fit=$('vector-export-fit').value;
      const scale=(fit==='cover'?Math.max:Math.min)(width/img.naturalWidth,height/img.naturalHeight);
      const dw=img.naturalWidth*scale,dh=img.naturalHeight*scale;
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.drawImage(img,(width-dw)/2,(height-dh)/2,dw,dh);
      const newBlob=await new Promise((resolve,reject)=>out.toBlob(b=>b?resolve(b):reject(Error('Export failed')),'image/png'));
      return {blob:newBlob,name:width+'x'+height};
    }finally{URL.revokeObjectURL(url)}
  }
  $('vector-export-png').addEventListener('click',async()=>{
    const b=$('vector-export-png');b.disabled=true;setStatus('Rendering artwork at your selected size…');
    try{
      const result=await resizeExport(await renderPng());
      download(result.blob,'listpull-artwork-'+result.name+'.png');
      setStatus('Downloaded '+result.name+' PNG. The original design remains editable.');
    }catch(error){setStatus('PNG export failed: '+error.message)}
    finally{b.disabled=false;}
  });
  $('vector-download-json').addEventListener('click',()=>{
    download(new Blob([JSON.stringify({format:'listpull-vector',version:1,...doc},null,2)],{type:'application/json'}),'listpull-project.json');
    setStatus('Project file downloaded.');
  });
  $('vector-project-upload').addEventListener('change',async event=>{
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    if(file.size>5500000)return setStatus('Project must be under 5.5 MB.');
    try{doc=cleanDoc(JSON.parse(await file.text()));selected=null;snapshot();render();setStatus('Project opened.');}
    catch(e){setStatus('Could not open project: '+e.message);}
  });
  $('vector-upload').addEventListener('change',async event=>{
    const file=event.target.files?.[0];event.target.value='';
    if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>3500000){setStatus('Use PNG, JPEG or WebP under 3.5 MB.');return}
    try{
      const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('File read failed'));r.readAsDataURL(file)});
      if(!safeImage(src))throw Error('Unsupported image encoding');
      const loaded=new Image();loaded.src=src;await loaded.decode();
      if(loaded.naturalWidth*loaded.naturalHeight>30000000)throw Error('Image exceeds 30 megapixels');
      if(doc.layers.length>=80)throw Error('Maximum 80 layers');
      const scale=Math.min(1,450/Math.max(loaded.naturalWidth,loaded.naturalHeight));
      const w=Math.round(loaded.naturalWidth*scale),h=Math.round(loaded.naturalHeight*scale);
      const layer=cleanLayer({type:'image',name:cleanName(file.name),src,x:Math.round((W-w)/2),y:Math.round((H-h)/2),w,h,opacity:1});
      doc.layers.push(layer);selected=layer.id;snapshot();render();setStatus('Image added as a local layer.');
    }catch(e){setStatus('Could not add image: '+e.message)}
  });
  try{const saved=localStorage.getItem(STORE);doc=saved?cleanDoc(JSON.parse(saved)):defaultDoc();}
  catch(e){doc=defaultDoc();setStatus('Previous project could not be loaded. New demo opened.')}
  snapshot();render();applyZoom();
})();
