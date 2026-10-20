(() => {
  const page = document.body;
  if (!page.classList.contains('entry')) return;
  const root = document.documentElement;
  const content = document.querySelector('body > main');
  const header = document.querySelector('.site-header');
  const skip = document.querySelector('.skip-link');
  const sectionHash = /^#(?:about|work|contact|contact-details)$/.test(location.hash);
  let previouslyOpened = false;
  try { previouslyOpened = sessionStorage.getItem('llj-entry-opened') === 'true'; } catch {}
  let returningFromCase = false;
  try {
    const from = new URL(document.referrer);
    returningFromCase = from.origin === location.origin && /\/(?:alphaclaw-launch|law-ai|alpha-618|guagua|furry-island|pet-festival|music-plan|lu-hood|portfolio)(?:\.html)?\/?$/.test(from.pathname);
  } catch {}
  if (sectionHash && (previouslyOpened || returningFromCase)) {
    page.dataset.entryUnlocked = 'true';
    page.dataset.restoreMail = 'open';
    page.dataset.mail = 'open';
    root.classList.remove('entry-locked');
    return;
  }
  let unlocked = false;
  root.classList.add('entry-locked');
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (location.hash) history.replaceState(history.state, '', location.pathname + location.search);
  content.inert = true;
  header.inert = true;
  skip.tabIndex = -1;
  skip.setAttribute('aria-hidden', 'true');

  function keepAtCover() {
    if (!unlocked && window.scrollY !== 0) window.scrollTo({ top: 0, behavior: 'instant' });
  }
  keepAtCover();
  window.addEventListener('scroll', keepAtCover, { passive: true });
  window.addEventListener('pageshow', keepAtCover);
  document.addEventListener('wheel', event => { if (!unlocked) event.preventDefault(); }, { passive: false, capture: true });
  document.addEventListener('touchmove', event => { if (!unlocked) event.preventDefault(); }, { passive: false, capture: true });
  document.addEventListener('click', event => {
    if (!unlocked && event.target.closest('a[href^="#"]')) event.preventDefault();
  }, true);

  const observer = new MutationObserver(() => {
    if (unlocked || page.dataset.mail !== 'open') return;
    unlocked = true;
    try { sessionStorage.setItem('llj-entry-opened', 'true'); } catch {}
    page.dataset.entryUnlocked = 'true';
    root.classList.remove('entry-locked');
    content.inert = false;
    header.inert = false;
    skip.removeAttribute('tabindex');
    skip.removeAttribute('aria-hidden');
    observer.disconnect();
    window.dispatchEvent(new Event('entry:unlocked'));
  });
  observer.observe(page, { attributes: true, attributeFilter: ['data-mail'] });
})();
