/* ListPull Creative Studio. One canvas for vector and raster artwork.
 * Fabric.js is MIT licensed. Media stays on the visitor's device. */
(() => {
  'use strict';
  const F=window.fabric;
  const $=id=>document.getElementById(id);
  const status=message=>{$('creative-status').textContent=String(message).slice(0,500);};
  if(!F?.Canvas||!F.Rect){
    status('Editor library did not initialize. Please reconnect and reload the page.');
    return;
  }
  const canvas=new F.Canvas('creative-canvas',{
    width:1200,height:800,preserveObjectStacking:true,
    selection:true,backgroundColor:'#fff',
    renderOnAddRemove:true,enableRetinaScaling:true
  });
  const q=(selector)=>document.querySelector(selector);
  const all=selector=>[...document.querySelectorAll(selector)];
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const val=(id,fallback=0)=>{const n=Number($(id)?.value);return Number.isFinite(n)?n:fallback;};
  const text=(id,value)=>{if($(id))$(id).textContent=value;};
  const selected=()=>canvas.getActiveObject();
  const objects=()=>canvas.getObjects();
  const num=n=>Math.round((Number(n)||0)*100)/100;
  let docW=1200,docH=800,zoom=1,history=[],cursor=-1,restoring=false,ignore=false,brush=false;
  let timer=null,lastName='listpull-artwork';
  const extras=['name','zValue','depthValue','fillDefinition','fillOpacity','shadowSettings','effectSettings','sourceName'];
  const presets={
    social:[1080,1080],product:[1200,1200],nature:[1600,1000],badge:[1000,1000]
  };
  const defaultStops={type:'solid',first:'#8b65e5',second:'#f6aa6c',angle:0,alpha:1};
  function activeMany(){
    const o=selected();return !o?[]:o.type==='activeselection'||o.type==='activeSelection'?o.getObjects():[o];
  }
  function stamp(o,name){
    o.name=name||o.name||'Layer';
    o.zValue=objects().length;
    o.depthValue=0;
    o.fillOpacity=1;
    o.fillDefinition={...defaultStops,first:typeof o.fill==='string'&&/^#/.test(o.fill)?o.fill:'#8b65e5'};
    o.set({transparentCorners:false,cornerStyle:'circle',cornerColor:'#ffbd86',cornerStrokeColor:'#17243c',
      borderColor:'#e690b9',padding:3,centeredScaling:false});
    return o;
  }
  function saveState(){
    if(restoring)return;
    const state=JSON.stringify({width:docW,height:docH,background:canvas.backgroundColor,
      artwork:canvas.toObject(extras)});
    if(history[cursor]===state)return;
    history=history.slice(0,cursor+1);
    history.push(state);
    if(history.length>40)history.shift();
    cursor=history.length-1;
    clearTimeout(timer);
    timer=setTimeout(()=>{
      try{if(state.length<3_500_000)localStorage.setItem('listpull.creative.project',state);}catch(e){}
    },850);
  }
  async function loadState(raw){
    const state=typeof raw==='string'?JSON.parse(raw):raw;
    if(!state?.artwork?.objects||!Number.isFinite(state.width)||!Number.isFinite(state.height))throw Error('Invalid project data');
    if(state.width<=0||state.height<=0)throw Error('Canvas dimensions must be positive');
    restoring=true;
    try{
      canvas.discardActiveObject();
      docW=Math.round(state.width);docH=Math.round(state.height);
      await canvas.loadFromJSON(state.artwork);
      canvas.backgroundColor=state.background??'#fff';
      applyZoom(zoom);
      canvas.requestRenderAll();
      syncInputs();renderLayers();
    }finally{restoring=false}
  }
  async function undoRedo(move){
    const next=cursor+move;if(next<0||next>=history.length)return;
    cursor=next;try{await loadState(history[cursor]);status('Artwork history restored.');}catch(error){status(error.message);}
  }
  function noteMutation(msg){
    if(msg)status(msg);
    canvas.requestRenderAll();renderLayers();saveState();
  }
  function fitRatio(){
    const area=$('creative-drop');
    const width=Math.max(180,area.clientWidth-66),height=Math.max(160,area.clientHeight-66);
    return clamp(Math.min(width/docW,height/docH),.05,3);
  }
  function applyZoom(scale){
    zoom=clamp(Number(scale)||1,.05,8);
    canvas.setDimensions({width:Math.max(1,Math.round(docW*zoom)),height:Math.max(1,Math.round(docH*zoom))});
    canvas.setZoom(zoom);
    canvas.calcOffset();
    text('creative-zoom-label',Math.round(zoom*100)+'%');
    text('creative-size-label',docW.toLocaleString()+' × '+docH.toLocaleString());
    $('creative-document-width').value=docW;$('creative-document-height').value=docH;
  }
  function setSize(w,h){
    if(!Number.isInteger(w)||!Number.isInteger(h)||w<1||h<1)throw Error('Enter positive whole-number canvas dimensions.');
    docW=w;docH=h;applyZoom(fitRatio());noteMutation('Canvas set to '+docW+' × '+docH+' pixels.');
  }
  function createShape(type,opts={}){
    const options={left:90+Math.random()*80,top:95+Math.random()*85,fill:'#8b65e5',strokeWidth:0,
      ...opts};
    let obj;
    if(type==='rect')obj=new F.Rect({width:270,height:185,rx:16,ry:16,...options});
    else if(type==='ellipse')obj=new F.Ellipse({rx:120,ry:90,...options});
    else if(type==='triangle')obj=new F.Triangle({width:220,height:215,...options});
    else if(type==='star'){
      const points=[];for(let i=0;i<10;i++){const angle=-Math.PI/2+i*Math.PI/5,r=i%2?54:110;points.push({x:110+Math.cos(angle)*r,y:110+Math.sin(angle)*r});}
      obj=new F.Polygon(points,{...options,width:220,height:220});
    }else if(type==='line')obj=new F.Line([0,0,300,0],{stroke:'#ffb27c',strokeWidth:9,fill:null,...options});
    else if(type==='text')obj=new F.IText(String(options.text||'Create something extraordinary'),{fontFamily:'Arial',fontSize:51,fontWeight:'800',fill:'#f7f2ff',left:85,top:300,...options});
    else return;
    stamp(obj,type==='text'?'Editable text':type.charAt(0).toUpperCase()+type.slice(1));
    canvas.add(obj);canvas.setActiveObject(obj);syncInputs();noteMutation('Added editable '+type+'. Drag to position; use corners to resize.');
    return obj;
  }
  function doDemo(which){
    canvas.discardActiveObject();canvas.clear();
    const sizes=presets[which]||[1200,800];docW=sizes[0];docH=sizes[1];
    canvas.backgroundColor=which==='nature'?'#102e3b':which==='badge'?'#fff6ee':'#261f49';
    applyZoom(fitRatio());
    if(which==='product'){
      createShape('rect',{left:65,top:65,width:1070,height:1070,rx:42,ry:42,fill:'#eff5f2'});
      createShape('ellipse',{left:280,top:160,rx:315,ry:315,fill:'#9ce0d2'});
      createShape('text',{left:180,top:850,text:'PRODUCT DROP',fontSize:90,fill:'#173d47'});
      createShape('text',{left:190,top:975,text:'Your next collection',fontSize:42,fill:'#3d6577'});
    }else if(which==='nature'){
      createShape('rect',{left:70,top:80,width:1460,height:840,fill:'#245849',rx:45,ry:45});
      createShape('ellipse',{left:950,top:140,rx:240,ry:240,fill:'#f6c88b'});
      createShape('text',{left:135,top:340,text:'WILD &',fontSize:158,fill:'#fff3d6'});
      createShape('text',{left:140,top:525,text:'WONDERFUL',fontSize:132,fill:'#f7d19f'});
      createShape('text',{left:150,top:740,text:'A nature-led collection',fontSize:50,fill:'#d2f7e7'});
    }else if(which==='badge'){
      createShape('ellipse',{left:130,top:120,rx:375,ry:375,fill:'#7a4ead'});
      createShape('ellipse',{left:195,top:180,rx:310,ry:310,fill:'#ffdfaa'});
      createShape('star',{left:410,top:240,fill:'#ff936e'});
      createShape('text',{left:255,top:535,text:'LISTPULL',fontSize:90,fill:'#503574'});
      createShape('text',{left:305,top:655,text:'CREATIVE STUDIO',fontSize:43,fill:'#704687'});
    }else{
      createShape('rect',{left:75,top:85,width:930,height:910,rx:45,ry:45,fill:'#563b89'});
      createShape('ellipse',{left:620,top:145,rx:170,ry:170,fill:'#fcac74'});
      createShape('star',{left:150,top:165,fill:'#ffd57b'});
      createShape('text',{left:120,top:440,text:'MAKE IT',fontSize:140,fill:'#ffffff'});
      createShape('text',{left:120,top:630,text:'MAGICAL.',fontSize:130,fill:'#ffcaaf'});
    }
    canvas.discardActiveObject();syncInputs();renderLayers();
    noteMutation('Template loaded. Customize every shape, word, color and layer.');
  }
  function renderLayers(){
    const holder=$('creative-layers');holder.replaceChildren();
    const selectedObject=selected();
    const list=objects().slice().reverse();
    text('creative-layer-count',list.length+' layers');
    for(const obj of list){
      const li=document.createElement('li');li.className='creative-layer'+(obj===selectedObject?' is-active':'');
      li.dataset.layerId=String(objects().indexOf(obj));li.draggable=true;
      const icon=document.createElement('span');icon.textContent=obj.type==='i-text'||obj.type==='textbox'?'T':obj.type==='image'?'▧':'◆';icon.setAttribute('aria-hidden','true');
      const name=document.createElement('span');name.className='creative-layer-name';name.textContent=obj.name||obj.type;
      const eye=document.createElement('button');eye.type='button';eye.textContent=obj.visible===false?'○':'◉';
      eye.setAttribute('aria-label','Toggle visibility for '+name.textContent);eye.dataset.layerVisibility=obj.visible!==false;
      eye.addEventListener('click',event=>{event.stopPropagation();obj.visible=obj.visible===false;noteMutation('Layer visibility updated.');});
      const lock=document.createElement('button');lock.type='button';lock.textContent=obj.selectable===false?'🔒':'▣';
      lock.setAttribute('aria-label','Lock or unlock '+name.textContent);
      lock.addEventListener('click',event=>{event.stopPropagation();const locked=obj.selectable!==false;obj.set({selectable:!locked,evented:!locked});noteMutation('Layer lock updated.');});
      li.append(icon,name,eye,lock);
      li.addEventListener('click',()=>{if(obj.selectable===false)return;canvas.setActiveObject(obj);canvas.requestRenderAll();syncInputs();renderLayers();});
      li.addEventListener('dragstart',event=>{event.dataTransfer.setData('text/plain',String(objects().indexOf(obj)));});
      li.addEventListener('dragover',event=>event.preventDefault());
      li.addEventListener('drop',event=>{
        event.preventDefault();const from=Number(event.dataTransfer.getData('text/plain'));
        const moved=objects()[from];if(!moved)return;
        canvas.moveObjectTo(moved,objects().indexOf(obj));noteMutation('Layer order changed.');
      });
      holder.append(li);
    }
  }
  function syncInputs(){
    const o=selected();
    text('creative-selected-label',o?(o.name||o.type):'Select artwork');
    if(!o)return;
    ignore=true;
    try{
      const fields={
        'creative-x':o.left,'creative-y':o.top,'creative-w':o.getScaledWidth(),'creative-h':o.getScaledHeight(),
        'creative-angle':o.angle,'creative-z':objects().indexOf(o),
        'creative-skewx':o.skewX,'creative-skewy':o.skewY,'creative-opacity':Math.round((o.opacity??1)*100),
        'creative-stroke-width':o.strokeWidth||0,'creative-depth':o.depthValue||0
      };
      for(const [id,value]of Object.entries(fields))$(id).value=num(value);
      text('creative-opacity-value',$('creative-opacity').value+'%');
      const fill=o.fillDefinition||defaultStops;
      $('creative-fill-mode').value=fill.type||'solid';$('creative-color1').value=fill.first||'#8b65e5';
      $('creative-color2').value=fill.second||'#f6aa6c';
      $('creative-fill-alpha').value=Math.round((fill.alpha??1)*100);
      text('creative-fill-alpha-value',$('creative-fill-alpha').value+'%');
      $('creative-gradient-angle').value=num(fill.angle);
      if(typeof o.stroke==='string'&&/^#[0-9a-f]{6}$/i.test(o.stroke))$('creative-stroke').value=o.stroke;
      const sh=o.shadowSettings||{color:'#10162b',alpha:.35,blur:12,offsetX:8,offsetY:8};
      $('creative-shadow-color').value=sh.color; $('creative-shadow-opacity').value=Math.round(sh.alpha*100);
      $('creative-shadow-blur').value=sh.blur;$('creative-shadow-x').value=sh.offsetX;$('creative-shadow-y').value=sh.offsetY;
      const fx=o.effectSettings||{};
      for(const name of ['brightness','contrast','saturation','blur','grayscale','gamma-r','gamma-g','gamma-b']){
        const field=$('creative-'+name),v=fx[name]??(name.startsWith('gamma')?100:0);
        field.value=v;const output=field.parentElement.querySelector('output');if(output)output.textContent=v;
      }
    }finally{ignore=false}
  }
  function hexToRgba(hex,alpha){
    const v=String(hex||'#000000').replace('#','');const parsed=parseInt(v,16);
    if(!/^[0-9a-f]{6}$/i.test(v))return 'rgba(0,0,0,1)';
    return 'rgba('+((parsed>>16)&255)+','+((parsed>>8)&255)+','+(parsed&255)+','+clamp(alpha,0,1)+')';
  }
  function applyFill(){
    const o=selected();if(!o||o.type==='image')return;
    const mode=$('creative-fill-mode').value;
    const a=$('creative-color1').value,b=$('creative-color2').value;
    const opacity=val('creative-fill-alpha',100)/100,angle=val('creative-gradient-angle')*Math.PI/180;
    const fill={type:mode,first:a,second:b,angle:val('creative-gradient-angle'),alpha:opacity};
    o.fillDefinition=fill;o.fillOpacity=opacity;
    if(mode==='solid')o.fill=hexToRgba(a,opacity);
    else{
      const w=Math.max(1,o.width||100),h=Math.max(1,o.height||100);
      const coords=mode==='radial'?
        {x1:w/2,y1:h/2,r1:0,x2:w/2,y2:h/2,r2:Math.max(w,h)/2}:
        {x1:w/2-Math.cos(angle)*w/2,y1:h/2-Math.sin(angle)*h/2,
          x2:w/2+Math.cos(angle)*w/2,y2:h/2+Math.sin(angle)*h/2};
      o.fill=new F.Gradient({type:mode==='radial'?'radial':'linear',coords,
        colorStops:[{offset:0,color:hexToRgba(a,opacity)},{offset:1,color:hexToRgba(b,opacity)}]});
    }
    o.setCoords();noteMutation('Fill updated.');
  }
  function applyShadow(){
    const o=selected();if(!o)return;
    const color=$('creative-shadow-color').value,alpha=val('creative-shadow-opacity')/100,
      blur=val('creative-shadow-blur'),offsetX=val('creative-shadow-x'),offsetY=val('creative-shadow-y');
    o.shadowSettings={color,alpha,blur,offsetX,offsetY};
    o.shadow=alpha?new F.Shadow({color:hexToRgba(color,alpha),blur,offsetX,offsetY}):null;
    noteMutation('Shadow updated.');
  }
  function applyProperties(changed){
    const o=selected();if(!o||ignore)return;
    const n=val(changed);
    if(changed==='creative-w'||changed==='creative-h'){
      if(n<=0){status('Width and height must be positive.');return;}
      o.set(changed==='creative-w'?'scaleX':'scaleY',n/(changed==='creative-w'?Math.max(.01,o.width):Math.max(.01,o.height)));
    }else if(changed==='creative-z'){
      const index=clamp(Math.round(n),0,objects().length-1);
      canvas.moveObjectTo(o,index);o.zValue=index;
    }else{
      const map={'creative-x':'left','creative-y':'top','creative-angle':'angle',
        'creative-skewx':'skewX','creative-skewy':'skewY'};
      if(map[changed])o.set(map[changed],n);
      else if(changed==='creative-opacity')o.set('opacity',clamp(n/100,0,1));
      else if(changed==='creative-stroke-width')o.set({strokeWidth:Math.max(0,n)});
      else if(changed==='creative-stroke')o.set({stroke:$('creative-stroke').value});
    }
    if(changed==='creative-opacity')text('creative-opacity-value',n+'%');
    o.setCoords();noteMutation('Artwork property updated.');
  }
  function filterImage(){
    const o=selected();if(!o||o.type!=='image'){status('Select an image layer to apply photo effects.');return;}
    const FX=F.filters||F.FabricImage?.filters||F.Image?.filters||{};
    const valFx={};const chosen=[];
    for(const name of ['brightness','contrast','saturation','blur','grayscale','gamma-r','gamma-g','gamma-b']){
      valFx[name]=val('creative-'+name,name.startsWith('gamma')?100:0);
      const field=$('creative-'+name),output=field.parentElement.querySelector('output');
      if(output)output.textContent=valFx[name];
    }
    const add=(name,value,field)=>{if(FX[name]&&value)chosen.push(new FX[name]({[field]:value}));};
    add('Brightness',valFx.brightness/100,'brightness');
    add('Contrast',valFx.contrast/100,'contrast');
    add('Saturation',valFx.saturation/100,'saturation');
    add('Blur',valFx.blur/100,'blur');
    if(valFx.grayscale>0&&FX.Grayscale)chosen.push(new FX.Grayscale());
    if((valFx['gamma-r']!==100||valFx['gamma-g']!==100||valFx['gamma-b']!==100)&&FX.Gamma)
      chosen.push(new FX.Gamma({gamma:[valFx['gamma-r']/100,valFx['gamma-g']/100,valFx['gamma-b']/100]}));
    o.effectSettings=valFx;
    o.filters=chosen;if(typeof o.applyFilters==='function')o.applyFilters();
    canvas.requestRenderAll();saveState();status('Photo effects applied. Use sliders to refine.');
  }
  function switchTab(name){
    all('[data-creative-tab]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.creativeTab===name)));
    all('[data-creative-panel]').forEach(panel=>panel.hidden=panel.dataset.creativePanel!==name);
  }
  function addObject(obj,name){
    stamp(obj,name);canvas.add(obj);canvas.setActiveObject(obj);syncInputs();noteMutation(name+' imported as an editable layer.');
  }
  function sanitizeSVG(raw){
    const xml=new DOMParser().parseFromString(raw,'image/svg+xml');
    if(xml.querySelector('parsererror'))throw Error('Invalid SVG file.');
    const root=xml.documentElement;
    if(root.localName!=='svg')throw Error('Selected file is not SVG artwork.');
    const forbidden=new Set(['script','foreignObject','iframe','object','embed','audio','video','animate','set']);
    for(const e of [...root.querySelectorAll('*')]){
      if(forbidden.has(e.localName)){e.remove();continue;}
      for(const a of [...e.attributes]){
        const key=a.name.toLowerCase(),value=a.value;
        if(key.startsWith('on')||((key==='href'||key==='xlink:href')&&!value.startsWith('#'))||
          /url\s*\(\s*['"]?\s*(?:https?:|data:|javascript:)/i.test(value)||/javascript:/i.test(value)){
          e.removeAttribute(a.name);
        }
      }
    }
    return new XMLSerializer().serializeToString(root);
  }
  async function importFiles(fileList){
    for(const file of [...fileList]){
      if(file.name.toLowerCase().endsWith('.json')){await loadState(await file.text());saveState();continue;}
      if(file.type==='image/svg+xml'||file.name.toLowerCase().endsWith('.svg')){
        const sanitized=sanitizeSVG(await file.text());
        const parsed=await F.loadSVGFromString(sanitized);
        const imported=parsed.objects||[];
        if(!imported.length)throw Error('No SVG shapes were found to import.');
        for(const obj of imported){if(!obj)continue;obj.set({left:(obj.left||0)+50,top:(obj.top||0)+50});
          addObject(obj,file.name.replace(/\.svg$/i,'')+' · '+obj.type);}
        lastName=file.name.replace(/\.svg$/i,'');continue;
      }
      if(!file.type.startsWith('image/'))continue;
      const url=URL.createObjectURL(file);
      try{
        const element=new Image();element.decoding='async';
        element.src=url;await element.decode();
        const image=new F.FabricImage(element,{left:40,top:40});
        const factor=Math.min(1,Math.min(docW*.78/image.width,docH*.78/image.height));
        image.scale(factor);
        image.sourceName=file.name;
        addObject(image,file.name);
        lastName=file.name.replace(/\.[^.]+$/,'');
      }finally{URL.revokeObjectURL(url)}
    }
  }
  async function exportArtwork(){
    const format=$('creative-export-format').value;
    const scale=val('creative-export-scale',1);
    if(scale<=0)throw Error('Export scale must be positive.');
    const title=lastName.replace(/[^\w-]/g,'-').slice(0,70)||'artwork';
    const wasZoom=zoom;
    try{
      canvas.discardActiveObject();
      applyZoom(1);
      canvas.requestRenderAll();
      if(format==='svg'){
        download(new Blob([canvas.toSVG()],{type:'image/svg+xml;charset=utf-8'}),title+'.svg');
      }else{
        const uri=canvas.toDataURL({format,quality:.94,multiplier:scale,enableRetinaScaling:false});
        const response=await fetch(uri);
        download(await response.blob(),title+'.'+(format==='jpeg'?'jpg':format));
      }
      status('Exported '+title+'.'+(format==='jpeg'?'jpg':format)+'.');
    }finally{applyZoom(wasZoom);canvas.requestRenderAll();}
  }
  function download(blob,name){
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
  async function groupSelection(){
    const o=selected();if(!o)return;
    if(o.type==='activeSelection'||o.type==='activeselection'){
      const group=new F.Group(o.getObjects());
      canvas.remove(...o.getObjects());canvas.discardActiveObject();
      stamp(group,'Grouped artwork');canvas.add(group);canvas.setActiveObject(group);
      noteMutation('Artwork grouped. Resize or move the group together.');
    }
  }
  function ungroupSelection(){
    const o=selected();if(!o||o.type!=='group')return;
    const elements=o.removeAll();
    canvas.remove(o);
    for(const child of elements){child.set({left:child.left+(o.left||0),top:child.top+(o.top||0)});canvas.add(child);}
    canvas.discardActiveObject();noteMutation('Group separated into editable layers.');
  }
  async function duplicateSelection(){
    const o=selected();if(!o)return;
    const copy=await o.clone(extras);copy.set({left:(o.left||0)+28,top:(o.top||0)+28});
    stamp(copy,(o.name||'Layer')+' copy');canvas.add(copy);canvas.setActiveObject(copy);
    noteMutation('Layer duplicated.');
  }
  async function extrudeSelection(){
    const o=selected();if(!o)return;
    const depth=Math.round(val('creative-depth'));
    if(depth<=0){status('Enter a positive depth value first.');return;}
    const steps=clamp(Math.ceil(depth/3),2,24),layers=[];
    for(let i=steps;i>0;i--){
      const copy=await o.clone(extras);
      copy.set({left:(o.left||0)+depth*(i/steps)*.65,top:(o.top||0)+depth*(i/steps)*.48,
        fill:'#293149',stroke:'#1b2740',opacity:Math.max(.15,(o.opacity||1)*.72),shadow:null,
        selectable:false,evented:false});
      layers.push(copy);
    }
    const top=await o.clone(extras);layers.push(top);
    const index=objects().indexOf(o);canvas.remove(o);
    for(let i=0;i<layers.length;i++)canvas.insertAt(index+i,i===steps?stamp(layers[i],o.name||'Extruded artwork'):layers[i]);
    canvas.setActiveObject(layers.at(-1));layers.at(-1).depthValue=depth;
    noteMutation('Created editable 2.5D depth layers with front-face controls.');
  }
  function tool(action){
    const o=selected();
    if(['rect','ellipse','triangle','star','line','text'].includes(action)){createShape(action);return;}
    if(action==='select'||action==='brush'){
      brush=action==='brush';canvas.isDrawingMode=brush;
      if(brush){
        canvas.freeDrawingBrush=new F.PencilBrush(canvas);
        canvas.freeDrawingBrush.width=6;canvas.freeDrawingBrush.color='#ffaa71';
      }
      all('[data-creative="select"],[data-creative="brush"]').forEach(btn=>btn.setAttribute('aria-pressed',String(btn.dataset.creative===action)));
      status(brush?'Drag on the canvas to draw editable freehand paths.':'Select any object to move, resize or style it.');return;
    }
    if(action==='undo'){undoRedo(-1);return;}
    if(action==='redo'){undoRedo(1);return;}
    if(action==='fit'){applyZoom(fitRatio());return;}
    if(action==='zoomin'){applyZoom(zoom*1.15);return;}
    if(action==='zoomout'){applyZoom(zoom/1.15);return;}
    if(action==='resize'){setSize(Math.round(val('creative-document-width')),Math.round(val('creative-document-height')));return;}
    if(action==='background'){applyBackground();return;}
    if(action==='new'){
      if(objects().length&&!confirm('Start a new blank project? Export or save your current design first.'))return;
      canvas.clear();canvas.backgroundColor='#ffffff';docW=1200;docH=800;applyZoom(fitRatio());noteMutation('New project ready.');return;
    }
    if(action==='demo'){doDemo('social');return;}
    if(action==='save'){
      const data={width:docW,height:docH,background:canvas.backgroundColor,artwork:canvas.toObject(extras)};
      download(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),lastName+'.listpull.json');
      status('Project saved as editable JSON.');return;
    }
    if(action==='export'){exportArtwork().catch(e=>status('Export failed: '+e.message));return;}
    if(action==='delete'&&o){canvas.remove(...activeMany());canvas.discardActiveObject();noteMutation('Selection deleted.');return;}
    if((action==='duplicate'||action==='clone')&&o){duplicateSelection();return;}
    if(action==='group'){groupSelection();return;}
    if(action==='ungroup'){ungroupSelection();return;}
    if(action==='front'&&o){canvas.bringObjectForward(o);noteMutation('Layer moved forward.');return;}
    if(action==='back'&&o){canvas.sendObjectBackwards(o);noteMutation('Layer moved backward.');return;}
    if(action==='fliph'&&o){o.set({flipX:!o.flipX});noteMutation('Layer flipped horizontally.');return;}
    if(action==='flipv'&&o){o.set({flipY:!o.flipY});noteMutation('Layer flipped vertically.');return;}
    if(action==='lock'&&o){o.set({selectable:!o.selectable,evented:!o.evented});canvas.discardActiveObject();noteMutation('Layer lock updated.');return;}
    if(action==='extrude'){extrudeSelection().catch(e=>status(e.message));return;}
    if(action==='filter-reset'||action==='filter-punch'||action==='filter-mono'){
      if(!o||o.type!=='image'){status('Select an image layer before applying photo effects.');return;}
      const values=action==='filter-punch'?{brightness:12,contrast:18,saturation:28,blur:0,grayscale:0}:
        action==='filter-mono'?{brightness:4,contrast:10,saturation:-100,blur:0,grayscale:100}:
          {brightness:0,contrast:0,saturation:0,blur:0,grayscale:0};
      for(const [k,v]of Object.entries(values))$('creative-'+k).value=v;
      ['gamma-r','gamma-g','gamma-b'].forEach(k=>$('creative-'+k).value=100);
      filterImage();return;
    }
  }
  function applyBackground(){
    const mode=$('creative-background-mode').value,a=$('creative-background1').value,
      b=$('creative-background2').value,opacity=val('creative-background-opacity',100)/100;
    if(mode==='transparent')canvas.backgroundColor='rgba(0,0,0,0)';
    else if(mode==='solid')canvas.backgroundColor=hexToRgba(a,opacity);
    else canvas.backgroundColor=new F.Gradient({type:'linear',
      coords:{x1:0,y1:0,x2:docW,y2:docH},
      colorStops:[{offset:0,color:hexToRgba(a,opacity)},{offset:1,color:hexToRgba(b,opacity)}]});
    noteMutation('Background updated.');
  }
  // Public integration API used by AI Agent after explicit review by the visitor.
  function addDesignShapes(design){
    if(!design||!Array.isArray(design.shapes))throw Error('Design does not contain editable shapes.');
    for(const item of design.shapes.slice(0,30)){
      const type=String(item.type||'rect').toLowerCase();
      if(!['rect','ellipse','triangle','star','text'].includes(type))continue;
      const settings={left:clamp(Number(item.x)||0,-docW,docW*3),
        top:clamp(Number(item.y)||0,-docH,docH*3),
        fill:/^#[0-9a-f]{6}$/i.test(item.fill||'')?item.fill:'#a68fe4'};
      if(type==='text'){settings.text=String(item.text||'Your headline').slice(0,220);settings.fontSize=clamp(Number(item.fontSize)||54,4,600);}
      if(item.w>0&&type!=='text')settings.width=clamp(Number(item.w),1,docW*3);
      if(item.h>0&&type!=='text')settings.height=clamp(Number(item.h),1,docH*3);
      createShape(type,settings);
    }
    canvas.discardActiveObject();noteMutation('AI-assisted editable design added. Refine any layer in the inspector.');
  }
  window.ListPullCreative=Object.freeze({
    inspect:()=>({width:docW,height:docH,layers:objects().map(o=>({
      type:o.type,name:o.name,x:num(o.left),y:num(o.top),width:num(o.getScaledWidth()),
      height:num(o.getScaledHeight()),z:objects().indexOf(o)}))}),
    applyDesign:addDesignShapes,
    exportPreview:()=>canvas.toDataURL({format:'png',multiplier:.25})
  });
  // UI binding.
  all('[data-creative]').forEach(b=>b.addEventListener('click',()=>tool(b.dataset.creative)));
  all('[data-template]').forEach(b=>b.addEventListener('click',()=>doDemo(b.dataset.template)));
  all('[data-size]').forEach(b=>b.addEventListener('click',()=>{
    const [w,h]=b.dataset.size.split(',').map(Number);setSize(w,h);
  }));
  all('[data-creative-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.creativeTab)));
  for(const field of ['x','y','w','h','z','angle','skewx','skewy','opacity','stroke','stroke-width']){
    const input=$('creative-'+field);if(!input)continue;
    input.addEventListener('change',()=>applyProperties(input.id));
    if(field==='opacity')input.addEventListener('input',()=>text('creative-opacity-value',input.value+'%'));
  }
  ['fill-mode','color1','color2','fill-alpha','gradient-angle'].forEach(field=>{
    $('creative-'+field).addEventListener('change',applyFill);
  });
  $('creative-fill-alpha').addEventListener('input',()=>text('creative-fill-alpha-value',$('creative-fill-alpha').value+'%'));
  ['shadow-color','shadow-opacity','shadow-blur','shadow-x','shadow-y'].forEach(f=>{
    $('creative-'+f).addEventListener('change',applyShadow);
  });
  for(const f of ['brightness','contrast','saturation','blur','grayscale','gamma-r','gamma-g','gamma-b']){
    $('creative-'+f).addEventListener('change',filterImage);
    $('creative-'+f).addEventListener('input',()=>{
      const input=$('creative-'+f),out=input.parentElement.querySelector('output');if(out)out.textContent=input.value;
    });
  }
  canvas.on('selection:created',()=>{syncInputs();renderLayers();});
  canvas.on('selection:updated',()=>{syncInputs();renderLayers();});
  canvas.on('selection:cleared',()=>{syncInputs();renderLayers();});
  canvas.on('object:modified',()=>{syncInputs();noteMutation('Layer updated.');});
  canvas.on('path:created',event=>{stamp(event.path,'Freehand drawing');noteMutation('Brush stroke added.');});
  canvas.on('text:changed',()=>{saveState();});
  const file=$('creative-upload'),open=$('creative-open'),area=$('creative-drop');
  file.addEventListener('change',()=>importFiles(file.files).catch(e=>status(e.message)).finally(()=>{file.value='';}));
  open.addEventListener('change',async()=>{
    try{if(open.files[0]){await loadState(await open.files[0].text());saveState();status('Editable project opened.');}}
    catch(e){status('Could not open project: '+e.message)}finally{open.value='';}
  });
  area.addEventListener('dragover',event=>{event.preventDefault();area.classList.add('is-dragging');$('creative-drop-hint').hidden=false;});
  area.addEventListener('dragleave',()=>{area.classList.remove('is-dragging');$('creative-drop-hint').hidden=true;});
  area.addEventListener('drop',event=>{event.preventDefault();area.classList.remove('is-dragging');$('creative-drop-hint').hidden=true;
    importFiles(event.dataTransfer.files).catch(e=>status(e.message));});
  document.addEventListener('paste',event=>{
    const files=[...(event.clipboardData?.items||[])].filter(i=>i.kind==='file').map(i=>i.getAsFile()).filter(Boolean);
    if(files.length)importFiles(files).catch(e=>status(e.message));
  });
  document.addEventListener('keydown',event=>{
    const tag=document.activeElement?.tagName?.toLowerCase();
    if(['input','textarea','select'].includes(tag)||event.altKey)return;
    const mod=event.ctrlKey||event.metaKey;
    if(mod&&event.key.toLowerCase()==='z'){event.preventDefault();undoRedo(event.shiftKey?1:-1);}
    if(mod&&event.key.toLowerCase()==='y'){event.preventDefault();undoRedo(1);}
    if(mod&&event.key.toLowerCase()==='d'){event.preventDefault();duplicateSelection();}
    if(['Delete','Backspace'].includes(event.key)&&selected()){event.preventDefault();tool('delete');}
    if(event.key.toLowerCase()==='v')tool('select');
    if(event.key.toLowerCase()==='b')tool('brush');
    if(event.key.startsWith('Arrow')&&selected()){
      const o=selected(),delta=event.shiftKey?10:1;
      if(event.key==='ArrowLeft')o.left-=delta;if(event.key==='ArrowRight')o.left+=delta;
      if(event.key==='ArrowUp')o.top-=delta;if(event.key==='ArrowDown')o.top+=delta;
      o.setCoords();event.preventDefault();syncInputs();noteMutation('Layer nudged.');
    }
  });
  window.addEventListener('resize',()=>{if(!document.activeElement?.closest('.creative-zoom'))applyZoom(fitRatio());});
  doDemo('social');
  // Browser-only recovery. We do not silently replace the start template with previously saved art.
  try{
    const prior=localStorage.getItem('listpull.creative.project');
    if(prior&&prior.length<3_500_000){
      const button=document.createElement('button');button.type='button';
      button.textContent='Restore saved work';button.className='creative-restore';
      button.addEventListener('click',async()=>{await loadState(prior);saveState();button.remove();status('Saved project restored.');});
      $('creative-status').after(button);
    }
  }catch(e){}
})();