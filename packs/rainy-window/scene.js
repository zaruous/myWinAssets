// 🌧️ 비 오는 창가 — 장면 팩 (sceneApi 1)
// 비 내리는 밤 호수를 유리창 너머로 바라본다. 앞을 가리는 창틀·방 안 없이 화면 전체가 유리이고, 유리에 맺힌 빗방울만 있다.
// 차분하고 신비로운 분위기.
// · 창밖(사진)도 살아 있다: 호수에 빗방울 파문이 번지고, 등불·탑 창문이 깜박이고, 안개가 천천히 흐른다.
//   마우스를 움직이면 먼 창밖이 유리(빗방울)보다 덜 움직여(시차) 깊이감이 난다.
// · 유리는 김이 서려 있다: 매 프레임 창밖 화면을 작게 줄였다 늘려 흐리게 만든 뒤 덮는다(김 너머로도 움직임이 비침).
//   클릭하면 손바닥으로 닦은 자리만 선명해졌다가 다시 김이 서린다. 가장자리일수록 김이 조금 더 짙다.
// · 유리 위 빗방울은 아래가 무겁게 퍼진 불규칙한 모양이고, 뒤 풍경을 거꾸로 비춘다. 무거워지면 흘러내리며
//   작은 물방울을 삼키고 꼬리 물방울을 남긴다. 화면 밖 방 안 불빛 쪽 방울에는 따뜻한 반사광이 맺힌다.
window.LiveWallpaperScenes.register({
  id: 'rainy-window',
  create(host) {
    const root = host.root;
    root.style.background = '#0a0c12';
    root.innerHTML = `
      <style>
        /* 화면 비율이 16:9 가 아니어도 그림을 늘리지 않고 16:9 를 유지한 채 꽉 채움 (넘치는 가장자리는 잘림) */
        #rw-canvas { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: max(100%, 177.78vh); height: max(100%, 56.25vw);
          display: block; z-index: 0; pointer-events: none; }
      </style>
      <canvas id="rw-canvas"></canvas>`;
    const cv = root.querySelector('#rw-canvas'), c = cv.getContext('2d');
    const mouse = host.mouse;
    let w = host.w, h = host.h;

    const TAU = Math.PI * 2;
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const mk = (cw, ch) => { const k = document.createElement('canvas'); k.width = Math.max(1, Math.ceil(cw)); k.height = Math.max(1, Math.ceil(ch)); return k; };
    function glowDot(rgb) {
      const k = mk(128, 128), g = k.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      return k;
    }
    const DOT = { cyan: glowDot('140,230,255'), violet: glowDot('190,150,255'), gold: glowDot('255,200,120'), white: glowDot('230,235,255'), mist: glowDot('170,185,210') };
    // 아주 작은 물방울: 반짝점이 아니라 어둡고 흐린 얼룩 (김 서린 유리에 맺힌 이슬)
    function tinyDrop() {
      const k = mk(16, 16), g = k.getContext('2d');
      const gr = g.createRadialGradient(8, 8.6, 1, 8, 8, 8);
      gr.addColorStop(0, 'rgba(190,200,220,0.05)'); gr.addColorStop(0.75, 'rgba(0,4,12,0.2)'); gr.addColorStop(1, 'rgba(0,4,12,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(8, 8, 8, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.28)'; g.beginPath(); g.arc(6.5, 6, 1, 0, TAU); g.fill();
      return k;
    }
    const TINY = tinyDrop();
    // 작은 빗방울 (굴절이 안 보일 만큼 작은 방울은 미리 그린 그림을 찍기만 함 — 가벼움)
    function smallDrop() {
      const k = mk(32, 32), g = k.getContext('2d');
      let gr = g.createRadialGradient(16, 17, 2, 16, 16, 15);
      gr.addColorStop(0, 'rgba(170,185,210,0.28)'); gr.addColorStop(0.65, 'rgba(60,75,100,0.25)'); gr.addColorStop(0.9, 'rgba(0,4,14,0.5)'); gr.addColorStop(1, 'rgba(0,4,14,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(16, 16, 15, 0, TAU); g.fill();
      gr = g.createRadialGradient(11, 10, 0, 11, 10, 6);
      gr.addColorStop(0, 'rgba(255,255,255,0.85)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(11, 10, 6, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,245,230,0.2)'; g.beginPath(); g.ellipse(17, 25, 7, 3, 0, 0, TAU); g.fill();
      return k;
    }
    const SMALL = smallDrop();
    // 렌즈 방울 테두리 (안쪽 어두운 고리) — 경로 stroke 대신 그림 한 장을 크기만 바꿔 찍음
    function rimDrop() {
      const k = mk(64, 64), g = k.getContext('2d'), gr = g.createRadialGradient(32, 33, 18, 32, 32, 32);
      gr.addColorStop(0, 'rgba(0,4,14,0)'); gr.addColorStop(0.72, 'rgba(0,4,14,0.08)'); gr.addColorStop(0.92, 'rgba(0,4,14,0.38)'); gr.addColorStop(1, 'rgba(0,4,14,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return k;
    }
    const RIM = rimDrop();

    // ── 사진 정보 (비율 좌표)
    const WIN = { x0: 0, x1: 1, y0: 0, y1: 1 };   // 화면 전체가 유리 — 앞을 가리는 것 없이 빗방울만
    const WARM = [1.04, 0.92];                       // 화면 밖 오른쪽 아래 방 안 불빛 (가까운 빗방울에 따뜻한 반사)
    const LAKE = { u0: 0.05, u1: 0.95, v0: 0.62, v1: 0.86 };           // 창밖 사진 속 호수 수면 (파문 범위)
    // 창밖 사진 속 불빛 [u, v, 크기] — 위쪽은 등불·탑 창문, 수면(v>0.6)은 그 반사
    const LIGHTS = [[0.7057, 0.1915, 0.44], [0.7273, 0.1926, 0.41], [0.707, 0.2394, 0.71], [0.7303, 0.2898, 0.96], [0.1915, 0.4523, 0.53], [0.0831, 0.4688, 1], [0.0699, 0.4753, 0.73], [0.8876, 0.4942, 0.82], [0.8947, 0.4957, 0.37], [0.0855, 0.5064, 0.24], [0.8976, 0.5174, 0.37], [0.8905, 0.5207, 0.44], [0.0893, 0.5284, 0.29], [0.8876, 0.6351, 0.24], [0.8876, 0.6746, 1], [0.1908, 0.6809, 1], [0.0821, 0.6933, 1], [0.0821, 0.7248, 0.29], [0.7318, 0.753, 1], [0.7093, 0.8521, 0.41], [0.7091, 0.866, 0.53]];
    const DS = 4 / 9;    // 빗방울 크기 배율 (크기 관련 값은 모두 이것을 곱함)
    const LENS_R = 4;    // 이보다 큰 방울만 렌즈(뒤 풍경 굴절)로 그림 — 작은 방울은 그림만 찍어 가볍게
    const PAD = 0.035;   // 시차로 움직일 여유 (창밖 사진을 이만큼 크게)

    const outside = new Image(); outside.src = host.asset('assets/outside_view.jpg');
    let filterCss = 'none';
    const L = {};
    let built = '';
    let SW = 0, SH = 0;
    function rebuild() {
      w = host.w; h = host.h; cv.width = Math.round(w); cv.height = Math.round(h);
      SW = w * (1 + PAD * 2); SH = h * (1 + PAD * 2);
      L.sharp = mk(SW, SH);
      const sg = L.sharp.getContext('2d');
      if (filterCss !== 'none') sg.filter = filterCss;
      sg.drawImage(outside, 0, 0, SW, SH);
      sg.filter = 'none'; sg.fillStyle = 'rgba(10,20,40,0.1)'; sg.fillRect(0, 0, SW, SH);
      L.small1 = mk(w / 4, h / 4); L.small2 = mk(w / 12, h / 12); L.up = mk(w / 4, h / 4);
      L.lens = mk(w, h); L.mask = mk(w, h);   // 렌즈 방울: 굴절 그림을 모아 그린 뒤 방울 모양으로 한 번에 잘라냄
      L.wipe = mk(w / 4, h / 4);
      { const wg = L.wipe.getContext('2d'); wg.fillStyle = '#000'; wg.fillRect(0, 0, L.wipe.width, L.wipe.height); }   // 처음엔 맑은 유리에서 시작 → 김이 서서히 서림
      L.glass = mk(w, h);
      const gg = L.glass.getContext('2d');
      for (let i = 0; i < 3600; i++) { const r = rand(0.6, 1.8) * (Math.random() < 0.12 ? 1.8 : 1); gg.drawImage(TINY, rand(0, w) - r, rand(0, h) - r, r * 2, r * 2); }
      // 유리 가장자리일수록 김이 조금 더 짙게 (가리지 않을 만큼 은은하게)
      L.edge = mk(w, h);
      const eg = L.edge.getContext('2d'), er = eg.createRadialGradient(w / 2, h * 0.45, h * 0.45, w / 2, h * 0.45, w * 0.72);
      er.addColorStop(0, 'rgba(185,195,215,0)'); er.addColorStop(1, 'rgba(185,195,215,0.2)');
      eg.fillStyle = er; eg.fillRect(0, 0, w, h);
      // 방 안 불빛이 유리에 아주 희미하게 비침 (오른쪽 아래)
      const wg = eg.createRadialGradient(WARM[0] * w, WARM[1] * h, 0, WARM[0] * w, WARM[1] * h, w * 0.4);
      wg.addColorStop(0, 'rgba(255,170,100,0.12)'); wg.addColorStop(1, 'rgba(255,170,100,0)');
      eg.fillStyle = wg; eg.fillRect(0, 0, w, h);
      S.drops = []; for (let i = 0; i < 280; i++) S.drops.push(newDrop(rand(0, h)));
      built = `${w}x${h}|${filterCss}`;
    }

    // ── 상태
    const S = {
      last: performance.now(), t: 0, drops: [], spirits: [], streaks: [], ripples: [], mist: [], later: [],
      flash: 0, flash2: 0, flashTimer: rand(4, 7), autoWipe: 5, rain: 0.95, rainTarget: 0.95, rainTimer: 20, wipeT: 0, spawnAcc: 0, rippleAcc: 0,
      par: { x: 0, y: 0 }
    };
    // 빗방울 하나하나 모양이 다름: 아래쪽이 무겁게 퍼지고, 가장자리가 조금씩 울퉁불퉁
    function newDrop(y) {
      return { x: rand(WIN.x0 * w, WIN.x1 * w), y: y ?? rand(WIN.y0 * h, WIN.y1 * h), r: rand(3, 10) * DS * (Math.random() < 0.15 ? 1.5 : 1),
        vy: 0, slide: false, wob: rand(0, TAU), trail: 0, stick: rand(0, 6),
        n2: rand(0.02, 0.08), p2: rand(0, TAU), n3: rand(0.02, 0.06), p3: rand(0, TAU), tilt: rand(-0.15, 0.15) };
    }
    for (let i = 0; i < 12; i++) S.spirits.push({ u: rand(0, 1), v: rand(0.3, 0.6), vu: rand(-0.004, 0.004), ph: rand(0, TAU), r: rand(8, 20), col: Math.random() < 0.6 ? 'cyan' : (Math.random() < 0.5 ? 'violet' : 'gold') });
    for (let i = 0; i < 9; i++) S.mist.push({ u: rand(-0.2, 1.2), v: rand(0.42, 0.66), vu: rand(0.004, 0.012), sx: rand(0.25, 0.45), sy: rand(0.05, 0.09), a: rand(0.05, 0.1) });

    // 창밖 사진 좌표 → 화면 (시차 포함)
    const outX = u => u * SW - PAD * w + S.par.x, outY = v => v * SH - PAD * h + S.par.y;

    function wipeAt(x, y, r) {
      const g = L.wipe.getContext('2d');
      const gr = g.createRadialGradient(x / 4, y / 4, 0, x / 4, y / 4, r / 4);
      gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.85)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x / 4, y / 4, r / 4, 0, TAU); g.fill();
      const gl = L.glass.getContext('2d');
      gl.globalCompositeOperation = 'destination-out'; gl.beginPath(); gl.arc(x, y, r * 0.85, 0, TAU); gl.fill(); gl.globalCompositeOperation = 'source-over';
      S.drops = S.drops.filter(d => Math.hypot(d.x - x, d.y - y) > r * 0.85);
    }
    // 손바닥으로 닦는 동작: 경로 위 점들을 시간차로 닦음
    function wipePath(pts, dur, r) { pts.forEach(([x, y], i) => S.later.push({ t: i / (pts.length - 1) * dur, x, y, r })); }
    function wipeStripe() {   // 가로로 한 번 쓱
      const y = rand(0.25, 0.7) * h, x0 = w * rand(0.05, 0.2), x1 = w * rand(0.8, 0.95), n = 26;
      wipePath(Array.from({ length: n + 1 }, (_, i) => { const u = i / n; return [x0 + (x1 - x0) * u, y - Math.sin(u * Math.PI) * 30]; }), 0.8, 110);
    }
    function wipeCircle() {   // 둥글게 문질러 작은 창을 냄
      const cx = rand(0.25, 0.75) * w, cy = rand(0.3, 0.65) * h, R = rand(70, 130), n = 34;
      wipePath(Array.from({ length: n + 1 }, (_, i) => { const a = i / n * Math.PI * 3.2; return [cx + Math.cos(a) * R * (0.4 + 0.6 * i / n), cy + Math.sin(a) * R * 0.7 * (0.4 + 0.6 * i / n)]; }), 1.4, 85);
    }
    function wipeZigzag() {   // 위에서 아래로 지그재그로 넓게
      const x0 = w * rand(0.15, 0.4), x1 = x0 + w * rand(0.3, 0.45), y0 = h * rand(0.2, 0.35), rows = 3, pts = [];
      for (let k = 0; k <= rows; k++) for (let i = 0; i <= 10; i++) { const u = k % 2 ? 1 - i / 10 : i / 10; pts.push([x0 + (x1 - x0) * u, y0 + k * 85 + i * 2]); }
      wipePath(pts, 1.8, 95);
    }
    // 5초마다 누군가 김 서린 창을 닦음 (닦은 자리는 2~3분에 걸쳐 아주 천천히 다시 김이 서림 → 배경이 뿌옇게 덮이지 않음)
    const WIPE_EVERY = 5;
    function autoWipe() {
      [wipeStripe, wipeCircle, wipeZigzag][Math.floor(Math.random() * 3)]();
    }
    function lightning() { S.flash = 1; S.flash2 = rand(0.15, 0.35); }

    function update(dt) {
      S.rainTimer -= dt; if (S.rainTimer <= 0) { S.rainTimer = rand(20, 40); S.rainTarget = rand(0.85, 1); }   // 늘 세찬 비 (조금씩만 오감)
      S.rain += (S.rainTarget - S.rain) * dt * 0.15;
      // 시차: 먼 창밖은 마우스 반대쪽으로 조금 (창틀·빗방울은 고정)
      const tx = -(mouse.normX - 0.5) * 2 * PAD * w * 0.75, ty = -(mouse.normY - 0.5) * 2 * PAD * h * 0.6;
      S.par.x += (tx - S.par.x) * Math.min(1, dt * 1.5); S.par.y += (ty - S.par.y) * Math.min(1, dt * 1.5);
      // 유리에 새 빗방울
      S.spawnAcc += dt * 30 * S.rain;
      while (S.spawnAcc > 1) { S.spawnAcc--; if (S.drops.length < 260) S.drops.push(Object.assign(newDrop(), { r: rand(2.5, 7) * DS })); }
      const gl = L.glass.getContext('2d');
      for (let i = 0; i < 9 * S.rain; i++) { const r = rand(0.6, 1.6); gl.drawImage(TINY, rand(0, w) - r, rand(0, h) - r, r * 2, r * 2); }
      for (const d of S.drops) {
        if (!d.slide) {
          d.stick -= dt;
          d.r += dt * 0.35 * DS * S.rain;
          if (d.r > 11 * DS && d.stick <= 0 && Math.random() < dt * 0.5) d.slide = true;
        } else {
          d.vy = Math.min(d.vy + dt * 260, 40 + d.r / DS * 14) * (Math.random() < dt * 2 ? 0.2 : 1);
          d.y += d.vy * dt; d.wob += dt * 3; d.x += Math.sin(d.wob) * dt * 12;
          gl.globalCompositeOperation = 'destination-out'; gl.beginPath(); gl.ellipse(d.x, d.y, d.r * 0.9, d.r * 1.3, 0, 0, TAU); gl.fill(); gl.globalCompositeOperation = 'source-over';
          d.trail -= d.vy * dt;
          if (d.trail <= 0) { d.trail = rand(14, 40) * DS; const r = rand(0.6, Math.max(0.7, d.r * 0.35)); gl.drawImage(TINY, d.x - r + rand(-2, 2), d.y - d.r * 1.6 - r, r * 2, r * 2); d.r *= 0.985; }
          if (d.r < 6 * DS) { d.slide = false; d.vy = 0; d.stick = rand(2, 6); }
        }
      }
      for (let i = 0; i < S.drops.length; i++) {
        const a = S.drops[i]; if (!a.slide) continue;
        for (let j = 0; j < S.drops.length; j++) {
          const b = S.drops[j]; if (i === j || b.dead) continue;
          if (Math.abs(a.x - b.x) < a.r + b.r && Math.abs(a.y - b.y) < a.r + b.r) { a.r = Math.min(22 * DS, Math.hypot(a.r, b.r)); b.dead = true; }
        }
      }
      S.drops = S.drops.filter(d => !d.dead && d.y < h + 30);
      // 닦은 자리에 다시 김이 서림
      S.wipeT += dt;
      if (S.wipeT > 0.25) { S.wipeT = 0; const g = L.wipe.getContext('2d'); g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,0.004)'; g.fillRect(0, 0, L.wipe.width, L.wipe.height); g.globalCompositeOperation = 'source-over'; }   // 김이 아주 천천히 다시 서림 (2~3분) → 배경은 대부분 맑게
      S.autoWipe -= dt; if (S.autoWipe <= 0) { S.autoWipe = WIPE_EVERY; autoWipe(); }
      S.later = S.later.filter(q => { q.t -= dt; if (q.t <= 0) { wipeAt(q.x, q.y, q.r); return false; } return true; });
      S.flash = Math.max(0, S.flash - dt * 1.4);
      S.flashTimer -= dt; if (S.flashTimer <= 0) { S.flashTimer = rand(7, 10); lightning(); }   // 7~10초마다 먼 번개
      if (S.streaks.length < 150 * S.rain) S.streaks.push({ x: rand(-0.1, 1.1) * w, y: rand(-0.2, 0) * h, v: rand(900, 1400), l: rand(30, 70), a: rand(0.04, 0.11) });
      S.streaks = S.streaks.filter(s => { s.y += s.v * dt; s.x -= s.v * dt * 0.12; return s.y < h; });
      // 호수에 떨어지는 빗방울 파문
      S.rippleAcc += dt * 40 * S.rain;
      while (S.rippleAcc > 1) { S.rippleAcc--; const v = rand(LAKE.v0, LAKE.v1); S.ripples.push({ u: rand(LAKE.u0, LAKE.u1), v, age: 0, life: rand(0.7, 1.3), R: (6 + 16 * (v - LAKE.v0) / (LAKE.v1 - LAKE.v0)) * rand(0.7, 1.2) }); }
      S.ripples = S.ripples.filter(r => (r.age += dt) < r.life);
      for (const m of S.mist) { m.u += m.vu * dt * 0.4; if (m.u > 1.3) m.u = -0.3; }
      for (const sp of S.spirits) { sp.u += sp.vu * dt; if (sp.u < -0.05) sp.u = 1.05; if (sp.u > 1.05) sp.u = -0.05; }
    }

    // 창밖: 사진 + 깜박이는 불빛 + 수면 파문 + 흐르는 안개 + 정령 불빛 + 빗줄기 + 번개
    function drawOutside() {
      const ox = -PAD * w + S.par.x, oy = -PAD * h + S.par.y, t = S.t;
      c.drawImage(L.sharp, ox, oy);
      // 안개 (천천히 흐름)
      for (const m of S.mist) { c.globalAlpha = m.a; c.drawImage(DOT.mist, outX(m.u) - m.sx * w, outY(m.v) - m.sy * h, m.sx * w * 2, m.sy * h * 2); }
      c.globalAlpha = 1;
      // 수면 파문
      c.strokeStyle = 'rgb(185,200,225)'; c.lineWidth = 1;
      for (const r of S.ripples) {
        const k = r.age / r.life, rad = 1 + r.R * k;
        c.globalAlpha = 0.32 * (1 - k); c.beginPath(); c.ellipse(outX(r.u), outY(r.v), rad, rad * 0.26, 0, 0, TAU); c.stroke();
      }
      c.globalAlpha = 1;
      // 불빛: 위쪽은 은은하게 깜박, 수면 반사는 물결에 일렁이며 세로로 늘어짐
      c.globalCompositeOperation = 'lighter';
      for (const [u, v, s] of LIGHTS) {
        const x = outX(u), y = outY(v);
        if (v > 0.6) {
          const sh = 0.6 + 0.4 * Math.sin(t * 5 + u * 80) * Math.sin(t * 3.1 + v * 40), rw = (6 + 10 * s), rh = (14 + 26 * s) * (0.8 + 0.3 * sh);
          c.globalAlpha = 0.35 * sh; c.drawImage(DOT.gold, x - rw + Math.sin(t * 4 + v * 90) * 2, y - rh, rw * 2, rh * 2);
        } else {
          const f = 0.75 + 0.25 * Math.sin(t * 2.3 + u * 60) * Math.sin(t * 1.3 + v * 30), r = (10 + 22 * s) * f;
          c.globalAlpha = 0.45 * f; c.drawImage(DOT.gold, x - r, y - r, r * 2, r * 2);
        }
      }
      for (const sp of S.spirits) {
        const x = outX(sp.u), y = outY(sp.v + Math.sin(t * 0.3 + sp.ph) * 0.03), a = 0.3 + 0.25 * Math.sin(t * 0.8 + sp.ph);
        c.globalAlpha = a; c.drawImage(DOT[sp.col], x - sp.r * 2, y - sp.r * 2, sp.r * 4, sp.r * 4);
        c.globalAlpha = a * 0.9; c.drawImage(DOT.white, x - 2.5, y - 2.5, 5, 5);
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      c.strokeStyle = 'rgb(200,210,235)'; c.lineWidth = 1.2;
      for (const s of S.streaks) { c.globalAlpha = s.a; c.beginPath(); c.moveTo(s.x, s.y); c.lineTo(s.x + s.l * 0.12, s.y - s.l); c.stroke(); }
      c.globalAlpha = 1;
      if (S.flash > 0) {
        const f = S.flash * (S.flash > 0.85 ? 1 : 0.55 + 0.45 * Math.sin(t * 40) ** 2);
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = f * S.flash2;
        c.drawImage(L.sharp, ox, oy); c.fillStyle = 'rgba(150,140,255,0.25)'; c.fillRect(0, 0, w, h * 0.6);
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      }
    }
    // 김 서린 유리: 지금 창밖 화면을 1/12 로 줄였다 1/4 로 키워 흐리게(움직임이 그대로 비침) → 1/4 크기에서 김 색을 얹고
    // 닦은 자리(원래 1/4 크기)를 뚫은 뒤, 화면 크기로는 마지막에 한 번만 키워 그림 (화면 크기 작업을 3번 → 1번으로)
    function drawFog() {
      const s1 = L.small1.getContext('2d'), s2 = L.small2.getContext('2d'), u = L.up.getContext('2d'), uw = L.up.width, uh = L.up.height;
      s1.drawImage(cv, 0, 0, L.small1.width, L.small1.height);
      s2.drawImage(L.small1, 0, 0, L.small2.width, L.small2.height);
      u.imageSmoothingQuality = 'high';
      u.globalCompositeOperation = 'copy'; u.drawImage(L.small2, 0, 0, uw, uh);
      u.globalCompositeOperation = 'source-over'; u.fillStyle = 'rgba(165,175,200,0.09)'; u.fillRect(0, 0, uw, uh);
      u.globalCompositeOperation = 'destination-out'; u.drawImage(L.wipe, 0, 0, uw, uh);
      u.globalCompositeOperation = 'source-over';
      c.imageSmoothingQuality = 'high'; c.drawImage(L.up, 0, 0, w, h);
    }
    // 빗방울 모양 (반지름 1 기준 Path2D 를 방울마다 한 번 만들어 두고 크기만 바꿔 씀):
    // 아래가 퍼진 불규칙한 물방울, 흘러내릴 때는 위가 좁은 눈물 모양
    function shape(d) {
      const key = d.slide ? 1 : 0;
      if (d.shape && d.shapeKey === key) return d.shape;
      const p = new Path2D();
      for (let i = 0; i <= 16; i++) {
        const a = i / 16 * TAU, ca = Math.cos(a), sa = Math.sin(a);
        let m = 1 + 0.14 * sa + d.n2 * Math.sin(2 * a + d.p2) + d.n3 * Math.sin(3 * a + d.p3);
        if (d.slide && sa < 0) m *= 1 - 0.35 * -sa;
        const x = ca * m + sa * m * d.tilt * 0.3, y = sa * m;
        i ? p.lineTo(x, y) : p.moveTo(x, y);
      }
      p.closePath();
      d.shape = p; d.shapeKey = key;
      return p;
    }
    // 빗방울 그리기 (성능: 방울마다 clip 하면 GPU 가 무거움 → 렌즈 층에 모아 그리고 방울 모양 마스크로 한 번에 자름, 반사광도 한 번에 채움)
    function drawDrops() {
      const ox = -PAD * w + S.par.x, oy = -PAD * h + S.par.y;
      const cx = WARM[0] * w, cy = WARM[1] * h, D = w * 0.3;
      const lens = [], warm = [];
      const all = new Path2D(), hi = new Path2D(), lo = new Path2D();
      for (const d of S.drops) {
        const rx = d.r, ry = d.r * (d.slide ? 1.3 : 0.95);
        const dx = cx - d.x, dy = cy - d.y, dist = Math.hypot(dx, dy);
        if (dist < D) warm.push([d, rx, ry, dx / dist, dy / dist, (1 - dist / D) ** 2]);
        if (rx < LENS_R) { c.drawImage(SMALL, d.x - rx * 1.1, d.y - ry * 1.1, rx * 2.2, ry * 2.2); continue; }   // 작은 방울은 그림만
        lens.push([d, rx, ry]);
        all.addPath(shape(d), new DOMMatrix([rx, 0, 0, ry, d.x, d.y]));
        hi.moveTo(d.x - rx * 0.32 + rx * 0.2, d.y - ry * 0.38); hi.ellipse(d.x - rx * 0.32, d.y - ry * 0.38, rx * 0.2, ry * 0.13, -0.5, 0, TAU);
        lo.moveTo(d.x + rx * 0.6, d.y + ry * 0.55); lo.ellipse(d.x + rx * 0.1, d.y + ry * 0.55, rx * 0.5, ry * 0.18, 0, 0, TAU);
      }
      if (lens.length) {
        // 렌즈: clip 없이 굴절 그림을 렌즈 층에 모아 그리고 → 방울 모양 마스크로 한 번에 잘라 → 화면에 한 번 그림
        let x0 = w, y0 = h, x1 = 0, y1 = 0;
        for (const [d, rx, ry] of lens) { x0 = Math.min(x0, d.x - rx * 1.3); y0 = Math.min(y0, d.y - ry * 1.3); x1 = Math.max(x1, d.x + rx * 1.3); y1 = Math.max(y1, d.y + ry * 1.3); }
        x0 = Math.max(0, x0 | 0); y0 = Math.max(0, y0 | 0); x1 = Math.min(w, Math.ceil(x1)); y1 = Math.min(h, Math.ceil(y1));
        const bw = x1 - x0, bh = y1 - y0;
        const lg = L.lens.getContext('2d'), mg = L.mask.getContext('2d');
        lg.clearRect(x0, y0, bw, bh);
        for (const [d, rx, ry] of lens) {
          const sw = rx * 2 * 6;
          lg.setTransform(1, 0, 0, -1, d.x, d.y);
          lg.drawImage(L.sharp, d.x - ox - sw / 2, d.y - oy - sw / 2, sw, sw, -rx * 1.15, -ry * 1.15, rx * 2.3, ry * 2.3);
        }
        lg.setTransform(1, 0, 0, 1, 0, 0);
        mg.clearRect(x0, y0, bw, bh); mg.fillStyle = '#fff'; mg.fill(all);
        lg.globalCompositeOperation = 'destination-in'; lg.drawImage(L.mask, x0, y0, bw, bh, x0, y0, bw, bh); lg.globalCompositeOperation = 'source-over';
        c.drawImage(L.lens, x0, y0, bw, bh, x0, y0, bw, bh);
        for (const [d, rx, ry] of lens) c.drawImage(RIM, d.x - rx * 1.05, d.y - ry * 1.05, rx * 2.1, ry * 2.1);   // 안쪽 어두운 테두리
        c.fillStyle = '#fff';
        c.globalAlpha = 0.7; c.fill(hi);    // 위쪽 반사광
        c.globalAlpha = 0.16; c.fill(lo);   // 아래 투과광
        c.globalAlpha = 1;
      }
      // 방 안 불빛 가까운 방울: 그쪽 가장자리에 따뜻한 반사광
      if (warm.length) {
        c.globalCompositeOperation = 'lighter';
        for (const [d, rx, ry, nx, ny, k] of warm) {
          const rr = rx * (rx < LENS_R ? 1.2 : 0.75);
          c.globalAlpha = k * (rx < LENS_R ? 0.7 : 0.9);
          c.drawImage(DOT.gold, d.x + nx * rx * 0.5 - rr, d.y + ny * ry * 0.5 - rr, rr * 2, rr * 2);
        }
        c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      }
    }

    function frame() {
      if (!outside.complete || !outside.naturalWidth) { c.fillStyle = '#0a0c12'; c.fillRect(0, 0, w, h); return; }
      if (built !== `${host.w}x${host.h}|${filterCss}`) rebuild();
      const now = performance.now(), dt = Math.min(0.05, (now - S.last) / 1000);
      S.last = now; S.t += dt;
      update(dt);
      drawOutside();
      drawFog();
      c.globalAlpha = 0.9;
      c.drawImage(L.glass, 0, 0); c.globalAlpha = 1;
      drawDrops();
      c.drawImage(L.edge, 0, 0);
      if (S.flash > 0) { c.fillStyle = `rgba(160,150,255,${(S.flash * S.flash2 * 0.08).toFixed(3)})`; c.fillRect(0, 0, w, h); }
    }

    return {
      frame,
      setFilter(css) { css = css || 'none'; if (css !== filterCss) { filterCss = css; built = ''; } },
      click() {
        // 마우스(창 기준 비율) → 캔버스 좌표 (16:9 유지로 잘린 만큼 보정)
        const r = cv.getBoundingClientRect();
        const x = (mouse.normX * innerWidth - r.left) / r.width * w, y = (mouse.normY * innerHeight - r.top) / r.height * h;
        wipeAt(x, y, 120);
      },
      action(name) {
        if (name === 'wipe') autoWipe();
        if (name === 'lightning') lightning();
        if (name === 'heavy') { S.rainTarget = 1; S.rainTimer = 30; }
        if (name === 'light') { S.rainTarget = 0.3; S.rainTimer = 30; }
        if (name === 'spirits') for (let i = 0; i < 8; i++) S.spirits.push({ u: rand(0.2, 0.8), v: rand(0.3, 0.6), vu: rand(-0.01, 0.01), ph: rand(0, TAU), r: rand(10, 24), col: Math.random() < 0.5 ? 'cyan' : 'violet' });
      },
      destroy() { root.innerHTML = ''; root.style.background = ''; }
    };
  }
});
