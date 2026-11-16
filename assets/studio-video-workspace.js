/* Video Studio viewport + dock layout.
 * No change to source or output resolution: only CSS preview dimensions and panel sizes change.
 * Run after studio-video.js; observe native canvas dimensions after project/import updates. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const monitor=$('video-preview'),stage=$('video-preview-stage'),canvas=$('video-canvas');
  const layout=document.querySelector('.video-work-layout'),center=document.querySelector('.video-center');
  const timeline=$('video-timeline'),readout=$('video-view-percent');
  if(!monitor||!stage||!canvas||!layout||!timeline||!readout)return;
  const clamp=(v,low,high)=>Math.max(low,Math.min(high,v));
  const desktop=()=>window.matchMedia('(min-width:901px)').matches;
  let scaleMode='fit',scale=1,panMode=false,pan=null,resize=null;
  const layoutKey='listpull.video.workspace.v3';
  const saveLayout=()=>{
    try{
      const width=id=>Math.round(document.getElementById(id).getBoundingClientRect().width);
      localStorage.setItem(layoutKey,JSON.stringify({
        assets:width('video-split-assets')&&Math.round($('.video-assets').getBoundingClientRect().width),
        inspector:Math.round($('.video-inspector').getBoundingClientRect().width),
        timeline:Math.round(timeline.getBoundingClientRect().height)
      }));
    }catch(e){}
  };
  function fitScale(){
    const w=Math.max(1,canvas.width),h=Math.max(1,canvas.height);
    // Match monitor's actual available content rectangle, including safe padding.
    return Math.min(Math.max(1,monitor.clientWidth-34)/w,Math.max(1,monitor.clientHeight-34)/h);
  }
  function showScale(keepCenter=true){
    const oldW=stage.getBoundingClientRect().width||1,oldH=stage.getBoundingClientRect().height||1;
    const centerX=(monitor.scrollLeft+monitor.clientWidth/2)/oldW;
    const centerY=(monitor.scrollTop+monitor.clientHeight/2)/oldH;
    const desired=scaleMode==='fit'?fitScale():scale;
    const next=Math.max(.005,desired);
    const w=canvas.width*next,h=canvas.height*next;
    // The canvas bitmap (and therefore export resolution) remains untouched.
    stage.style.width=w+'px';stage.style.height=h+'px';
    stage.dataset.scale=next.toFixed(6);
    readout.textContent=Math.round(next*100)+'%';
    readout.title='Preview zoom: '+(next*100).toFixed(1)+'% of output pixels. Source and export are unchanged.';
    $('video-view-fit').setAttribute('aria-pressed',String(scaleMode==='fit'));
    $('video-view-pan').setAttribute('aria-pressed',String(panMode));
    requestAnimationFrame(()=>{
      if(w<=monitor.clientWidth)monitor.scrollLeft=0;
      else monitor.scrollLeft=clamp((keepCenter?centerX:.5)*w-monitor.clientWidth/2,0,w);
      if(h<=monitor.clientHeight)monitor.scrollTop=0;
      else monitor.scrollTop=clamp((keepCenter?centerY:.5)*h-monitor.clientHeight/2,0,h);
    });
  }
  function setZoom(next,anchor){
    scaleMode='manual';scale=clamp(next,.005,16);
    if(anchor){
      const before=stage.getBoundingClientRect(),oldScale=Number(stage.dataset.scale)||1;
      const ax=(anchor.x-before.left)/Math.max(1,canvas.width*oldScale);
      const ay=(anchor.y-before.top)/Math.max(1,canvas.height*oldScale);
      showScale(false);
      requestAnimationFrame(()=>{
        const newRect=stage.getBoundingClientRect();
        monitor.scrollLeft+=(ax-.5)*newRect.width;
        monitor.scrollTop+=(ay-.5)*newRect.height;
      });
    }else showScale();
  }
  $('video-view-minus').addEventListener('click',()=>setZoom((Number(stage.dataset.scale)||fitScale())/1.25));
  $('video-view-plus').addEventListener('click',()=>setZoom((Number(stage.dataset.scale)||fitScale())*1.25));
  $('video-view-fit').addEventListener('click',()=>{scaleMode='fit';showScale(false);});
  $('video-view-actual').addEventListener('click',()=>setZoom(1));
  $('video-view-pan').addEventListener('click',()=>{
    panMode=!panMode;monitor.classList.toggle('is-pan-mode',panMode);showScale();
  });
  // Standard editing-room shortcut: Ctrl/Cmd + wheel zooms the monitor, not project dimensions.
  monitor.addEventListener('wheel',event=>{
    if(!(event.ctrlKey||event.metaKey))return;
    event.preventDefault();
    setZoom((Number(stage.dataset.scale)||fitScale())*(event.deltaY>0?.88:1.12),
      {x:event.clientX,y:event.clientY});
  },{passive:false});
  monitor.addEventListener('pointerdown',event=>{
    if(!(panMode||event.button===1)||event.target.closest('button'))return;
    pan={id:event.pointerId,x:event.clientX,y:event.clientY,left:monitor.scrollLeft,top:monitor.scrollTop};
    monitor.setPointerCapture(event.pointerId);
    monitor.classList.add('is-panning');
    // Prevent the clip-transform handler from mistaking a pan for an artwork move.
    event.stopImmediatePropagation();event.preventDefault();
  },true);
  monitor.addEventListener('pointermove',event=>{
    if(!pan||pan.id!==event.pointerId)return;
    monitor.scrollLeft=pan.left-(event.clientX-pan.x);
    monitor.scrollTop=pan.top-(event.clientY-pan.y);
    event.stopImmediatePropagation();event.preventDefault();
  },true);
  const endPan=event=>{
    if(!pan||pan.id!==event.pointerId)return;
    pan=null;monitor.classList.remove('is-panning');
    event.stopImmediatePropagation();
  };
  monitor.addEventListener('pointerup',endPan,true);
  monitor.addEventListener('pointercancel',endPan,true);
  monitor.addEventListener('lostpointercapture',()=>{pan=null;monitor.classList.remove('is-panning');});
  const RO=window.ResizeObserver;
  if(RO){
    const observer=new RO(()=>showScale());
    observer.observe(monitor);
  }
  new MutationObserver(changes=>{
    if(changes.some(x=>x.attributeName==='width'||x.attributeName==='height'))showScale(false);
  }).observe(canvas,{attributes:true,attributeFilter:['width','height']});
  document.addEventListener('fullscreenchange',()=>requestAnimationFrame(()=>showScale()));
  window.addEventListener('resize',()=>requestAnimationFrame(()=>showScale()));

  function panelSize(kind){
    return kind==='assets'?$('.video-assets').getBoundingClientRect().width:
      kind==='inspector'?$('.video-inspector').getBoundingClientRect().width:
        timeline.getBoundingClientRect().height;
  }
  function maxTimeline(){
    const headers=['.video-player-bar','.video-view-controls','.video-transport','.video-timeline-header','.video-status','#video-split-timeline'];
    const fixed=headers.reduce((n,sel)=>n+(center.querySelector(sel)?.getBoundingClientRect().height||0),0);
    return Math.max(160,center.clientHeight-fixed-155);
  }
  function resizePanel(kind,value){
    if(!desktop())return;
    if(kind==='timeline'){
      layout.style.setProperty('--video-timeline-height',Math.round(clamp(value,155,maxTimeline()))+'px');
      return;
    }
    const available=layout.clientWidth;
    const left=panelSize('assets'),right=panelSize('inspector');
    if(kind==='assets'){
      const max=Math.max(170,available-right-400);
      layout.style.setProperty('--video-assets-width',Math.round(clamp(value,170,Math.min(430,max)))+'px');
    }else{
      const max=Math.max(255,available-left-400);
      layout.style.setProperty('--video-inspector-width',Math.round(clamp(value,255,Math.min(550,max)))+'px');
    }
  }
  function configureGrip(id,kind,axis,sign){
    const grip=$(id);if(!grip)return;
    grip.addEventListener('pointerdown',event=>{
      if(!desktop()||event.button!==0)return;
      resize={kind,id:event.pointerId,start:axis==='x'?event.clientX:event.clientY,
        value:panelSize(kind),axis,sign};
      grip.classList.add('is-dragging');grip.setPointerCapture(event.pointerId);event.preventDefault();
    });
    grip.addEventListener('pointermove',event=>{
      if(!resize||resize.kind!==kind||resize.id!==event.pointerId)return;
      const next=axis==='x'?event.clientX:event.clientY;
      resizePanel(kind,resize.value+resize.sign*(next-resize.start));
      showScale();
    });
    const finish=event=>{
      if(!resize||resize.id!==event.pointerId||resize.kind!==kind)return;
      resize=null;grip.classList.remove('is-dragging');saveLayout();
    };
    grip.addEventListener('pointerup',finish);
    grip.addEventListener('pointercancel',finish);
    grip.addEventListener('lostpointercapture',()=>{if(resize?.kind===kind)resize=null;grip.classList.remove('is-dragging');});
    grip.addEventListener('keydown',event=>{
      if(!desktop())return;
      const keys=axis==='x'?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown'];
      if(!keys.includes(event.key))return;
      const direction=event.key===keys[0]?-1:1;
      resizePanel(kind,panelSize(kind)+direction*sign*(event.shiftKey?48:20));
      showScale();saveLayout();event.preventDefault();
    });
  }
  configureGrip('video-split-assets','assets','x',1);
  configureGrip('video-split-inspector','inspector','x',-1);
  configureGrip('video-split-timeline','timeline','y',-1);
  $('video-reset-layout').addEventListener('click',()=>{
    layout.style.removeProperty('--video-assets-width');
    layout.style.removeProperty('--video-inspector-width');
    layout.style.removeProperty('--video-timeline-height');
    try{localStorage.removeItem(layoutKey);}catch(e){}
    scaleMode='fit';showScale(false);
  });
  try{
    const saved=JSON.parse(localStorage.getItem(layoutKey)||'null');
    if(saved&&desktop()){
      if(Number.isFinite(saved.assets))resizePanel('assets',saved.assets);
      if(Number.isFinite(saved.inspector))resizePanel('inspector',saved.inspector);
      if(Number.isFinite(saved.timeline))resizePanel('timeline',saved.timeline);
    }
  }catch(e){}
  requestAnimationFrame(()=>showScale(false));
  window.ListPullVideoViewport=Object.freeze({
    fit:()=>{scaleMode='fit';showScale(false);},
    zoom:next=>setZoom(next),
    state:()=>({zoom:Number(stage.dataset.scale)||1,mode:scaleMode,
      output:[canvas.width,canvas.height],
      preview:[stage.getBoundingClientRect().width,stage.getBoundingClientRect().height]})
  });
})();