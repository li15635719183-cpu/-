(() => {
  'use strict';

  // Shared full-image viewer for the portfolio case studies.

  const links = [...document.querySelectorAll('.case-image')];
  const viewer = document.querySelector('#image-viewer');
  if (!viewer || typeof viewer.showModal !== 'function') return;

  const image = viewer.querySelector('#viewer-image');
  const caption = viewer.querySelector('#viewer-caption');
  const stage = viewer.querySelector('.viewer-stage');
  const zoomButton = viewer.querySelector('#viewer-zoom');
  const closeButton = viewer.querySelector('.viewer-close');
  let current = 0;
  let opener;

  function setZoom(zoomed) {
    stage.classList.toggle('is-zoomed', zoomed);
    zoomButton.setAttribute('aria-pressed', String(zoomed));
    zoomButton.textContent = zoomed ? '适应屏幕 −' : '放大细节 ＋';
    stage.scrollTop = 0;
    stage.scrollLeft = zoomed ? Math.max(0, (stage.scrollWidth - stage.clientWidth) / 2) : 0;
  }

  function showImage(index) {
    current = (index + links.length) % links.length;
    const link = links[current];
    const source = link.querySelector('img');
    image.width = Number(source.getAttribute('width'));
    image.height = Number(source.getAttribute('height'));
    stage.style.setProperty('--image-detail-width', `${Number(link.dataset.detailWidth) || 2400}px`);
    image.src = link.href;
    image.alt = source.alt;
    caption.textContent = `${String(current + 1).padStart(2, '0')} / ${String(links.length).padStart(2, '0')} · ${link.closest('figure').querySelector('figcaption > span').textContent.split(' / ')[1]}`;
    setZoom(false);
  }

  links.forEach((link, index) => {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      showImage(index);
      viewer.showModal();
      document.documentElement.classList.add('case-viewer-open');
      closeButton.focus({ preventScroll: true });
    });
  });

  closeButton.addEventListener('click', () => viewer.close());
  viewer.querySelector('#viewer-prev').addEventListener('click', () => showImage(current - 1));
  viewer.querySelector('#viewer-next').addEventListener('click', () => showImage(current + 1));
  zoomButton.addEventListener('click', () => setZoom(zoomButton.getAttribute('aria-pressed') !== 'true'));
  viewer.addEventListener('keydown', event => {
    if (stage.classList.contains('is-zoomed')) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showImage(current + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  viewer.addEventListener('close', () => {
    document.documentElement.classList.remove('case-viewer-open');
    opener?.focus({ preventScroll: true });
    image.removeAttribute('src');
  });
})();
