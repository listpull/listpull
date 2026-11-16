/* Expand or restore entire editing workspaces and the video program monitor. */
(() => {
  'use strict';
  const buttons=[...document.querySelectorAll('[data-fullscreen-target]')];
  if(!buttons.length)return;
  let fallback=null;
  const getTarget=button=>document.querySelector(button.dataset.fullscreenTarget);
  function refresh(){
    const active=document.fullscreenElement||fallback;
    for(const button of buttons){
      const target=getTarget(button),on=active===target;
      button.setAttribute('aria-pressed',String(on));
      button.textContent=on?'⤢ Exit full screen':button.dataset.fullscreenTarget==='.video-monitor'?'⛶ Preview':'⛶ Full screen';
    }
    window.dispatchEvent(new Event('resize'));
  }
  for(const button of buttons){
    const target=getTarget(button);
    if(!target)continue;
    button.addEventListener('click',async()=>{
      try{
        if(document.fullscreenElement===target){await document.exitFullscreen();}
        else if(fallback===target){target.classList.remove('studio-faux-fullscreen');fallback=null;}
        else if(target.requestFullscreen&&document.fullscreenEnabled!==false){
          if(fallback){fallback.classList.remove('studio-faux-fullscreen');fallback=null;}
          await target.requestFullscreen();
        }else{
          if(fallback)fallback.classList.remove('studio-faux-fullscreen');
          fallback=target;target.classList.add('studio-faux-fullscreen');
        }
      }catch(error){
        if(fallback)fallback.classList.remove('studio-faux-fullscreen');
        fallback=target;target.classList.add('studio-faux-fullscreen');
      }
      refresh();
    });
  }
  document.addEventListener('fullscreenchange',refresh);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(document.fullscreenElement){document.exitFullscreen?.().catch(()=>{});}
    if(fallback){fallback.classList.remove('studio-faux-fullscreen');fallback=null;refresh();}
  });
  refresh();
})();
