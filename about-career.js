(() => {
  document.querySelectorAll('[data-career-list]').forEach(list => {
    const entries = [...list.querySelectorAll('.career-entry')];
    const fine = matchMedia('(hover:hover) and (pointer:fine)');
    function expand(selected) {
      entries.forEach(entry => {
        const open = entry === selected;
        const button = entry.querySelector('.career-toggle');
        const panel = entry.querySelector('.career-panel');
        entry.classList.toggle('is-open', open);
        button.setAttribute('aria-expanded', String(open));
        panel.setAttribute('aria-hidden', String(!open));
        panel.inert = !open;
      });
    }
    entries.forEach(entry => {
      const button = entry.querySelector('.career-toggle');
      entry.addEventListener('pointerenter', event => {
        if (event.pointerType === 'mouse' && fine.matches) expand(entry);
      });
      button.addEventListener('click', () => expand(entry));
      button.addEventListener('focus', () => { if (button.matches(':focus-visible')) expand(entry); });
    });
    expand(entries.find(entry => entry.classList.contains('is-open')) || entries[0]);
  });
})();
