/* ============================================================
   Undangan Dika & Milla — interaksi
   ============================================================ */
(function () {
  'use strict';

  /* ---- KONFIGURASI (ubah di sini bila perlu) ----
     WITA = UTC+8. Akad mulai 09.00 WITA pada 15 November 2026. */
  var WEDDING_DATE = new Date('2026-11-15T09:00:00+08:00');
  var COUPLE = 'Milla & Dika';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------------- Nama tamu dari URL ---------------- */
  (function guest() {
    var p = new URLSearchParams(location.search);
    var raw = p.get('kepada') || p.get('to') || p.get('u') || p.get('tamu');
    if (raw) {
      var name = decodeURIComponent(raw.replace(/\+/g, ' ')).trim();
      if (name) $('#guestName').textContent = name;
    }
  })();

  /* ---------------- Buka undangan ---------------- */
  var opened = false;
  function openInvitation() {
    if (opened) return;
    opened = true;
    var cover = $('#cover');
    cover.classList.add('open');
    document.body.classList.remove('locked');
    setTimeout(function () { cover.style.display = 'none'; }, 1100);
    // izin giroskop (iOS perlu gesture) untuk parallax 3D
    try {
      if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().catch(function () {});
      }
    } catch (e) {}
    // mulai musik (gesture pengguna -> diizinkan)
    tryPlayMusic();
    // tampilkan tombol mengambang
    setTimeout(function () { $('#fabs').classList.add('show'); }, 600);
    // mulai kelopak bunga
    startPetals();
    window.scrollTo(0, 0);
  }
  $('#openBtn').addEventListener('click', openInvitation);

  /* ---------------- Musik latar ---------------- */
  var bgm = $('#bgm');
  var musicBtn = $('#musicBtn');
  var musicOn = false;
  function setMusicUI(on) {
    musicOn = on;
    musicBtn.classList.toggle('playing', on);
    musicBtn.title = on ? 'Jeda musik' : 'Putar musik';
  }
  function tryPlayMusic() {
    // sumber di-set saat pertama diputar agar tidak ada request gagal sebelum undangan dibuka.
    if (!bgm.getAttribute('src')) bgm.setAttribute('src', 'marry-me.mp3');
    var pr = bgm.play();
    if (pr && pr.then) pr.then(function () { setMusicUI(true); }).catch(function () { setMusicUI(false); });
  }
  musicBtn.addEventListener('click', function () {
    if (musicOn) { bgm.pause(); setMusicUI(false); }
    else { tryPlayMusic(); }
  });

  /* ---------------- Hitung mundur ---------------- */
  var elD = $('#cdD'), elH = $('#cdH'), elM = $('#cdM'), elS = $('#cdS');
  var grid = $('#cdGrid'), done = $('#cdDone');
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var diff = WEDDING_DATE.getTime() - Date.now();
    if (diff <= 0) {
      grid.classList.add('hide');
      done.classList.remove('hide');
      return;
    }
    var s = Math.floor(diff / 1000);
    elD.textContent = pad(Math.floor(s / 86400));
    elH.textContent = pad(Math.floor((s % 86400) / 3600));
    elM.textContent = pad(Math.floor((s % 3600) / 60));
    elS.textContent = pad(s % 60);
  }
  tick();
  setInterval(tick, 1000);

  /* ---------------- Simpan ke kalender (Google) ---------------- */
  (function cal() {
    function fmt(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    var start = WEDDING_DATE;
    var end = new Date(WEDDING_DATE.getTime() + 6 * 3600 * 1000); // akad+resepsi ~6 jam
    var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent('Pernikahan ' + COUPLE)
      + '&dates=' + fmt(start) + '/' + fmt(end)
      + '&details=' + encodeURIComponent('Akad & Resepsi pernikahan ' + COUPLE)
      + '&location=' + encodeURIComponent('Gedung Graha Ristela, Jl. El Tari, Mautapaga, Ende Timur, NTT');
    $('#calBtn').href = url;
  })();

  /* ---------------- RSVP ---------------- */
  var form = $('#rsvpForm');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = {
      nama: $('#rNama').value.trim(),
      hadir: (form.querySelector('input[name="hadir"]:checked') || {}).value || '-',
      jumlah: $('#rJml').value,
      pesan: $('#rPesan').value.trim(),
      ts: Date.now()
    };
    try {
      var key = 'rsvp_dika_milla';
      var list = JSON.parse(localStorage.getItem(key) || '[]');
      list.push(data);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (err) {}
    $('#doneName').textContent = data.nama || 'Tamu';
    if (data.hadir === 'Berhalangan') {
      $('#doneMsg').textContent = 'Terima kasih atas konfirmasinya. Doa restu Anda sangat berarti bagi kami.';
    } else if (data.hadir === 'Ragu-ragu') {
      $('#doneMsg').textContent = 'Terima kasih. Kami menantikan kehadiran Anda di hari bahagia kami.';
    } else {
      $('#doneMsg').textContent = 'Konfirmasi Anda sudah kami terima. Sampai jumpa di hari bahagia kami.';
    }
    form.classList.add('hide');
    $('#rsvpDone').classList.remove('hide');
  });

  /* ---------------- Salin nomor rekening ---------------- */
  $$('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var val = btn.getAttribute('data-copy');
      var label = btn.querySelector('svg').nextSibling;
      function ok() {
        var original = btn.childNodes[btn.childNodes.length - 1].textContent;
        btn.classList.add('copied');
        btn.childNodes[btn.childNodes.length - 1].textContent = ' Tersalin!';
        setTimeout(function () {
          btn.classList.remove('copied');
          btn.childNodes[btn.childNodes.length - 1].textContent = original;
        }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(val).then(ok).catch(fallback);
      } else { fallback(); }
      function fallback() {
        var t = document.createElement('textarea');
        t.value = val; document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); ok(); } catch (e) {}
        document.body.removeChild(t);
      }
    });
  });

  /* ---------------- Bagikan via WhatsApp ---------------- */
  $('#waBtn').addEventListener('click', function () {
    var text = 'Bismillah. Dengan penuh sukacita kami mengundang Anda ke pernikahan ' + COUPLE
      + ', Minggu 15 November 2026 di Ende, NTT. Lihat undangan digital: ' + location.href.split('?')[0];
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  });

  /* ---------------- Scroll reveal ---------------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  $$('.reveal').forEach(function (el) { io.observe(el); });

  /* ---------------- Kelopak bunga berjatuhan ---------------- */
  var petalLayer = null, petalTimer = null;
  var PETAL_COLORS = ['#D9805C', '#E9A87C', '#F3CDA8', '#C0573B', '#F2D9BE'];
  function petalSVG(color) {
    return '<svg width="100%" height="100%" viewBox="0 0 24 30">'
      + '<path d="M12 0C5 7 2 15 6 23c2 4 6 7 6 7s4-3 6-7c4-8 1-16-6-23Z" fill="' + color + '" opacity="0.85"/>'
      + '<path d="M12 2C9 9 9 18 12 28" stroke="rgba(255,255,255,.35)" stroke-width="1" fill="none"/></svg>';
  }
  function spawnPetal() {
    if (!petalLayer) return;
    var p = document.createElement('div');
    p.className = 'petal';
    var size = 9 + Math.random() * 14;
    var dur = 7 + Math.random() * 7;
    var drift = (Math.random() * 160 - 80) + 'px';
    var spin = (Math.random() * 720 - 360) + 'deg';
    p.style.left = (Math.random() * 100) + '%';
    p.style.width = size + 'px';
    p.style.height = (size * 1.25) + 'px';
    p.style.setProperty('--drift', drift);
    p.style.setProperty('--spin', spin);
    p.style.animation = 'petal-fall ' + dur + 's linear forwards';
    p.style.animationDelay = (-Math.random() * dur) + 's';
    p.innerHTML = petalSVG(PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)]);
    petalLayer.appendChild(p);
    setTimeout(function () { p.remove(); }, dur * 1000 + 200);
  }
  function startPetals() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (petalLayer) return;
    petalLayer = document.createElement('div');
    petalLayer.className = 'petals';
    document.body.appendChild(petalLayer);
    for (var i = 0; i < 12; i++) spawnPetal();
    petalTimer = setInterval(spawnPetal, 1400);
  }

  /* ---------------- Parallax 3D ringan ---------------- */
  (function parallax() {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /* a) cover : lapisan bergerak beda kedalaman (pointer / giroskop) */
    var pel = $('.cover__pelaminan'),
        arch = $('.cover .floral--arch'),
        bl = $('.cover .floral--bl'),
        br = $('.cover .floral--br');
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = false;
    function put(el, fx, fy) {
      if (!el) return;
      el.style.setProperty('--px', (cx * fx).toFixed(1) + 'px');
      el.style.setProperty('--py', (cy * fy).toFixed(1) + 'px');
    }
    function loop() {
      cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
      put(pel, 6, 4); put(arch, 12, 7); put(bl, 20, 13); put(br, 17, 11);
      if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) requestAnimationFrame(loop);
      else raf = false;
    }
    function kick() { if (!raf) { raf = true; requestAnimationFrame(loop); } }
    window.addEventListener('pointermove', function (e) {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
      kick();
    }, { passive: true });
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma == null || e.beta == null) return;
      tx = Math.max(-1, Math.min(1, e.gamma / 28));
      ty = Math.max(-1, Math.min(1, (e.beta - 45) / 28));
      kick();
    }, true);

    /* b) scroll : swag bunga tiap section bergerak (efek berlapis/3D) */
    var swags = $$('.floral--top'), sraf = false;
    function onScroll() {
      if (sraf) return; sraf = true;
      requestAnimationFrame(function () {
        var vh = window.innerHeight;
        swags.forEach(function (el) {
          var r = el.getBoundingClientRect();
          var off = (r.top - vh * 0.5) / vh;
          el.style.setProperty('--py', (off * -28).toFixed(1) + 'px');
        });
        sraf = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    onScroll();
  })();
})();
/* ============================================================
   BACKGROUND SINEMATIK — scroll-scrub 300 frame (cine/)
   Awan -> pelaminan putih, "diputar" oleh posisi scroll.
   + tilt parallax (pointer/gyro) + idle drift halus.
   ============================================================ */
(function cinematic() {
  'use strict';
  var canvas = document.getElementById('cine');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d', { alpha: false });
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var TOTAL = 300, BASE = 'cine/ezgif-frame-', EXT = '.jpg';
  var imgs = new Array(TOTAL);
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function pad3(n) { n = '' + n; while (n.length < 3) n = '0' + n; return n; }
  function srcOf(i) { return encodeURI(BASE + pad3(i + 1) + EXT); }

  /* ---- ukuran kanvas ---- */
  function resize() {
    var w = window.innerWidth, h = window.innerHeight;
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    lastDrawn = -1; draw(curFrame);
  }

  /* ---- gambar (cover-fit, ambil frame terdekat yang sudah termuat) ---- */
  var lastDrawn = -1;
  function pick(idx) {
    var im = imgs[idx], j;
    if (im && im.complete && im.naturalWidth) return im;
    for (j = idx; j >= 0; j--) { im = imgs[j]; if (im && im.complete && im.naturalWidth) return im; }
    for (j = idx; j < TOTAL; j++) { im = imgs[j]; if (im && im.complete && im.naturalWidth) return im; }
    return null;
  }
  function draw(f) {
    var idx = Math.max(0, Math.min(TOTAL - 1, Math.round(f)));
    var im = pick(idx);
    if (!im) return;
    if (idx === lastDrawn && im === lastIm) return;
    lastDrawn = idx; lastIm = im;
    var cw = canvas.width, ch = canvas.height;
    var iw = im.naturalWidth, ih = im.naturalHeight;
    var s = Math.max(cw / iw, ch / ih);
    var w = iw * s, h = ih * s;
    ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
  }
  var lastIm = null;

  /* ---- frame target dari scroll ---- */
  var curFrame = 0, tgtFrame = 0;
  function fromScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? (window.pageYOffset || document.documentElement.scrollTop) / max : 0;
    tgtFrame = Math.max(0, Math.min(1, p)) * (TOTAL - 1);
  }

  /* ---- tilt parallax (pointer + giroskop) ---- */
  var ptx = 0, pty = 0, ctx2 = 0, cty = 0, AMP = 20;
  if (!reduce) {
    window.addEventListener('pointermove', function (e) {
      ptx = (e.clientX / window.innerWidth - 0.5) * 2;
      pty = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma == null || e.beta == null) return;
      ptx = Math.max(-1, Math.min(1, e.gamma / 26));
      pty = Math.max(-1, Math.min(1, (e.beta - 45) / 26));
    }, true);
  }

  /* ---- loop utama (scrub + tilt + idle) ---- */
  var running = true;
  function tick(t) {
    if (!running) return;
    // scrub frame (easing)
    fromScroll();
    curFrame += (tgtFrame - curFrame) * 0.12;
    if (Math.abs(tgtFrame - curFrame) < 0.04) curFrame = tgtFrame;
    draw(curFrame);
    // tilt + idle drift
    if (!reduce) {
      var idleX = Math.sin(t / 4600) * 0.45, idleY = Math.cos(t / 6100) * 0.4;
      var gx = ptx + idleX, gy = pty + idleY;
      ctx2 += (gx - ctx2) * 0.05; cty += (gy - cty) * 0.05;
      canvas.style.transform = 'scale(1.08) translate3d(' + (ctx2 * AMP).toFixed(2) + 'px,' + (cty * AMP).toFixed(2) + 'px,0)';
    }
    requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange', function () {
    running = !document.hidden;
    if (running) requestAnimationFrame(tick);
  });

  /* ---- preload progresif (frame awal diprioritaskan) ---- */
  function preload() {
    var started = 0, CONC = 8;
    function next() {
      if (started >= TOTAL) return;
      var idx = started++;
      var im = new Image();
      im.decoding = 'async';
      im.onload = im.onerror = function () {
        if (idx <= Math.ceil(curFrame) + 2) { lastDrawn = -1; draw(curFrame); }
        next();
      };
      im.src = srcOf(idx);
      imgs[idx] = im;
    }
    for (var k = 0; k < CONC; k++) next();
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();
  preload();
  requestAnimationFrame(tick);
})();


