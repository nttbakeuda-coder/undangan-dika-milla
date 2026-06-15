/* ============================================================
   Undangan Dika & Milla — mesin "Panggung 3D"
   Navigasi antar-scene + parallax kedalaman + interaksi.
   ============================================================ */
(function () {
  'use strict';

  /* ---- KONFIGURASI ---- */
  var WEDDING_DATE = new Date('2026-11-15T09:00:00+08:00'); // WITA (UTC+8)
  var COUPLE = 'Milla & Dika';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Kedalaman lapisan diorama ---------------- */
  $$('[data-depth]').forEach(function (el) {
    el.style.setProperty('--z', el.getAttribute('data-depth') + 'px');
  });

  /* ---------------- Nama tamu dari URL ---------------- */
  (function guest() {
    var p = new URLSearchParams(location.search);
    var raw = p.get('kepada') || p.get('to') || p.get('u') || p.get('tamu');
    if (raw) {
      var name = decodeURIComponent(raw.replace(/\+/g, ' ')).trim();
      if (name) $('#guestName').textContent = name;
    }
  })();

  /* ============================================================
     NAVIGASI SCENE (transisi 3D dolly)
     ============================================================ */
  var scenes = $$('.scene');
  var deck = $('#deck');
  var dotsWrap = $('#dots');
  var prevBtn = $('#prevBtn'), nextBtn = $('#nextBtn');
  var sceneTag = $('#sceneTag');
  var current = 0, animating = false, opened = false;

  // bangun titik navigasi
  scenes.forEach(function (sc, i) {
    var d = document.createElement('button');
    d.className = 'dot';
    d.setAttribute('aria-label', 'Ke bagian ' + (i + 1));
    d.addEventListener('click', function () { goTo(i); });
    dotsWrap.appendChild(d);
  });
  var dots = $$('.dot', dotsWrap);

  function placeScene(sc, off) {
    // transisi bersih & elegan: cross-fade + geser halus (tanpa blur/zoom/terbang)
    var t;
    if (off === 0) t = 'translate3d(0,0,0)';
    else if (off > 0) t = 'translate3d(0,34px,0)';   // berikutnya naik dari bawah
    else t = 'translate3d(0,-34px,0)';               // sebelumnya turun dari atas
    sc.style.transform = t;
    sc.style.filter = 'none';
    sc.style.zIndex = (off === 0) ? 5 : 1;
  }

  function render() {
    scenes.forEach(function (sc, i) {
      placeScene(sc, i - current);
      sc.classList.toggle('is-active', i === current);
    });
    dots.forEach(function (d, i) { d.classList.toggle('active', i === current); });
    // jaga titik aktif tetap terlihat saat banyak scene
    var act = dots[current];
    if (act) act.scrollIntoView({ block: 'nearest', inline: 'center' });
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === scenes.length - 1;
    sceneTag.textContent = scenes[current].getAttribute('data-label') || '';
  }

  function goTo(i) {
    i = Math.max(0, Math.min(scenes.length - 1, i));
    if (i === current || animating) return;
    if (!opened && i > 0) return; // belum dibuka
    animating = true;
    current = i;
    render();
    // reset scroll kartu ke atas
    var card = $('.card', scenes[current]);
    if (card) card.scrollTop = 0;
    setTimeout(function () { animating = false; }, 620);
  }
  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }

  prevBtn.addEventListener('click', prev);
  nextBtn.addEventListener('click', next);
  render();

  /* ---------------- Keyboard ---------------- */
  document.addEventListener('keydown', function (e) {
    if (!opened) { if (e.key === 'Enter' || e.key === ' ') openInvitation(); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'PageDown') { e.preventDefault(); next(); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); prev(); }
  });

  /* ---------------- Wheel (sadar scroll kartu) ---------------- */
  var wheelLock = false;
  function cardScrollable(dir) {
    var card = $('.card.card--scroll', scenes[current]);
    if (!card) return false;
    var room = card.scrollHeight - card.clientHeight - 1;
    if (room <= 0) return false;
    if (dir > 0) return card.scrollTop < room;      // masih bisa turun
    return card.scrollTop > 0;                        // masih bisa naik
  }
  window.addEventListener('wheel', function (e) {
    if (!opened) return;
    var dir = e.deltaY > 0 ? 1 : -1;
    if (cardScrollable(dir)) return;                 // biarkan kartu scroll
    e.preventDefault();
    if (wheelLock || Math.abs(e.deltaY) < 8) return;
    wheelLock = true;
    dir > 0 ? next() : prev();
    setTimeout(function () { wheelLock = false; }, 650);
  }, { passive: false });

  /* ---------------- Sentuh / swipe ---------------- */
  var tsx = 0, tsy = 0, tEl = null;
  window.addEventListener('touchstart', function (e) {
    var t = e.touches[0]; tsx = t.clientX; tsy = t.clientY;
    tEl = e.target.closest('.card--scroll');
  }, { passive: true });
  window.addEventListener('touchend', function (e) {
    if (!opened) return;
    var t = e.changedTouches[0];
    var dx = t.clientX - tsx, dy = t.clientY - tsy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      dx < 0 ? next() : prev();
    } else if (Math.abs(dy) > 60 && Math.abs(dy) > Math.abs(dx) * 1.4) {
      // swipe vertikal hanya jika kartu tak bisa scroll ke arah itu
      var dir = dy < 0 ? 1 : -1;
      if (!cardScrollable(dir)) dir > 0 ? next() : prev();
    }
  }, { passive: true });

  /* ============================================================
     PARALLAX 3D (pointer + giroskop)
     ============================================================ */
  var stage = $('#stage');
  var tRX = 0, tRY = 0, cRX = 0, cRY = 0, rafOn = false;
  var MAXP = 3.5; // derajat maks (lembut)

  function loop() {
    cRX += (tRX - cRX) * 0.08;
    cRY += (tRY - cRY) * 0.08;
    stage.style.setProperty('--rx', cRX.toFixed(2) + 'deg');
    stage.style.setProperty('--ry', cRY.toFixed(2) + 'deg');
    if (Math.abs(tRX - cRX) > 0.01 || Math.abs(tRY - cRY) > 0.01) { requestAnimationFrame(loop); }
    else { rafOn = false; }
  }
  function kick() { if (!rafOn && !reduce) { rafOn = true; requestAnimationFrame(loop); } }

  if (!reduce) {
    window.addEventListener('pointermove', function (e) {
      var nx = e.clientX / window.innerWidth - 0.5;
      var ny = e.clientY / window.innerHeight - 0.5;
      tRY = nx * MAXP * 2;       // putar Y mengikuti X
      tRX = -ny * MAXP * 1.4;    // putar X mengikuti Y
      kick();
    }, { passive: true });

    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma == null || e.beta == null) return;
      tRY = Math.max(-MAXP * 2, Math.min(MAXP * 2, e.gamma * 0.6));
      tRX = Math.max(-MAXP * 1.6, Math.min(MAXP * 1.6, (e.beta - 45) * 0.4));
      kick();
    }, true);
  }

  /* ============================================================
     BUKA UNDANGAN
     ============================================================ */
  function openInvitation() {
    if (opened) return;
    opened = true;
    $('#cover').classList.add('open');        // sampul memudar
    $('#world').classList.add('opened');      // tirai membuka
    document.body.classList.remove('locked');

    // izin giroskop iOS (butuh gesture)
    try {
      if (window.DeviceOrientationEvent && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission().catch(function () {});
      }
    } catch (e) {}

    tryPlayMusic();
    setTimeout(function () {
      $('#nav').classList.add('show');
      $('#fabs').classList.add('show');
      $('#sceneTag').classList.add('show');
      $('#hint').classList.add('show');
    }, 700);
    setTimeout(function () { $('#hint').classList.remove('show'); }, 5200);
    startPetals();
  }
  $('#openBtn').addEventListener('click', openInvitation);

  /* ---------------- Musik latar ---------------- */
  var bgm = $('#bgm'), musicBtn = $('#musicBtn'), musicOn = false;
  function setMusicUI(on) { musicOn = on; musicBtn.classList.toggle('playing', on); musicBtn.title = on ? 'Jeda musik' : 'Putar musik'; }
  function tryPlayMusic() {
    if (!bgm.getAttribute('src')) bgm.setAttribute('src', 'marry-me.mp3');
    var pr = bgm.play();
    if (pr && pr.then) pr.then(function () { setMusicUI(true); }).catch(function () { setMusicUI(false); });
  }
  musicBtn.addEventListener('click', function () {
    if (musicOn) { bgm.pause(); setMusicUI(false); } else { tryPlayMusic(); }
  });

  /* ---------------- Hitung mundur ---------------- */
  var elD = $('#cdD'), elH = $('#cdH'), elM = $('#cdM'), elS = $('#cdS');
  var grid = $('#cdGrid'), cdDone = $('#cdDone');
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function tick() {
    var diff = WEDDING_DATE.getTime() - Date.now();
    if (diff <= 0) { grid.classList.add('hide'); cdDone.classList.remove('hide'); return; }
    var s = Math.floor(diff / 1000);
    elD.textContent = pad(Math.floor(s / 86400));
    elH.textContent = pad(Math.floor((s % 86400) / 3600));
    elM.textContent = pad(Math.floor((s % 3600) / 60));
    elS.textContent = pad(s % 60);
  }
  tick(); setInterval(tick, 1000);

  /* ---------------- Simpan ke kalender ---------------- */
  (function cal() {
    function fmt(d) { return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, ''); }
    var end = new Date(WEDDING_DATE.getTime() + 6 * 3600 * 1000);
    var url = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent('Pernikahan ' + COUPLE)
      + '&dates=' + fmt(WEDDING_DATE) + '/' + fmt(end)
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
      list.push(data); localStorage.setItem(key, JSON.stringify(list));
    } catch (err) {}
    $('#doneName').textContent = data.nama || 'Tamu';
    if (data.hadir === 'Berhalangan') $('#doneMsg').textContent = 'Terima kasih atas konfirmasinya. Doa restu Anda sangat berarti bagi kami.';
    else if (data.hadir === 'Ragu-ragu') $('#doneMsg').textContent = 'Terima kasih. Kami menantikan kehadiran Anda di hari bahagia kami.';
    else $('#doneMsg').textContent = 'Konfirmasi Anda sudah kami terima. Sampai jumpa di hari bahagia kami.';
    form.classList.add('hide');
    $('#rsvpDone').classList.remove('hide');
  });

  /* ---------------- Salin nomor ---------------- */
  $$('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var val = btn.getAttribute('data-copy');
      function ok() {
        var node = btn.childNodes[btn.childNodes.length - 1];
        var original = node.textContent;
        btn.classList.add('copied'); node.textContent = ' Tersalin!';
        setTimeout(function () { btn.classList.remove('copied'); node.textContent = original; }, 1600);
      }
      function fallback() {
        var t = document.createElement('textarea'); t.value = val; document.body.appendChild(t); t.select();
        try { document.execCommand('copy'); ok(); } catch (e) {} document.body.removeChild(t);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(val).then(ok).catch(fallback);
      else fallback();
    });
  });

  /* ---------------- Bagikan via WhatsApp ---------------- */
  $('#waBtn').addEventListener('click', function () {
    var text = 'Bismillah. Dengan penuh sukacita kami mengundang Anda ke pernikahan ' + COUPLE
      + ', Minggu 15 November 2026 di Ende, NTT. Lihat undangan digital: ' + location.href.split('?')[0];
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  });

  /* ---------------- Kelopak bunga berjatuhan ---------------- */
  var petalLayer = $('#petals'), petalTimer = null;
  var PETAL_COLORS = ['#D9805C', '#E9A87C', '#F3CDA8', '#C0573B', '#F2D9BE', '#caa6d8'];
  function petalSVG(color) {
    return '<svg width="100%" height="100%" viewBox="0 0 24 30">'
      + '<path d="M12 0C5 7 2 15 6 23c2 4 6 7 6 7s4-3 6-7c4-8 1-16-6-23Z" fill="' + color + '" opacity="0.85"/>'
      + '<path d="M12 2C9 9 9 18 12 28" stroke="rgba(255,255,255,.35)" stroke-width="1" fill="none"/></svg>';
  }
  function spawnPetal() {
    if (!petalLayer) return;
    var p = document.createElement('div'); p.className = 'petal';
    var size = 9 + Math.random() * 14, dur = 7 + Math.random() * 7;
    p.style.left = (Math.random() * 100) + '%';
    p.style.width = size + 'px'; p.style.height = (size * 1.25) + 'px';
    p.style.setProperty('--drift', (Math.random() * 160 - 80) + 'px');
    p.style.setProperty('--spin', (Math.random() * 720 - 360) + 'deg');
    p.style.animation = 'petal-fall ' + dur + 's linear forwards';
    p.style.animationDelay = (-Math.random() * dur) + 's';
    p.innerHTML = petalSVG(PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)]);
    petalLayer.appendChild(p);
    setTimeout(function () { p.remove(); }, dur * 1000 + 200);
  }
  function startPetals() {
    if (reduce || petalTimer) return;
    for (var i = 0; i < 10; i++) spawnPetal();
    petalTimer = setInterval(spawnPetal, 1500);
  }

  /* pratinjau (dev): ?preview=N membuka & melompat ke scene N (untuk uji tampilan) */
  (function () {
    var pv = new URLSearchParams(location.search).get('preview');
    if (pv == null) return;
    openInvitation();
    current = Math.max(0, Math.min(scenes.length - 1, parseInt(pv, 10) || 0));
    render();
  })();
})();
