/* Progressive enhancement only: all 48 article cards already exist in static HTML. */
(() => {
  const root = document.getElementById('stories');
  if (!root) return;
  const cards = [...root.querySelectorAll('.wildlife-story-card')];
  const buttons = [...root.querySelectorAll('[data-wildlife-filter]')];
  const input = document.getElementById('wildlife-story-search');
  const count = document.getElementById('wildlife-results-count');
  let active = 'all';
  const update = () => {
    const query = (input?.value || '').trim().toLocaleLowerCase();
    let visible = 0;
    for (const card of cards) {
      const categoryMatches = active === 'all' || card.dataset.topic === active;
      const textMatches = !query || card.textContent.toLocaleLowerCase().includes(query);
      card.hidden = !(categoryMatches && textMatches);
      if (!card.hidden) visible++;
    }
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.wildlifeFilter === active)));
    if (count) count.textContent = visible + (visible === 1 ? ' story' : ' stories');
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    active = button.dataset.wildlifeFilter || 'all';
    update();
  }));
  input?.addEventListener('input', update);
  update();
})();
