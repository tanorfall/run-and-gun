/* RUN & GUN · animations et interactions
   GSAP + ScrollTrigger + Lenis. Tout est coupé si le visiteur demande un mouvement réduit
   (classe .motion absente sur <html>), et le site reste complet sans JavaScript. */
(function () {
  'use strict';

  var root = document.documentElement;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (!hasGsap) root.classList.remove('motion'); // bibliothèques bloquées : on affiche tout
  var motion = root.classList.contains('motion');
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  // ---------- réglages (config.js) ----------
  var wa = typeof NORTA_WHATSAPP === 'string' ? NORTA_WHATSAPP.replace(/\D/g, '') : '';
  $$('[data-wa-link]').forEach(function (a) {
    if (/^\d{8,15}$/.test(wa)) a.href = 'https://wa.me/' + wa;
    else a.closest('li').hidden = true;
  });
  if (typeof NORTA_INSTAGRAM === 'string') {
    $$('[data-ig]').forEach(function (a) { a.href = 'https://www.instagram.com/' + NORTA_INSTAGRAM + '/'; a.textContent = '@' + NORTA_INSTAGRAM; });
  }
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // ---------- timecode (25 images/s) ----------
  var tcEls = $$('[data-timecode]');
  var t0 = performance.now();
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  function tick() {
    var f = Math.floor((performance.now() - t0) / 40);
    var s = Math.floor(f / 25);
    var tc = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(s % 60) + ':' + pad(f % 25);
    for (var i = 0; i < tcEls.length; i++) tcEls[i].textContent = tc;
    if (motion) requestAnimationFrame(tick);
  }
  tick();
  if (!motion) setInterval(tick, 1000);

  // ---------- en-tête ----------
  var top = $('#top');
  var lastY = 0;
  function onScrollHeader(y) {
    top.classList.toggle('is-solid', y > 40);
    var modalOpen = !$('#modal').hidden;
    top.classList.toggle('is-hidden', y > 600 && y > lastY + 2 && !modalOpen && !top.contains(document.activeElement));
    if (y < lastY - 2 || y < 600) top.classList.remove('is-hidden');
    lastY = y;
  }
  onScrollHeader(window.scrollY);

  // ---------- comparaison avant / après ----------
  $$('[data-compare]').forEach(function (box) {
    var range = $('input[type="range"]', box);
    var set = function (v) { box.style.setProperty('--pos', v + '%'); range.value = v; range.setAttribute('aria-valuetext', v + ' % avant'); };
    range.addEventListener('input', function () { set(range.value); });
    var drag = false;
    var fromEvent = function (e) {
      var r = box.getBoundingClientRect();
      var x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      set(Math.round(Math.max(0, Math.min(100, x / r.width * 100))));
    };
    box.addEventListener('pointerdown', function (e) { drag = true; fromEvent(e); });
    window.addEventListener('pointermove', function (e) { if (drag) fromEvent(e); });
    window.addEventListener('pointerup', function () { drag = false; });
    set(50);
    box._set = set;
  });

  // ---------- modale vidéo ----------
  var modal = $('#modal'), frame = $('#modal-frame'), lastFocus = null;
  function openVideo(src, title) {
    var parts = src.split(':'), url;
    if (parts[0] === 'youtube') url = 'https://www.youtube-nocookie.com/embed/' + parts[1] + '?autoplay=1&rel=0&modestbranding=1&playsinline=1';
    else if (parts[0] === 'drive') url = 'https://drive.google.com/file/d/' + parts[1] + '/preview';
    else return;
    lastFocus = document.activeElement;
    $('#modal-title').textContent = title || 'Vidéo';
    frame.innerHTML = '';
    var ifr = document.createElement('iframe');
    ifr.src = url;
    ifr.title = title || 'Vidéo';
    ifr.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    ifr.allowFullscreen = true;
    frame.appendChild(ifr);
    modal.hidden = false;
    requestAnimationFrame(function () { modal.classList.add('is-open'); });
    document.body.style.overflow = 'hidden';
    if (window.__lenis) window.__lenis.stop();
    $('.modal__close', modal).focus();
  }
  function closeVideo() {
    if (modal.hidden) return;
    modal.classList.remove('is-open');
    modal.hidden = true;
    frame.innerHTML = '';
    document.body.style.overflow = '';
    if (window.__lenis) window.__lenis.start();
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  }
  $$('[data-video]').forEach(function (b) {
    b.addEventListener('click', function () { openVideo(b.getAttribute('data-video'), b.getAttribute('data-title')); });
  });
  $$('[data-close]', modal).forEach(function (b) { b.addEventListener('click', closeVideo); });
  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;
    if (e.key === 'Escape') closeVideo();
    if (e.key === 'Tab') { // le focus reste dans la modale
      var f = $$('button, iframe', modal);
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // ---------- FAQ : une seule réponse ouverte à la fois ----------
  $$('.qa').forEach(function (d) {
    d.addEventListener('toggle', function () {
      if (d.open) $$('.qa').forEach(function (o) { if (o !== d) o.open = false; });
      if (window.ScrollTrigger) setTimeout(function () { ScrollTrigger.refresh(); }, 50);
    });
  });

  // ================== à partir d'ici : animations seulement ==================
  if (!motion) {
    window.addEventListener('scroll', function () { onScrollHeader(window.scrollY); }, { passive: true });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ---------- défilement doux ----------
  var lenis = null;
  if (window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    window.__lenis = lenis;
    lenis.on('scroll', function (e) { ScrollTrigger.update(); onScrollHeader(e.scroll); });
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
    // ancres internes
    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var t = document.querySelector(id);
        if (!t) return;
        e.preventDefault();
        lenis.scrollTo(t, { offset: id === '#hero' ? 0 : -10 });
        history.replaceState(null, '', id);
        if (id !== '#hero') { t.setAttribute('tabindex', '-1'); t.focus({ preventScroll: true }); }
      });
    });
  } else {
    window.addEventListener('scroll', function () { onScrollHeader(window.scrollY); }, { passive: true });
  }

  // ---------- découpe des titres en lignes ----------
  function splitLines(el) {
    var original = el.innerHTML;
    var tokens = [];
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach(function (w) {
          if (!w) return;
          if (/^\s+$/.test(w)) tokens.push(document.createTextNode(' '));
          else { var s = document.createElement('span'); s.className = 'w'; s.style.display = 'inline-block'; s.textContent = w; tokens.push(s); }
        });
      } else {
        var c = n.cloneNode(true);
        if (c.nodeType === 1) c.style.display = 'inline-block';
        tokens.push(c);
      }
    });
    el.innerHTML = '';
    tokens.forEach(function (t) { el.appendChild(t); });
    var lines = [], cur = null, lastTop = null;
    tokens.forEach(function (t) {
      if (t.nodeType !== 1) { if (cur) cur.push(t); return; }
      var tp = t.offsetTop;
      if (lastTop === null || Math.abs(tp - lastTop) > 4) { cur = []; lines.push(cur); lastTop = tp; }
      cur.push(t);
    });
    el.innerHTML = '';
    var inners = lines.map(function (ln) {
      var m = document.createElement('span'); m.className = 'line-mask';
      var i = document.createElement('span'); i.className = 'line-inner';
      ln.forEach(function (t) { i.appendChild(t); });
      m.appendChild(i); el.appendChild(m);
      return i;
    });
    return { lines: inners, revert: function () { el.innerHTML = original; } };
  }

  // ---------- entrée du hero ----------
  var heroTl = gsap.timeline({ delay: .15, paused: !window.__clapFini && !!document.querySelector('.clap'), defaults: { ease: 'expo.out' } });
  window.addEventListener('clap:fin', function () { heroTl.play(); }); // l'entrée du hero démarre après le clap
  heroTl
    .to('.hero__frame i', { opacity: 1, duration: .6, stagger: .05 }, 0)
    .from('.hero__frame', { scale: 1.06, duration: 1.4 }, 0)
    .to('.hero__meta', { opacity: 1, duration: .6 }, .1)
    .to('.hero__kicker', { opacity: 1, duration: .6 }, .25)
    .from('.hero__kicker', { y: 14, duration: .8 }, .25)
    .to('.hero .rg__word > span', { y: 0, duration: 1.1, stagger: .055 }, .3)
    .to('.hero .rg__dot', { scale: 1, duration: .9, ease: 'back.out(3)' }, .75)
    .to('.hero__sub', { opacity: 1, duration: .7 }, .95)
    .from('.hero__sub', { y: 24, duration: 1 }, .95)
    .to('.hero__cta', { opacity: 1, duration: .7 }, 1.1)
    .from('.hero__cta', { y: 20, duration: 1 }, 1.1)
    .to('.hero__foot', { opacity: 1, duration: .7 }, 1.25)
    .from('.hero__bg img', { scale: 1.18, duration: 2.6, ease: 'power3.out' }, 0);

  // parallaxe du hero
  gsap.to('.hero__bg img', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__body', { yPercent: -18, opacity: .25, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });

  // ---------- titres découpés ----------
  document.fonts.ready.then(function () {
    $$('[data-split]').forEach(function (el) {
      var s = splitLines(el);
      gsap.from(s.lines, {
        yPercent: 110, rotate: 2, duration: 1.1, ease: 'expo.out', stagger: .09,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onComplete: s.revert
      });
    });
    ScrollTrigger.refresh();
  });

  // ---------- révélations ----------
  gsap.set('.reveal', { opacity: 0, y: 40 });
  ScrollTrigger.batch('.reveal', {
    start: 'top 90%',
    once: true,
    onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: .08, overwrite: true }); }
  });

  // ---------- manifeste : mots révélés au scroll ----------
  $$('[data-words] p').forEach(function (p) {
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          var frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) frag.appendChild(document.createTextNode(w));
            else { var s = document.createElement('span'); s.className = 'word'; s.textContent = w; frag.appendChild(s); }
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && n.tagName !== 'MARK') walk(n);
        else if (n.tagName === 'MARK') { n.classList.add('word'); }
      });
    };
    walk(p);
  });
  var words = $$('[data-words] .word');
  var marks = $$('[data-words] mark');
  gsap.timeline({ scrollTrigger: { trigger: '[data-words]', start: 'top 75%', end: 'bottom 45%', scrub: .6 } })
    .to(words, { opacity: 1, stagger: .1, ease: 'none', duration: .3 });
  marks.forEach(function (m) {
    gsap.to(m, { '--hl': '100%', ease: 'power2.out', duration: .6, scrollTrigger: { trigger: m, start: 'top 62%', toggleActions: 'play none none reverse' } });
  });
  gsap.from('.story__card img', { scale: 1.15, ease: 'none', scrollTrigger: { trigger: '.story__card', start: 'top bottom', end: 'bottom top', scrub: true } });

  // ---------- compteurs ----------
  $$('[data-count]').forEach(function (el) {
    var end = parseFloat(el.getAttribute('data-count'));
    var o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, {
      v: end, duration: 1.8, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: function () { el.textContent = Math.round(o.v); }
    });
  });

  // ---------- clips ----------
  gsap.from('.clip__media img', { scale: 1.2, duration: 1.6, ease: 'expo.out', stagger: .06, scrollTrigger: { trigger: '.grid-clips', start: 'top 80%', once: true } });

  // ---------- avant / après : petit balayage d'invitation ----------
  var cmp = $('[data-compare]');
  if (cmp && cmp._set) {
    var st = { v: 50 };
    gsap.timeline({ scrollTrigger: { trigger: cmp, start: 'top 70%', once: true } })
      .to(st, { v: 80, duration: .9, ease: 'power2.inOut', onUpdate: function () { cmp._set(Math.round(st.v)); } })
      .to(st, { v: 22, duration: 1.1, ease: 'power2.inOut', onUpdate: function () { cmp._set(Math.round(st.v)); } })
      .to(st, { v: 50, duration: .9, ease: 'power2.inOut', onUpdate: function () { cmp._set(Math.round(st.v)); } });
  }

  // ---------- coulisses : parallaxe ----------
  $$('.tile').forEach(function (t) {
    var sp = parseFloat(t.getAttribute('data-speed')) || 0;
    gsap.fromTo($('img', t), { yPercent: -sp * .8 }, { yPercent: sp * .8, ease: 'none', scrollTrigger: { trigger: t, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from(t, { opacity: 0, y: 60, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: t, start: 'top 92%', once: true } });
  });

  // ---------- le deal : les 5 places ----------
  gsap.from('.place', { yPercent: 30, opacity: 0, duration: .9, ease: 'back.out(1.6)', stagger: .08, scrollTrigger: { trigger: '.places', start: 'top 80%', once: true } });

  // ---------- frise ----------
  var tlEl = $('[data-timeline]');
  if (tlEl) {
    tlEl.style.setProperty('--p', 0);
    ScrollTrigger.create({
      trigger: tlEl, start: 'top 65%', end: 'bottom 65%', scrub: true,
      onUpdate: function (self) { tlEl.style.setProperty('--p', self.progress.toFixed(3)); }
    });
    $$('.tl', tlEl).forEach(function (li) {
      ScrollTrigger.create({ trigger: li, start: 'top 66%', onEnter: function () { li.classList.add('is-on'); }, onLeaveBack: function () { li.classList.remove('is-on'); } });
      gsap.from($$(':scope > :not(.tl__dot)', li), { x: 30, opacity: 0, duration: .9, ease: 'expo.out', stagger: .06, scrollTrigger: { trigger: li, start: 'top 85%', once: true } });
    });
  }

  // ---------- footer : logo géant ----------
  gsap.from('.foot__rg .rg', { yPercent: 40, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.foot__rg', start: 'top 95%', once: true } });

  // ---------- curseur ----------
  var cur = $('.cursor');
  if (cur && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var label = $('.cursor__label', cur);
    var xTo = gsap.quickTo(cur, 'x', { duration: .35, ease: 'power3' });
    var yTo = gsap.quickTo(cur, 'y', { duration: .35, ease: 'power3' });
    window.addEventListener('pointermove', function (e) { xTo(e.clientX); yTo(e.clientY); cur.classList.add('is-on'); }, { passive: true });
    document.addEventListener('pointerleave', function () { cur.classList.remove('is-on'); });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest && e.target.closest('a, button, summary, label, input, select, textarea, [data-compare]');
      var l = e.target.closest && e.target.closest('[data-cursor]');
      cur.classList.toggle('is-label', !!l);
      cur.classList.toggle('is-link', !!t && !l);
      label.textContent = l ? l.getAttribute('data-cursor') : '';
    });
  }

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
