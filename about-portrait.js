(() => {
  const stage = document.querySelector('[data-photo-printer]');
  const printer = stage?.querySelector('.photo-printer');
  const section = stage?.closest('#about');
  if (!stage || !printer || !section) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  function draw() {
    frame = 0;
    const bounds = section.getBoundingClientRect();
    const start = innerHeight * .92;
    const header = document.querySelector('.site-header');
    const end = (header?.getBoundingClientRect().height || 68) + 24;
    const raw = Math.max(0, Math.min(1, (start - bounds.top) / Math.max(1, start - end)));
    const progress = reduced.matches ? 1 : raw * raw * (3 - 2 * raw);
    printer.style.setProperty('--paper-offset', `${((progress - 1) * 100).toFixed(2)}%`);
    stage.dataset.printProgress = progress.toFixed(3);
  }
  function request() {
    if (!frame) frame = requestAnimationFrame(draw);
  }
  function resize() {
    const scale = Math.min(stage.clientHeight / 1402, stage.clientWidth / 640);
    printer.style.width = `${(1122 * scale).toFixed(2)}px`;
    printer.style.height = `${(1402 * scale).toFixed(2)}px`;
    request();
  }
  new ResizeObserver(resize).observe(stage);
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('entry:unlocked', resize);
  reduced.addEventListener('change', request);
  resize();
})();
