/* Shared ListPull navigation and application launcher.
 * Single source of truth for every public-facing page. Vanilla JS; no framework or account needed. */
(() => {
  'use strict';

  const art=(markup)=>'<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">'+markup+'</svg>';
  const icons={
    studio:art('<path d="m16 3 3.6 9.4L29 16l-9.4 3.6L16 29l-3.6-9.4L3 16l9.4-3.6Z"/><path d="m25 2 1 3 3 1-3 1-1 3-1-3-3-1 3-1Z"/>'),
    creative:art('<rect x="4" y="5" width="24" height="22" rx="4"/><circle cx="12" cy="12" r="2.3"/><path d="m5 23 8-8 6 6 4-4 5 5"/><path d="m22 8 4 4"/>'),
    video:art('<rect x="4" y="11" width="24" height="17" rx="3"/><path d="M4 11 8 4h20l-4 7M10 4l-4 7M20 4l-4 7"/><path d="m14 16 8 4-8 4Z"/>'),
    ai:art('<path d="M16 3c-5 0-5 5-5 5s-6-1-6 5c0 3 2 4 2 4s-2 2-1 5c1 4 6 4 6 4s1 3 4 3 4-3 4-3 6 0 6-4c1-3-1-5-1-5s2-1 2-4c0-6-6-5-6-5s0-5-5-5Z"/><path d="M16 4v24M10 12l6 4 6-4M10 22l6-4 6 4"/>'),
    ide:art('<rect x="3" y="5" width="26" height="22" rx="4"/><path d="M3 11h26M12 17l-4 3 4 3M20 17l4 3-4 3M18 15l-3 10"/>'),
    strategy:art('<circle cx="7" cy="23" r="3"/><circle cx="16" cy="8" r="3"/><circle cx="26" cy="19" r="3"/><path d="m9 20 5-9m5-1 5 7M10 23l13-4"/>'),
    forecast:art('<path d="M5 5v22h23M8 22l6-8 5 4 8-12M22 6h5v5"/>'),
    wildlife:art('<path d="M27 5C13 4 5 12 5 21a6 6 0 0 0 6 6c9 0 17-9 16-22Z"/><path d="M6 27c5-8 10-11 18-17M13 18l-1-7M18 15l7 1"/>'),
    engineering:art('<rect x="10" y="10" width="12" height="12" rx="2"/><path d="M13 3v7m6-7v7m-6 12v7m6-7v7M3 13h7m-7 6h7m12-6h7m-7 6h7"/><circle cx="16" cy="16" r="3"/>'),
    labs:art('<rect x="4" y="4" width="10" height="10" rx="2"/><rect x="18" y="4" width="10" height="10" rx="2"/><rect x="4" y="18" width="10" height="10" rx="2"/><rect x="18" y="18" width="10" height="10" rx="2"/>')
  };
  // First product: Studio. Final product: Labs. Both conditions apply in
  // navbar, dropdown, app strip and the public Labs directory.
  const apps=[
    {id:'studio',name:'ListPull Studio',short:'Studio',href:'/studio.html',tagline:'Open the creative and technical workspaces'},
    {id:'creative',name:'Creative Editor',short:'Images & SVG',href:'/studio/image-editor.html',tagline:'Edit layered images, graphics and vector artwork'},
    {id:'video',name:'Video Editor',short:'Video',href:'/studio/video-editor.html',tagline:'Edit footage, titles, sound and timelines'},
    {id:'ai',name:'AI Agent',short:'AI Agent',href:'/studio/ai.html#assistant',tagline:'Ask the live assistant about working code'},
    {id:'ide',name:'Code IDE',short:'Code IDE',href:'/studio/ai.html#code-editor',tagline:'Edit, execute and preview a browser application'},
    {id:'strategy',name:'Business Insights',short:'Insights',href:'/studio/strategy.html',tagline:'Explore interactive data and outcomes'},
    {id:'forecast',name:'Forecast Lab',short:'Forecast',href:'/studio/forecast.html',tagline:'Explore trends and run visual forecasts'},
    {id:'blobby',name:'Blobby',short:'Blobby',href:'/blobby.html',tagline:'Play Blobby’s Woodland Wonder'},
    {id:'wildlife',name:'Wildlife Media',short:'Wildlife',href:'/labs.html#wildlife',tagline:'Explore nature stories and wildlife content'},
    {id:'home',name:'ListPull Home',short:'ListPull',href:'/',tagline:'Explore everything ListPull creates'},
    {id:'engineering',name:'Engineering',short:'Engineering',href:'/engineering.html',tagline:'Software, cloud and AI integration services'},
    {id:'labs',name:'ListPull Labs',short:'Labs',href:'/labs.html',tagline:'Browse our applications, games and media'}
  ];
  const iconFor=(id)=>{
    if(id==='blobby')return '<img src="/blobby-no-bg.webp" width="42" height="42" loading="lazy" alt="">';
    if(id==='home')return '<img src="/favicon.ico" width="42" height="42" loading="lazy" alt="">';
    return icons[id]||icons.studio;
  };
  const current=(href)=>{
    const path=location.pathname;
    if(href==='/')return path==='/';
    if(href.includes('#'))return path===href.split('#')[0]&&location.hash==='#'+href.split('#')[1];
    return path===href;
  };
  const appLink=(app,kind)=>{
    const active=current(app.href)?' aria-current="page"':'';
    return '<a class="lp-app-tile lp-app-tile-'+kind+' lp-app-'+app.id+'" href="'+app.href+'" title="'+app.tagline+'"'+active+'>'+
      '<span class="lp-app-icon" aria-hidden="true">'+iconFor(app.id)+'</span>'+
      '<span class="lp-app-name">'+(kind==='strip'?app.short:app.name)+'</span></a>';
  };
  function mount(){
    if(document.getElementById('lp-global-navigation'))return;
    const original=document.querySelector('.content-wrapper > nav.navbar, header.site-header, header.vector-header, header.video-header, header.creative-topbar, nav.navbar, header.site-header');
    if(!original)return;
    const host=document.createElement('div');host.id='lp-global-navigation';host.className='lp-global-navigation';
    host.innerHTML=
      '<header class="lp-site-header">'+
        '<nav class="lp-nav" aria-label="Main navigation">'+
          '<a class="lp-brand" href="/" aria-label="ListPull home"><img src="/favicon.ico" width="42" height="42" alt=""><span>ListPull</span></a>'+
          '<div class="lp-nav-links">'+
            '<a href="/studio.html" class="lp-nav-studio">ListPull Studio</a>'+
            '<a href="/about-blobby.html">Meet Blobby</a>'+
            '<a href="/#wildlife">Wildlife Media</a>'+
            '<a href="/#community">Community</a>'+
            '<a href="/engineering.html">Engineering</a>'+
          '</div>'+
          '<div class="lp-nav-actions">'+
            '<div class="lp-more-menu"><button class="lp-more-button" type="button" aria-expanded="false" aria-controls="lp-more-links">More</button>'+
              '<div id="lp-more-links" class="lp-more-links" hidden>'+
                '<a href="/about-blobby.html">Meet Blobby</a><a href="/#wildlife">Wildlife Media</a>'+
                '<a href="/#community">Community</a><a href="/engineering.html">Engineering</a><a href="/contact/">Contact</a>'+
              '</div></div>'+
            '<div class="lp-labs-menu" data-labs-menu>'+
              '<button class="lp-labs-trigger" data-labs-trigger type="button" aria-controls="labs-options" aria-haspopup="true" aria-expanded="false">'+
                'ListPull Labs <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="m5 8 5 5 5-5"/></svg>'+
              '</button>'+
              '<div class="lp-app-popover" id="labs-options" data-labs-list data-open="false" hidden>'+
                '<div class="lp-app-popover-header"><div><strong>Explore ListPull</strong><small>Apps, games & experiences</small></div>'+
                  '<button type="button" class="lp-close-menu" aria-label="Close application menu">×</button></div>'+
                '<div class="lp-app-grid" role="group" aria-label="ListPull applications">'+
                   apps.map(a=>appLink(a,'menu')).join('')+
                '</div>'+
              '</div>'+
            '</div>'+
          '</div>'+
        '</nav>'+
      '</header>'+
      '<nav class="lp-app-strip" aria-label="Quick access to ListPull applications">'+
         '<div class="lp-app-strip-track"><span class="lp-strip-caption" aria-hidden="true">EXPLORE</span>'+
           apps.map(a=>appLink(a,'strip')).join('')+
         '</div>'+
      '</nav>';
    original.replaceWith(host);
    document.body.classList.add('lp-has-global-nav');
    const labButton=host.querySelector('.lp-labs-trigger'),popover=host.querySelector('.lp-app-popover');
    const moreButton=host.querySelector('.lp-more-button'),more=host.querySelector('.lp-more-links');
    function closeLabs(restoreFocus=false){
      popover.hidden=true;popover.dataset.open='false';
      labButton.setAttribute('aria-expanded','false');
      if(restoreFocus)labButton.focus();
    }
    function closeMore(restoreFocus=false){
      more.hidden=true;moreButton.setAttribute('aria-expanded','false');
      if(restoreFocus)moreButton.focus();
    }
    labButton.addEventListener('click',()=>{
      const shouldOpen=popover.hidden;
      closeMore();popover.hidden=!shouldOpen;popover.dataset.open=String(shouldOpen);
      labButton.setAttribute('aria-expanded',String(shouldOpen));
      if(shouldOpen)popover.querySelector('a')?.focus();
    });
    host.querySelector('.lp-close-menu').addEventListener('click',()=>closeLabs(true));
    moreButton.addEventListener('click',()=>{
      const open=more.hidden;closeLabs();more.hidden=!open;
      moreButton.setAttribute('aria-expanded',String(open));
    });
    document.addEventListener('click',event=>{
      if(!event.target.closest('.lp-labs-menu'))closeLabs();
      if(!event.target.closest('.lp-more-menu'))closeMore();
    });
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'){
        const inLabs=host.querySelector('.lp-labs-menu').contains(document.activeElement);
        const inMore=host.querySelector('.lp-more-menu').contains(document.activeElement);
        closeLabs(inLabs);closeMore(inMore);
      }
    });
    popover.addEventListener('click',event=>{
      if(event.target.closest('a'))closeLabs();
    });
    document.querySelectorAll('.footer-nav,.footer-links,.lp-labs-footer-links').forEach(footer=>{
      const links=[...footer.querySelectorAll(':scope > a[href]')];
      const studio=links.find(link=>link.getAttribute('href')==='/studio.html');
      const labs=links.find(link=>link.getAttribute('href')==='/labs.html');
      if(studio)footer.prepend(studio);
      if(labs)footer.append(labs);
    });
    document.querySelectorAll('[data-lp-icon]').forEach(element=>{
      const id=element.dataset.lpIcon;
      if(apps.some(app=>app.id===id))element.innerHTML=iconFor(id);
    });
    host.querySelectorAll('a[href]').forEach(link=>{
      if(current(link.getAttribute('href')))link.setAttribute('aria-current','page');
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
  // Data for shared Labs page treatments and future on-site product links.
  window.ListPullApplications=Object.freeze(apps.map(app=>Object.freeze({...app})));
})();