(() => {
  'use strict';
  const rails = [...document.querySelectorAll('[data-project-carousel]')];
  rails.forEach(rail => {
  const section = rail.closest('.work-row');
  const cards = [...rail.querySelectorAll('.project')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const group = document.createElement('div');
  group.className = 'carousel-group carousel-originals';
  cards.forEach((card, index) => {
    const image = card.querySelector('img');
    if (image) {
      card.style.setProperty('--cover-ratio', Number(image.getAttribute('width')) / Number(image.getAttribute('height')));
      image.draggable = false;
    }
    card.dataset.carouselIndex = index;
    card.classList.remove('reveal');
    group.append(card);
  });
  rail.append(group);
  document.body.classList.add('carousel-ready');

  let visible = cards;
  let cycle = 0;
  let origin = 0;
  let copiesPerSide = 0;
  let offsets = [];
  let frame = 0;
  let previousTime = 0;
  let inView = false;
  let hovering = false;
  let focused = false;
  let dragging = null;
  let touching = false;
  let suppressClick = false;
  let paused = reduced.matches;
  let manualUntil = 0;
  let travel = null;
  let measureFrame = 0;
  let fractionalScroll = 0;
  let activeProject = null;
  let momentum = 0;
  let wheelRemaining = 0;
  let displayedVelocity = 0;
  let pointer = null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function moveBy(distance) {
    fractionalScroll += distance;
    const pixels = Math.trunc(fractionalScroll);
    rail.scrollLeft += pixels;
    fractionalScroll -= pixels;
    normalize();
  }
  function restoreHover() {
    if (!pointer || !finePointer.matches) return;
    const card = document.elementFromPoint(pointer.x, pointer.y)?.closest('.project');
    highlightProject(card && rail.contains(card) ? card : null);
  }
  function showVelocity(velocity, dt) {
    const target = reduced.matches ? 0 : clamp(velocity, -2600, 2600);
    displayedVelocity += (target - displayedVelocity) * (1 - Math.exp(-Math.max(dt, 1 / 120) * 14));
    if (Math.abs(displayedVelocity) < 0.4) displayedVelocity = 0;
    const amount = displayedVelocity / 2600;
    rail.style.setProperty('--rail-yaw', `${(-amount * 4).toFixed(3)}deg`);
    rail.style.setProperty('--rail-skew', `${(-amount * 3).toFixed(3)}deg`);
    rail.style.setProperty('--rail-stretch', (1 + Math.abs(amount) * 0.035).toFixed(4));
  }

  function highlightProject(card) {
    if (activeProject === card) return;
    activeProject?.classList.remove('is-active-project');
    activeProject = card;
    hovering = Boolean(card);
    rail.classList.toggle('has-active-project', hovering);
    if (card) {
      card.classList.add('is-active-project');
      travel = null;
      momentum = 0;
      wheelRemaining = 0;
      wake();
    } else wake();
  }

  function localPosition() {
    if (!cycle) return 0;
    const position = ((rail.scrollLeft - origin) % cycle + cycle) % cycle;
    return position < 0.75 || cycle - position < 0.75 ? 0 : position;
  }
  function normalize() {
    if (!cycle) return;
    const change = rail.scrollLeft < origin - 0.5 ? cycle : rail.scrollLeft >= origin + cycle - 0.5 ? -cycle : 0;
    if (change) {
      rail.scrollLeft += change;
      if (travel) { travel.from += change; travel.to += change; }
      if (dragging) dragging.startScroll += change;
    }
  }
  function canAutoScroll() {
    return !paused && !hovering && !focused && !dragging && !touching && !document.querySelector('dialog[open]') && performance.now() > manualUntil;
  }
  function draw(now) {
    frame = 0;
    if (!inView || document.hidden || !cycle) { previousTime = 0; return; }
    const dt = previousTime ? Math.min((now - previousTime) / 1000, 0.05) : 0;
    previousTime = now;
    let velocity = dragging?.active ? dragging.velocity : 0;
    if (travel) {
      const before = rail.scrollLeft;
      const t = Math.min(1, (now - travel.start) / travel.duration);
      const ease = 1 - Math.pow(1 - t, 3);
      rail.scrollLeft = travel.from + (travel.to - travel.from) * ease;
      velocity = dt ? (rail.scrollLeft - before) / dt : 0;
      if (t === 1) travel = null;
      normalize();
    } else if (Math.abs(wheelRemaining) > 0.1) {
      const distance = wheelRemaining * (1 - Math.exp(-dt * 18));
      wheelRemaining -= distance;
      moveBy(distance);
      velocity = dt ? distance / dt : 0;
      if (Math.abs(wheelRemaining) < 0.6) {
        moveBy(wheelRemaining);
        wheelRemaining = 0;
        restoreHover();
      }
    } else if (Math.abs(momentum) > 12 && !dragging && !touching) {
      velocity = momentum;
      moveBy(momentum * dt);
      momentum *= Math.exp(-dt * 6.2);
      if (Math.abs(momentum) <= 12) { momentum = 0; restoreHover(); }
    } else if (canAutoScroll()) {
      velocity = 34;
      moveBy(dt * velocity);
    }
    showVelocity(velocity, dt);
    const waitingToResume = !paused && !hovering && !focused && !dragging && !touching && now < manualUntil;
    if (travel || wheelRemaining || momentum || dragging?.active || Math.abs(displayedVelocity - velocity) > 0.4 || canAutoScroll() || waitingToResume) frame = requestAnimationFrame(draw);
    else previousTime = 0;
  }
  function wake() {
    if (!frame && inView && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function setPaused(value) {
    paused = value;
    if (value) { momentum = 0; wheelRemaining = 0; }
    wake();
  }
  function copyGroup() {
    const copy = group.cloneNode(true);
    copy.className = 'carousel-group carousel-copy';
    copy.setAttribute('aria-hidden', 'true');
    copy.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'));
    copy.querySelectorAll('a,button,[tabindex]').forEach(element => element.tabIndex = -1);
    copy.querySelectorAll('canvas').forEach(canvas => canvas.remove());
    copy.querySelectorAll('[data-law-motion]').forEach(media => {
      media.removeAttribute('data-law-motion');
      media.classList.remove('is-law-running');
    });
    return copy;
  }
  function measure() {
    measureFrame = 0;
    const local = localPosition();
    const oldCycle = cycle;
    cycle = group.getBoundingClientRect().width;
    if (!cycle) return;
    const requiredCopies = Math.ceil(rail.clientWidth / cycle) + 1;
    if (copiesPerSide !== requiredCopies) {
      rail.querySelectorAll('.carousel-copy').forEach(copy => copy.remove());
      copiesPerSide = requiredCopies;
      for (let index = 0; index < copiesPerSide; index++) {
        rail.prepend(copyGroup());
        rail.append(copyGroup());
      }
    }
    origin = cycle * copiesPerSide;
    offsets = visible.map(card => card.offsetLeft - visible[0].offsetLeft);
    rail.scrollLeft = origin + (oldCycle ? local / oldCycle * cycle : 0);
    travel = null;
    momentum = 0;
    wheelRemaining = 0;
    wake();
  }
  function rebuild() {
    highlightProject(null);
    rail.querySelectorAll('.carousel-copy').forEach(copy => copy.remove());
    visible = cards.filter(card => !card.hidden);
    copiesPerSide = 0;
    cycle = 0;
    measure();
  }
  function moveTo(position) {
    momentum = 0;
    wheelRemaining = 0;
    manualUntil = performance.now() + 1200;
    if (reduced.matches) { rail.scrollLeft = position; normalize(); }
    else {
      travel = { from: rail.scrollLeft, to: position, start: performance.now(), duration: 520 };
      wake();
    }
  }
  function step(direction) {
    const local = localPosition();
    const base = rail.scrollLeft - local;
    const offset = direction > 0
      ? offsets.find(value => value > local + 5) ?? cycle
      : [...offsets].reverse().find(value => value < local - 5) ?? offsets.at(-1) - cycle;
    moveTo(base + offset);
  }

  rail.addEventListener('keydown', event => {
    if (event.key === ' ' && event.target === rail) {
      event.preventDefault();
      setPaused(!paused);
      return;
    }
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') moveTo(origin);
    else if (event.key === 'End') moveTo(origin + offsets.at(-1));
    else step(event.key === 'ArrowRight' ? 1 : -1);
  });
  rail.addEventListener('pointerover', event => {
    if (!finePointer.matches || event.pointerType !== 'mouse' || dragging?.active) return;
    pointer = { x: event.clientX, y: event.clientY };
    if (momentum || wheelRemaining) return;
    const card = event.target.closest('.project');
    highlightProject(card && rail.contains(card) ? card : null);
  });
  rail.addEventListener('pointerout', event => {
    if (event.pointerType !== 'mouse' || momentum || wheelRemaining || dragging?.active) return;
    const card = event.relatedTarget?.closest?.('.project');
    highlightProject(card && rail.contains(card) ? card : null);
  });
  rail.addEventListener('pointerleave', () => highlightProject(null));
  section.addEventListener('focusin', event => { focused = event.target.matches(':focus-visible'); });
  section.addEventListener('focusout', () => {
    queueMicrotask(() => { focused = section.contains(document.activeElement) && document.activeElement.matches(':focus-visible'); wake(); });
  });
  rail.addEventListener('wheel', event => {
    if (event.ctrlKey || dragging || document.querySelector('dialog[open]')) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (!delta || !cycle) return;
    event.preventDefault();
    pointer = { x: event.clientX, y: event.clientY };
    travel = null;
    momentum = 0;
    highlightProject(null);
    manualUntil = performance.now() + 1500;
    const unit = event.deltaMode === 1 ? 18 : event.deltaMode === 2 ? rail.clientWidth : 1;
    const distance = clamp(delta * unit, -rail.clientWidth, rail.clientWidth);
    if (reduced.matches) { moveBy(distance); restoreHover(); }
    else wheelRemaining = clamp(wheelRemaining + distance, -rail.clientWidth * 2, rail.clientWidth * 2);
    wake();
  }, { passive: false });
  rail.addEventListener('pointerdown', event => {
    travel = null;
    momentum = 0;
    wheelRemaining = 0;
    manualUntil = performance.now() + 1500;
    wake();
    if (event.pointerType === 'touch') touching = true;
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    pointer = { x: event.clientX, y: event.clientY };
    dragging = { id: event.pointerId, x: event.clientX, lastX: event.clientX, lastTime: performance.now(), velocity: 0, startScroll: rail.scrollLeft, active: false };
  });
  rail.addEventListener('pointermove', event => {
    pointer = { x: event.clientX, y: event.clientY };
    if (!dragging && event.pointerType === 'mouse' && (momentum || wheelRemaining)) { momentum = 0; wheelRemaining = 0; restoreHover(); wake(); }
    if (!dragging || dragging.id !== event.pointerId) return;
    const now = performance.now();
    const elapsed = Math.max(8, now - dragging.lastTime);
    const velocity = clamp((dragging.lastX - event.clientX) / elapsed * 1000, -2600, 2600);
    dragging.velocity = dragging.velocity * 0.3 + velocity * 0.7;
    dragging.lastX = event.clientX;
    dragging.lastTime = now;
    const distance = event.clientX - dragging.x;
    if (!dragging.active && Math.abs(distance) > 6) {
      dragging.active = true;
      highlightProject(null);
      rail.setPointerCapture(event.pointerId);
      rail.classList.add('is-dragging');
    }
    if (!dragging.active) return;
    event.preventDefault();
    rail.scrollLeft = dragging.startScroll - distance;
    normalize();
  });
  function releasePointer() {
    if (touching) {
      touching = false;
      manualUntil = performance.now() + 900;
      wake();
    }
    if (!dragging) return;
    suppressClick = dragging.active;
    const velocity = performance.now() - dragging.lastTime < 100 ? dragging.velocity : 0;
    momentum = dragging.active && !reduced.matches && Math.abs(velocity) > 80 ? velocity : 0;
    dragging = null;
    rail.classList.remove('is-dragging');
    manualUntil = performance.now() + 900;
    if (!momentum) restoreHover();
    setTimeout(() => { suppressClick = false; wake(); }, 0);
  }
  rail.addEventListener('pointerup', releasePointer);
  rail.addEventListener('pointercancel', () => { if (dragging) dragging.velocity = 0; releasePointer(); });
  rail.addEventListener('lostpointercapture', releasePointer);
  rail.addEventListener('pointerleave', event => { if (dragging && !dragging.active) releasePointer(); });
  rail.addEventListener('click', event => {
    if (suppressClick) { event.preventDefault(); event.stopImmediatePropagation(); return; }
  }, true);
  rail.addEventListener('projects:filter', rebuild);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
    else wake();
  });
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('close', wake));
  reduced.addEventListener('change', () => setPaused(reduced.matches));
  finePointer.addEventListener('change', () => highlightProject(null));
  const resizeObserver = new ResizeObserver(() => {
    if (!measureFrame) measureFrame = requestAnimationFrame(measure);
  });
  resizeObserver.observe(group);
  resizeObserver.observe(rail);
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    if (inView) wake();
    else { cancelAnimationFrame(frame); frame = 0; previousTime = 0; momentum = 0; wheelRemaining = 0; }
  }, { threshold: 0.05 }).observe(rail);
  rebuild();
  setPaused(paused);
  });
})();
