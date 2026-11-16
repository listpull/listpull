/* User-controlled IDE panel resizing. Pointer, touch and keyboard. */
(() => {
  'use strict';
  const workspace=document.querySelector('.ai-workspace');
  if(!workspace)return;
  const sidebar=document.querySelector('.ai-preset-sidebar');
  const editor=document.querySelector('.ai-code-pane');
  const preview=document.querySelector('.ai-preview-pane');
  const grips=[
    {id:'ai-resize-sidebar',mode:'sidebar',axis:'x'},
    {id:'ai-resize-preview',mode:'preview',axis:'x'},
    {id:'ai-resize-chat',mode:'chat',axis:'y'}
  ];
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
  const desktop=()=>window.matchMedia('(min-width: 901px)').matches;
  let active=null;
  function getSize(mode){
    if(mode==='sidebar')return sidebar.getBoundingClientRect().width;
    if(mode==='preview')return preview.getBoundingClientRect().width;
    return document.querySelector('.ai-chat').getBoundingClientRect().height;
  }
  function bounds(mode){
    const width=workspace.clientWidth;
    if(mode==='sidebar')return [140,Math.min(365,width-getSize('preview')-325)];
    if(mode==='preview')return [300,Math.max(320,width-getSize('sidebar')-330)];
    return [225,Math.max(250,preview.clientHeight-185)];
  }
  function resize(mode,next){
    const [lo,hi]=bounds(mode),value=clamp(next,lo,Math.max(lo,hi));
    const prop=mode==='sidebar'?'--lp-sidebar-width':mode==='preview'?'--lp-preview-width':'--lp-chat-height';
    workspace.style.setProperty(prop,Math.round(value)+'px');
  }
  for(const config of grips){
    const grip=document.getElementById(config.id);
    if(!grip)continue;
    grip.addEventListener('pointerdown',event=>{
      if(config.axis==='x'&&!desktop())return;
      if(event.button!==0&&event.pointerType==='mouse')return;
      active={id:config.id,pointerId:event.pointerId,mode:config.mode,
        coordinate:config.axis==='x'?event.clientX:event.clientY,
        start:getSize(config.mode)};
      grip.setPointerCapture(event.pointerId);
      grip.classList.add('is-dragging');
      event.preventDefault();
    });
    grip.addEventListener('pointermove',event=>{
      if(!active||active.id!==config.id||active.pointerId!==event.pointerId)return;
      const delta=(config.axis==='x'?event.clientX:event.clientY)-active.coordinate;
      resize(config.mode,active.start+(config.mode==='sidebar'?delta:-delta));
    });
    const end=event=>{
      if(active?.id!==config.id||active.pointerId!==event.pointerId)return;
      active=null;grip.classList.remove('is-dragging');
    };
    grip.addEventListener('pointerup',end);
    grip.addEventListener('pointercancel',end);
    grip.addEventListener('lostpointercapture',end);
    grip.addEventListener('keydown',event=>{
      if(config.axis==='x'&&!desktop())return;
      const keys=config.axis==='x'?['ArrowLeft','ArrowRight']:['ArrowUp','ArrowDown'];
      if(!keys.includes(event.key))return;
      const direction=event.key===keys[0]?-1:1;
      resize(config.mode,getSize(config.mode)+(config.mode==='sidebar'?direction:-direction)*(event.shiftKey?40:20));
      event.preventDefault();
    });
    grip.title=config.axis==='x'?'Drag left/right to resize panels; arrow keys also work.':
      'Drag up/down to resize preview and AI chat; arrow keys also work.';
  }
})();
