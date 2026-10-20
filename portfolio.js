(() => {
  'use strict';

  const projects = [
    { url: 'alphaclaw-launch.html' },
    { url: 'law-ai.html' },
    { url: 'alpha-618.html' },
    { url: 'guagua.html' },
    { url: 'furry-island.html' },
    { url: 'pet-festival.html' },
    { url: 'music-plan.html' }
  ];

  const root = document.documentElement;
  const body = document.body;
  document.querySelectorAll('img[data-preview]').forEach(image => {
    const ready = () => image.classList.add('image-loaded');
    if (image.complete && image.naturalWidth) ready();
    else image.addEventListener('load', ready, { once: true });
  });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const header = document.querySelector('.site-header');
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#site-nav');
  const progress = document.querySelector('.scroll-progress');
  const scrollLocks = new Set();
  let savedScrollStyles;

  function lockScroll(reason) {
    if (scrollLocks.has(reason)) return;
    if (!scrollLocks.size) {
      savedScrollStyles = {
        rootOverflow: root.style.overflow,
        bodyOverflow: body.style.overflow,
        bodyPaddingRight: body.style.paddingRight
      };
      const scrollbar = window.innerWidth - root.clientWidth;
      if (scrollbar > 0) {
        body.style.paddingRight = `${parseFloat(getComputedStyle(body).paddingRight) + scrollbar}px`;
      }
      root.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
    }
    scrollLocks.add(reason);
  }

  function unlockScroll(reason) {
    scrollLocks.delete(reason);
    if (scrollLocks.size || !savedScrollStyles) return;
    root.style.overflow = savedScrollStyles.rootOverflow;
    body.style.overflow = savedScrollStyles.bodyOverflow;
    body.style.paddingRight = savedScrollStyles.bodyPaddingRight;
    savedScrollStyles = undefined;
    requestScrollUpdate();
  }

  function setMenu(open, restoreFocus = false) {
    if (!menuButton || !navigation) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
    navigation.classList.toggle('is-open', open);
    body.classList.toggle('menu-open', open);
    if (open) {
      lockScroll('menu');
      navigation.querySelector('a[href]')?.focus({ preventScroll: true });
    } else unlockScroll('menu');
    if (restoreFocus) menuButton.focus({ preventScroll: true });
  }

  menuButton?.addEventListener('click', () => {
    setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
  });
  navigation?.addEventListener('click', event => {
    if (event.target.closest('a')) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (menuButton?.getAttribute('aria-expanded') !== 'true') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setMenu(false, true);
      return;
    }
    if (event.key === 'Tab') {
      const focusable = [menuButton, ...navigation.querySelectorAll('a[href]')]
        .filter(element => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      const active = document.activeElement;
      if (!first) return;
      if (!focusable.includes(active) || (event.shiftKey && active === first) || (!event.shiftKey && active === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus({ preventScroll: true });
      }
    }
  });

  const revealElements = [...document.querySelectorAll('.reveal')];
  let revealObserver;
  function setRevealMotion() {
    revealObserver?.disconnect();
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      root.classList.remove('has-motion');
      revealElements.forEach(element => element.classList.add('is-revealed'));
      return;
    }
    root.classList.add('has-motion');
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });
    revealElements.forEach(element => {
      if (!element.classList.contains('is-revealed')) revealObserver.observe(element);
    });
  }
  setRevealMotion();

  const sectionLinks = [...(navigation?.querySelectorAll('a[href^="#"]') || [])]
    .map(link => ({ link, section: document.getElementById(link.hash.slice(1)) }))
    .filter(item => item.section);
  let scrollFrame = 0;

  function updateScroll() {
    scrollFrame = 0;
    const top = window.scrollY;
    header?.classList.toggle('is-scrolled', top > 24);
    const maxScroll = root.scrollHeight - root.clientHeight;
    if (progress) progress.style.transform = `scaleX(${maxScroll > 0 ? Math.min(1, Math.max(0, top / maxScroll)) : 0})`;

    let current;
    sectionLinks.forEach(item => {
      if (item.section.getBoundingClientRect().top <= window.innerHeight * 0.35) current = item.link;
    });
    if (maxScroll > 0 && top >= maxScroll - 3) current = sectionLinks.at(-1)?.link;
    sectionLinks.forEach(({ link }) => {
      if (link === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function requestScrollUpdate() {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScroll);
  }

  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', () => {
    if (menuButton && getComputedStyle(menuButton).display === 'none') setMenu(false);
    requestScrollUpdate();
  }, { passive: true });
  window.addEventListener('load', requestScrollUpdate, { once: true });
  document.fonts?.ready.then(requestScrollUpdate);
  requestScrollUpdate();

  const projectDialog = document.querySelector('#project-dialog');
  const socialDialog = document.querySelector('#social-dialog');
  const projectCards = [...document.querySelectorAll('.projects .project')];
  const dialogOpeners = new WeakMap();
  let currentProject = 0;

  function text(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function showDialog(dialog, opener) {
    if (!dialog || dialog.open) return;
    setMenu(false);
    dialogOpeners.set(dialog, opener || document.activeElement);
    dialog.showModal();
    lockScroll(dialog);
    body.classList.add('dialog-open');
    hideCursor();
  }

  function fillProject(index) {
    currentProject = (index + projects.length) % projects.length;
    const project = projects[currentProject];
    if (project.url) {
      window.location.assign(project.url);
      return false;
    }
    text('#dialog-type', project.type);
    text('#dialog-title', project.title);
    text('#dialog-copy', project.copy);
    text('#dialog-tags', project.tags);
    text('#dialog-context', project.context);
    text('#dialog-role', project.role);
    text('#dialog-outcome', project.outcome);
    const visibleCards = projectCards.filter(card => !card.hidden);
    const activeCard = visibleCards.findIndex(card => Number(card.dataset.project) === currentProject);
    text('#dialog-index', `${String(activeCard + 1).padStart(2, '0')} / ${String(visibleCards.length).padStart(2, '0')}`);
    text('#dialog-year', `PROJECT ${String(currentProject + 1).padStart(2, '0')}`);
    const image = document.querySelector('#dialog-image');
    if (image) {
      const source = document.querySelector(`.project[data-project="${currentProject}"] img`);
      image.src = source?.currentSrc || source?.src || project.image;
      image.alt = source?.alt || project.imageAlt;
    }
    if (projectDialog) projectDialog.scrollTop = 0;
    projectDialog?.querySelector('.dialog-content')?.scrollTo({ top: 0, behavior: 'instant' });
    return true;
  }

  document.querySelectorAll('.project[data-project]').forEach(button => {
    button.addEventListener('click', () => {
      const index = Number(button.dataset.project);
      if (!Number.isInteger(index) || !projects[index]) return;
      if (fillProject(index) === true) showDialog(projectDialog, button);
    });
  });
  function stepProject(direction) {
    const visibleCards = projectCards.filter(card => !card.hidden);
    if (!visibleCards.length) return;
    const current = visibleCards.findIndex(card => Number(card.dataset.project) === currentProject);
    const next = visibleCards[(current + direction + visibleCards.length) % visibleCards.length];
    if (next.dataset.project !== undefined) fillProject(Number(next.dataset.project));
    else if (next instanceof HTMLAnchorElement) window.location.assign(next.href);
  }
  projectDialog?.querySelector('.dialog-prev')?.addEventListener('click', () => stepProject(-1));
  projectDialog?.querySelector('.dialog-next')?.addEventListener('click', () => stepProject(1));
  document.querySelector('#social')?.addEventListener('click', event => showDialog(socialDialog, event.currentTarget));
  document.querySelector('#wechat')?.addEventListener('click', event => showDialog(document.querySelector('#wechat-dialog'), event.currentTarget));

  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelectorAll('.close').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
      unlockScroll(dialog);
      if (!document.querySelector('dialog[open]')) body.classList.remove('dialog-open');
      const opener = dialogOpeners.get(dialog);
      if (opener?.isConnected && !document.querySelector('dialog[open]')) opener.focus({ preventScroll: true });
      dialogOpeners.delete(dialog);
    });
  });

  const copyButton = document.querySelector('#copy-email');
  let copying = false;
  copyButton?.addEventListener('click', async () => {
    if (copying) return;
    copying = true;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText('2863645364@qq.com');
      text('#copy-status', '邮箱已复制');
    } catch {
      text('#copy-status', '请长按或选中邮箱手动复制：2863645364@qq.com');
    } finally {
      copying = false;
    }
  });

  let cursor = document.querySelector('.project-cursor');
  if (!cursor) {
    cursor = document.createElement('div');
    cursor.className = 'project-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.innerHTML = '<span class="cursor-dot"></span><span class="cursor-arrow">↗</span>';
    body.append(cursor);
  }
  let activeMedia = null;
  let mediaRect;
  let pointerFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let cursorX = 0;
  let cursorY = 0;
  let pointerReady = false;
  let lastPointerTime = 0;

  function hasPointerMotion() {
    return window.innerWidth > 700 && finePointer.matches && !reducedMotion.matches && !document.hidden && !body.classList.contains('dialog-open') && !root.classList.contains('case-viewer-open');
  }

  function drawPointer(time) {
    pointerFrame = 0;
    if (!pointerReady || !hasPointerMotion()) return;
    const delta = lastPointerTime ? Math.min(64, time - lastPointerTime) : 16.67;
    lastPointerTime = time;
    const easing = 1 - Math.exp(-delta / 62);
    cursorX += (pointerX - cursorX) * easing;
    cursorY += (pointerY - cursorY) * easing;
    if (cursor) cursor.style.transform = `translate3d(${cursorX.toFixed(2)}px, ${cursorY.toFixed(2)}px, 0)`;
    if (activeMedia && mediaRect) {
      const px = Math.max(-1, Math.min(1, (pointerX - mediaRect.left) / mediaRect.width * 2 - 1));
      const py = Math.max(-1, Math.min(1, (pointerY - mediaRect.top) / mediaRect.height * 2 - 1));
      activeMedia.style.setProperty('--px', px.toFixed(3));
      activeMedia.style.setProperty('--py', py.toFixed(3));
    }
    if (Math.abs(pointerX - cursorX) + Math.abs(pointerY - cursorY) > 0.3) pointerFrame = requestAnimationFrame(drawPointer);
    else lastPointerTime = 0;
  }

  function hideCursor() {
    root.classList.remove('has-follow-cursor');
    cursor?.classList.remove('is-visible');
    cursor?.classList.remove('is-project', 'is-link', 'is-pressed', 'is-dragging');
    if (activeMedia) {
      activeMedia.style.setProperty('--px', '0');
      activeMedia.style.setProperty('--py', '0');
    }
    activeMedia = null;
    pointerReady = false;
    lastPointerTime = 0;
    if (pointerFrame) cancelAnimationFrame(pointerFrame);
    pointerFrame = 0;
  }

  function activateMedia(media) {
    if (activeMedia === media) return;
    if (activeMedia) {
      activeMedia.style.setProperty('--px', '0');
      activeMedia.style.setProperty('--py', '0');
    }
    activeMedia = media;
    mediaRect = media?.getBoundingClientRect();
  }

  document.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' || !hasPointerMotion()) return hideCursor();
    const target = event.target instanceof Element ? event.target : null;
    const media = target?.closest('.project-media, .case-image') || null;
    activateMedia(media);
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!pointerReady) {
      cursorX = pointerX;
      cursorY = pointerY;
      pointerReady = true;
    }
    cursor?.classList.add('is-visible');
    root.classList.add('has-follow-cursor');
    cursor?.classList.toggle('is-project', !!media);
    cursor?.classList.toggle('is-link', !!target?.closest('a,button,summary'));
    cursor?.classList.toggle('is-dragging', !!target?.closest('.is-dragging'));
    if (!pointerFrame) pointerFrame = requestAnimationFrame(drawPointer);
  }, { passive: true });
  document.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'touch') cursor?.classList.add('is-pressed');
  }, { passive: true });
  document.addEventListener('pointerup', () => cursor?.classList.remove('is-pressed', 'is-dragging'), { passive: true });
  document.addEventListener('pointerleave', hideCursor);
  document.addEventListener('pointercancel', hideCursor);
  window.addEventListener('scroll', () => {
    if (!pointerReady || !hasPointerMotion()) return;
    const target = document.elementFromPoint(pointerX, pointerY);
    const media = target?.closest('.project-media, .case-image') || null;
    activateMedia(media);
    if (media) mediaRect = media.getBoundingClientRect();
    cursor?.classList.toggle('is-project', !!media);
    cursor?.classList.toggle('is-link', !!target?.closest('a,button,summary'));
    if (!pointerFrame) pointerFrame = requestAnimationFrame(drawPointer);
  }, { passive: true, capture: true });
  window.addEventListener('resize', hideCursor, { passive: true });
  window.addEventListener('blur', hideCursor);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hideCursor(); });
  finePointer.addEventListener('change', hideCursor);
  reducedMotion.addEventListener('change', () => {
    setRevealMotion();
    hideCursor();
  });

  const workFilters = document.querySelector('.work-filters');
  const projectList = document.querySelector('.projects');
  if (workFilters && projectList) {
    const cards = [...projectList.querySelectorAll('.project')];
    const buttons = [...workFilters.querySelectorAll('button[data-filter]')];
    const count = document.querySelector('#work .section-count');
    count?.setAttribute('role', 'status');
    count?.setAttribute('aria-live', 'polite');
    workFilters.hidden = false;
    workFilters.addEventListener('click', event => {
      const selected = event.target.closest('button[data-filter]');
      if (!selected || !buttons.includes(selected)) return;
      const category = selected.dataset.filter;
      let visibleCount = 0;
      hideCursor();
      cards.forEach(card => {
        const visible = category === 'all' || card.dataset.category === category;
        card.hidden = !visible;
        if (visible) visibleCount++;
      });
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button === selected)));
      projectList.classList.toggle('is-filtered', category !== 'all');
      projectList.dispatchEvent(new CustomEvent('projects:filter'));
      if (count) {
        count.textContent = `(${String(visibleCount).padStart(2, '0')})`;
        count.setAttribute('aria-label', `${selected.textContent}，${visibleCount} 个项目`);
      }
      requestScrollUpdate();
    });
  }
})();
