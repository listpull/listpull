/* Accessible navigation for ListPull's compact mobile-first site. */
(() => {
  const menu = document.querySelector('[data-labs-menu]');
  const trigger = document.querySelector('[data-labs-trigger]');
  const list = document.querySelector('[data-labs-list]');
  const toggle = document.querySelector('[data-nav-toggle]');
  const nav = document.querySelector('[data-nav-main]');
  const closeLabs = () => { if(trigger && list) { trigger.setAttribute('aria-expanded','false'); list.dataset.open='false'; } };
  if(trigger && list && menu) {
    trigger.addEventListener('click', () => {
      const open = trigger.getAttribute('aria-expanded') !== 'true';
      trigger.setAttribute('aria-expanded', String(open));
      list.dataset.open=String(open);
    });
    document.addEventListener('click', event => { if(!menu.contains(event.target)) closeLabs(); });
    document.addEventListener('keydown', event => {
      if(event.key==='Escape') { closeLabs(); if(document.activeElement && menu.contains(document.activeElement)) trigger.focus(); }
    });
    list.addEventListener('click', event => { if(event.target.closest('a')) closeLabs(); });
  }
  if(toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded',String(open));
      toggle.setAttribute('aria-label',open?'Close navigation':'Open navigation');
      nav.dataset.open=String(open);
    });
    nav.addEventListener('click', event => {
      if(event.target.closest('a')) { nav.dataset.open='false'; toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-label','Open navigation'); }
    });
    document.addEventListener('keydown', event => { if(event.key==='Escape') { nav.dataset.open='false';toggle.setAttribute('aria-expanded','false'); } });
  }
})();