// 🎄 크리스마스 이브 비행 — 장면 팩 (sceneApi 1)
// 썰매에 앉은 1인칭 시점. 실사 배경 세 장을 소실점 기준으로 계속 확대·교차(끝없이 전진)하고,
// 사진 속 창문 불빛을 찾아 반짝이게 하며, 선물이 그 창문으로 날아가 배달됨.
// 순록 사진 한 장을 세로 띠로 나눠 몸통 들썩임·뒷다리 접힘/뻗음·고삐 출렁임을 보간 → 끊김 없이 질주
window.LiveWallpaperScenes.register({
  id: 'xmas-eve',
  create(host) {
    const root = host.root;
    root.style.background = '#05060f';
    root.innerHTML = `
      <style>
        #xmas-back, #xmas-team, #xmas-sleigh, #xmas-front { position: absolute; display: block; pointer-events: none; }
        /* 전역 canvas 규칙(z-index 3)을 덮어써 장면 안 순서를 고정: 배경 < 순록 < 썰매 < 앞쪽 눈·보케 */
        #xmas-back, #xmas-front { inset: 0; width: 100%; height: 100%; }
        #xmas-back { z-index: 0; }
        #xmas-team { z-index: 1; transform-origin: 50% 100%; }   /* 밤 보정은 원본 사진에 한 번만 구워 둠 (매 프레임 CSS 필터를 피함) */
        #xmas-sleigh { z-index: 2; left: 0; bottom: 0; width: 100%; filter: brightness(0.8) saturate(1.05); }
        #xmas-front { z-index: 3; }
        #xmas-warm { position: absolute; inset: 0; z-index: 4; pointer-events: none; mix-blend-mode: soft-light;
          background: linear-gradient(180deg, rgba(40, 50, 140, 0.12) 0%, rgba(255, 170, 90, 0.18) 60%, rgba(200, 60, 50, 0.2) 100%); }
      </style>
      <canvas id="xmas-back"></canvas>
      <canvas id="xmas-team"></canvas>
      <img id="xmas-sleigh" alt="">
      <canvas id="xmas-front"></canvas>
      <div id="xmas-warm"></div>`;

    const $ = id => root.querySelector('#' + id);
    const xmBack = $('xmas-back'), xbctx = xmBack.getContext('2d');
    const xmFront = $('xmas-front'), xfctx = xmFront.getContext('2d');
    const xmTeamEl = $('xmas-team'), xtctx = xmTeamEl.getContext('2d');
    const xmSleigh = $('xmas-sleigh');
    xmSleigh.src = host.asset('assets/xmas_sleigh_front.png');

    // 장면 좌표계는 호스트 캔버스의 설계 해상도(w×h)
    let w = host.w, h = host.h;
    const mouse = host.mouse;

    const XM_TEAM_W = 928, XM_TEAM_H = 549;
    xmTeamEl.width = XM_TEAM_W; xmTeamEl.height = XM_TEAM_H;
    const xmRand = (a, b) => a + Math.random() * (b - a);
    const xmLerp = (a, b, k) => a + (b - a) * k;
    const xmClamp = v => Math.max(0, Math.min(1, v));
    const XM_ZONES = [
      { src: 'assets/xmas_village.jpg', vpY: 0.52 },
      { src: 'assets/xmas_aurora.jpg',  vpY: 0.42 },
      { src: 'assets/xmas_moon.jpg',    vpY: 0.50 }
    ];
    const xm = {
      t: 0, last: performance.now(), speed: 1, boostT: 0, noseFlash: 0, gallop: 0,
      steer: 0, steerV: 0, roll: 0, pitch: 0, zone: 0, zoneTimer: 45, giftTimer: 3, dolly: 0,
      layers: [{ zone: 0 }, { zone: 0 }], snow: [], gifts: [], sparks: [], bob: [0, 0, 0, 0, 0]
    };
    let xmTeamImg = null, xmGiftImg = null;
    let xmTeamNight = null, xmTeamDark = null;     // 순록 원본에 밤 보정을 한 번만 적용한 캔버스 (앞다리용은 더 어둡게)
    function xmBake(img, filter) {
      const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
      const g = c.getContext('2d'); g.filter = filter; g.drawImage(img, 0, 0);
      return c;
    }
    // 반지름 64 짜리 빛 번짐 점을 한 번 그려 두고 크기·투명도만 바꿔 찍음 (매 프레임 그라데이션 생성 안 함)
    function xmGlowDot(rgb, inner) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 64 * inner, 64, 64, 64);
      gr.addColorStop(0, `rgba(${rgb}, 1)`); gr.addColorStop(1, `rgba(${rgb}, 0)`);
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      return c;
    }
    const XM_GLINT_DOT = xmGlowDot('255, 215, 150', 0);
    const XM_BOKEH_DOTS = { warm: xmGlowDot('255, 170, 80', 0.6), red: xmGlowDot('255, 80, 80', 0.6), green: xmGlowDot('120, 255, 150', 0.6) };
    // 캔버스에서 픽셀을 읽어야 하므로(창문 불빛 찾기) CORS 로 불러옴
    function loadImage(path, onload) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      if (onload) img.onload = () => onload(img);
      img.src = host.asset(path);
      return img;
    }
    XM_ZONES.forEach(z => {
      z.glints = [];
      z.img = loadImage(z.src, img => { z.glints = xmFindGlints(img); });
    });
    xmTeamImg = loadImage('assets/xmas_reindeer_team.png', img => {
      xmTeamNight = xmBake(img, 'brightness(0.62) contrast(1.08) saturate(0.8)');
      xmTeamDark = xmBake(img, 'brightness(0.28) contrast(1.08) saturate(0.55)');
    });
    xmGiftImg = loadImage('assets/xmas_gift.png');

    // 사진 속 따뜻한 불빛(창문·전구) 위치 → 반짝임·선물 목표
    function xmFindGlints(img) {
      try {
        const c = document.createElement('canvas'); c.width = 240; c.height = 135;
        const g = c.getContext('2d'); g.drawImage(img, 0, 0, 240, 135);
        const d = g.getImageData(0, 0, 240, 135).data, pts = [];
        for (let y = 4; y < 131; y++) for (let x = 2; x < 238; x++) {
          const i = (y * 240 + x) * 4;
          if (d[i] > 190 && d[i + 1] > 120 && d[i] - d[i + 2] > 70) pts.push({ u: (x + 0.5) / 240, v: (y + 0.5) / 135, ph: xmRand(0, 6.28), sp: xmRand(1, 3), big: 0 });
        }
        for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pts[i], pts[j]] = [pts[j], pts[i]]; }
        return pts.slice(0, 70);
      } catch (e) { return []; }
    }
    function xmFlake(z) { return { x: xmRand(-45, 45), y: xmRand(-20, 26), z, px: null, py: null, dr: xmRand(0.5, 1.4) }; }
    xm.snow = Array.from({ length: 480 }, () => xmFlake(xmRand(1.2, 60)));

    function xmasResize() {
      // w×h 가 이미 설계 해상도(1920×1080) → 화면 배율을 더 곱하면 고DPI에서 캔버스가 2배 이상 커져 무거워짐
      [xmBack, xmFront].forEach(c => { c.width = Math.round(w); c.height = Math.round(h); });
    }
    function xmGo(i) { xm.zone = i; xm.zoneTimer = 45; }
    // 색감 필터를 구역 사진에 구워 둔 캔버스 (필터가 바뀔 때만 다시 만듦)
    let xmFilter = 'none';
    function xmZoneImage(z) {
      if (!z.img || !z.img.complete || !z.img.naturalWidth) return null;
      if (!z.baked) z.baked = xmFilter && xmFilter !== 'none' ? xmBake(z.img, xmFilter) : z.img;
      return z.baked;
    }
    function xmBoost() { xm.boostT = 2.2; xm.noseFlash = 1; }
    // 배경 레이어 변환: 사진 좌표(u,v) → 화면 좌표
    function xmLayerXf(L) {
      const z = XM_ZONES[L.zone], img = z.img;
      const iw = img.naturalWidth || 1672, ih = img.naturalHeight || 941;
      const base = Math.max(w / iw, h / ih) * 1.1;
      const cx = w / 2 - xm.steer * w * 0.035, cy = h / 2 + xm.pitch;
      const vpX = w / 2 - xm.steer * w * 0.02, vpY = h * z.vpY + xm.pitch;
      const zoom = 1 + L.u * 0.2;
      return {
        img, zoom,
        map(u, v) {
          const bx = cx + (u - 0.5) * iw * base, by = cy + (v - 0.5) * ih * base;
          return { x: vpX + (bx - vpX) * zoom, y: vpY + (by - vpY) * zoom };
        }
      };
    }
    function xmDropGift() {
      const L = xm.layers.reduce((a, b) => (Math.sin(a.u * Math.PI) ** 2 > Math.sin(b.u * Math.PI) ** 2 ? a : b));
      const pts = (XM_ZONES[L.zone].glints || []).filter(q => q.v > 0.45);
      const target = pts.length ? pts[Math.floor(Math.random() * pts.length)] : { u: xmRand(0.3, 0.7), v: xmRand(0.6, 0.8), ph: 0, sp: 1, big: 0 };
      xm.gifts.push({ k: 0, dur: 1.4, layer: L, target, x0: w / 2 + xmRand(-40, 40), y0: h * 0.86, spin: xmRand(-0.5, 0.5) });
    }
    // 순록: x0~x1 순록 영역, hip 다리 시작 높이, legs 뒷다리 관절 x, ph 박자 어긋남, k 원근 크기
    const XM_DEER = [
      { x0: 128, x1: 302, hip: 356, legs: [{ x0: 140, x1: 202, px: 175 }, { x0: 202, x1: 268, px: 228 }], ph: 0.0, k: 1.0 },
      { x0: 318, x1: 416, hip: 203, legs: [{ x0: 334, x1: 366, px: 352 }, { x0: 366, x1: 404, px: 384 }], ph: 2.1, k: 0.55 },
      { x0: 440, x1: 506, hip: 116, legs: [{ x0: 450, x1: 470, px: 461 }, { x0: 470, x1: 494, px: 480 }], ph: 4.0, k: 0.35 },
      { x0: 524, x1: 616, hip: 203, legs: [{ x0: 536, x1: 572, px: 556 }, { x0: 572, x1: 610, px: 590 }], ph: 1.0, k: 0.55 },
      { x0: 628, x1: 808, hip: 360, legs: [{ x0: 662, x1: 744, px: 705 }, { x0: 744, x1: 800, px: 768 }], ph: 3.1, k: 1.0 }
    ];
    // 갤럽 한 주기의 다리 길이: 뒤로 차며 길게(1.06) → 앞으로 빠르게 접어 올림(0.72)
    const xmLegLen = p => { const s = Math.sin(p); return s > 0 ? 1 + 0.06 * s : 1 - 0.28 * Math.pow(-s, 1.4); };
    function xmDrawTeam() {
      const g = xtctx;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, XM_TEAM_W, XM_TEAM_H);
      if (!xmTeamNight) return;
      const src = xmTeamNight;
      const st = XM_DEER.map((d, i) => {
        const p = xm.gallop + d.ph;
        const bob = (-Math.sin(p + 0.9) * 5 - Math.max(0, Math.sin(p * 2)) * 1.5) * d.k;
        xm.bob[i] = bob;
        return { p, bob, len: [xmLegLen(p), xmLegLen(p + 0.45)] };
      });
      // 앞다리(몸통 너머, 반대 박자): 뒷다리를 작고 어둡게 복사 → 네 발로 달리는 느낌
      XM_DEER.forEach((d, i) => {
        const hh = XM_TEAM_H - d.hip, mid = (d.legs[0].x1 + d.legs[1].x0) / 2;
        [[-1, d.legs[0]], [1, d.legs[1]]].forEach(([side, L], j) => {
          const len = xmLegLen(st[i].p + Math.PI + j * 0.35) * 0.78, lw = L.x1 - L.x0;
          g.setTransform(0.8, 0, 0, len, mid + side * lw * 0.28, d.hip - hh * 0.06 + st[i].bob);
          g.drawImage(xmTeamDark, L.x0, d.hip, lw, hh, -(L.px - L.x0), 0, lw, hh);
        });
      });
      // 세로 띠마다 움직임 보간 (순록 사이·바깥 고삐는 들썩임 보간, 다리는 두 뒷다리 길이 보간)
      const knots = [[0, 0]];
      XM_DEER.forEach((d, i) => { knots.push([d.x0, st[i].bob], [d.x1, st[i].bob]); });
      knots.push([XM_TEAM_W, 0]);
      const bobAt = x => {
        for (let k = 1; k < knots.length; k++) if (x <= knots[k][0]) {
          const [xa, ya] = knots[k - 1], [xb, yb] = knots[k];
          return xb > xa ? xmLerp(ya, yb, (x - xa) / (xb - xa)) : yb;
        }
        return 0;
      };
      const SW = 3;
      for (let x = 0; x < XM_TEAM_W; x += SW) {
        const di = XM_DEER.findIndex(d => x >= d.x0 && x < d.x1);
        if (di < 0) {
          g.setTransform(1, 0, 0, 1, 0, bobAt(x + SW / 2));
          g.drawImage(src, x, 0, SW, XM_TEAM_H, x, 0, SW, XM_TEAM_H);
          continue;
        }
        const d = XM_DEER[di], s2 = st[di], hh = XM_TEAM_H - d.hip, L0 = d.legs[0], L1 = d.legs[1];
        const len = xmLerp(s2.len[0], s2.len[1], xmClamp((x - L0.px) / (L1.px - L0.px)));
        const ov = Math.round(10 * d.k + 2);   // 다리 윗부분을 몸통 밑으로 겹쳐 관절 이음매를 숨김
        g.setTransform(1, 0, 0, len, 0, d.hip + s2.bob);
        g.drawImage(src, x, d.hip - ov, SW, hh + ov, x, -ov, SW, hh + ov);
        g.setTransform(1, 0, 0, 1, 0, s2.bob);
        g.drawImage(src, x, 0, SW, d.hip + 1, x, 0, SW, d.hip + 1);
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    function xmProjSnow(f) {
      const fz = h * 0.95;
      return { x: w / 2 + (f.x + xm.steer * 6) * fz / f.z, y: h * 0.42 + xm.pitch + f.y * fz / f.z, s: fz / f.z };
    }
    function xmDrawSnow(c, near) {
      const streak = xm.speed > 1.6;
      for (const f of xm.snow) {
        if (near !== (f.z < 5)) continue;
        const q = xmProjSnow(f);
        if (q.x < -20 || q.x > w + 20 || q.y < -20 || q.y > h + 20) { f.px = null; continue; }
        const r = Math.min(8, Math.max(0.5, 0.08 * q.s * f.dr)), a = xmClamp(1.2 - f.z / 60) * 0.85;
        if (streak && f.px !== null) {
          c.strokeStyle = `rgba(240, 245, 255, ${(a * 0.7).toFixed(3)})`;
          c.lineWidth = r; c.lineCap = 'round';
          c.beginPath(); c.moveTo(f.px, f.py); c.lineTo(q.x, q.y); c.stroke();
        } else {
          c.fillStyle = `rgba(240, 245, 255, ${a.toFixed(3)})`;
          c.beginPath(); c.arc(q.x, q.y, r, 0, 7); c.fill();
        }
        f.px = q.x; f.py = q.y;
      }
    }
    const xmBokeh = Array.from({ length: 16 }, () => ({ x: Math.random(), y: Math.random(), r: xmRand(18, 60), c: Math.random(), ph: xmRand(0, 6), sp: xmRand(0.004, 0.012) }));

    function frame() {
      w = host.w; h = host.h;
      if (xmBack.width !== Math.round(w) || xmBack.height !== Math.round(h)) xmasResize();
      const now = performance.now();
      const dt = Math.min(0.05, (now - xm.last) / 1000);
      xm.last = now;
      // ── 업데이트
      xm.t += dt;
      xm.gallop += dt * Math.PI * 2 * (1.7 + xm.speed * 0.45);
      xm.boostT = Math.max(0, xm.boostT - dt);
      xm.noseFlash = Math.max(0, xm.noseFlash - dt * 1.4);
      xm.speed += ((xm.boostT > 0 ? 3 : 1) - xm.speed) * Math.min(1, dt * (xm.boostT > 0 ? 3 : 1.2));
      const prevSteer = xm.steer;
      xm.steer += ((mouse.normX - 0.5) * 2 - xm.steer) * Math.min(1, dt * 1.8);
      xm.steerV = (xm.steer - prevSteer) / Math.max(dt, 1e-3);
      xm.roll += (-xm.steer * 0.045 - xm.roll) * Math.min(1, dt * 2.5);
      xm.pitch += ((0.5 - mouse.normY) * h * 0.05 - xm.pitch) * Math.min(1, dt * 2);
      xm.zoneTimer -= dt;
      if (xm.zoneTimer <= 0) xmGo((xm.zone + 1) % XM_ZONES.length);
      xm.dolly = (xm.dolly + dt * xm.speed / 9) % 1;
      xm.layers.forEach((L, i) => {
        const u = (xm.dolly + i * 0.5) % 1;
        if (L.u !== undefined && u < L.u) L.zone = xm.zone;   // 투명해지는 순간 다음 구역 사진으로 교체
        L.u = u;
      });
      for (const f of xm.snow) {
        f.z -= dt * (9 + xm.speed * 10);
        f.y += dt * 1.4 * f.dr;
        f.x += Math.sin(xm.t * 0.8 + f.dr * 10) * dt * 0.6 - xm.steerV * dt * 2;
        if (f.z < 1.2 || f.y > 30 || Math.abs(f.x) > 50) Object.assign(f, xmFlake(xmRand(45, 60)));
      }
      xm.giftTimer -= dt;
      if (xm.giftTimer <= 0) { xmDropGift(); xm.giftTimer = xmRand(4, 8); }
      for (let i = xm.gifts.length - 1; i >= 0; i--) {
        const gf = xm.gifts[i];
        gf.k += dt / gf.dur;
        if (gf.k >= 1) {
          gf.target.big = 1;
          const q = xmLayerXf(gf.layer).map(gf.target.u, gf.target.v);
          for (let k = 0; k < 26; k++) xm.sparks.push({ x: q.x, y: q.y, vx: xmRand(-70, 70), vy: xmRand(-110, 0), life: xmRand(0.6, 1.3), c: ['#ffd36b', '#ff6b6b', '#fff3c4', '#7dffb0'][k % 4] });
          xm.gifts.splice(i, 1);
        }
      }
      for (const z of XM_ZONES) for (const q of (z.glints || [])) q.big = Math.max(0, q.big - dt * 0.6);
      for (let i = xm.sparks.length - 1; i >= 0; i--) {
        const sp = xm.sparks[i];
        sp.x += sp.vx * dt; sp.y += sp.vy * dt; sp.vy += 140 * dt; sp.life -= dt;
        if (sp.life <= 0) xm.sparks.splice(i, 1);
      }

      // ── 배경 사진 + 창문 반짝임 + 먼 눈
      const b = xbctx;
      b.save();
      b.fillStyle = '#05060f'; b.fillRect(0, 0, w, h);
      b.translate(w / 2, h / 2); b.rotate(xm.roll); b.translate(-w / 2, -h / 2);
      for (const L of xm.layers) {
        const a = Math.sin(L.u * Math.PI) ** 2;
        if (a < 0.003) continue;
        const X = xmLayerXf(L);
        const zimg = xmZoneImage(XM_ZONES[L.zone]);
        if (!zimg) continue;
        const p0 = X.map(0, 0), p1 = X.map(1, 1);
        b.globalAlpha = a;
        b.drawImage(zimg, p0.x, p0.y, p1.x - p0.x, p1.y - p0.y);
        b.globalCompositeOperation = 'lighter';
        for (const gl of (XM_ZONES[L.zone].glints || [])) {
          const tw = Math.max(0, Math.sin(xm.t * gl.sp + gl.ph));
          const k = tw * tw * 0.8 + gl.big * 2.2;
          if (k < 0.08) continue;
          const q = X.map(gl.u, gl.v), r = (3 + 9 * k) * X.zoom;
          b.globalAlpha = 0.55 * Math.min(1, k) * a;
          b.drawImage(XM_GLINT_DOT, q.x - r, q.y - r, r * 2, r * 2);
          b.globalAlpha = a;
          if (k > 0.5) {
            b.strokeStyle = `rgba(255, 240, 200, ${(0.4 * Math.min(1, k - 0.4) * a).toFixed(3)})`;
            b.lineWidth = 1;
            b.beginPath(); b.moveTo(q.x - r * 1.6, q.y); b.lineTo(q.x + r * 1.6, q.y);
            b.moveTo(q.x, q.y - r * 1.6); b.lineTo(q.x, q.y + r * 1.6); b.stroke();
          }
        }
        b.globalCompositeOperation = 'source-over';
      }
      b.globalAlpha = 1;
      xmDrawSnow(b, false);
      b.restore();

      // ── 순록·썰매 배치 (펫들은 화면 맨 아래 = 썰매 앞판 위에 서서 함께 탐)
      const sh = w * (239 / 1920);
      const tw = Math.min(w * 0.5, h * 0.95), th = tw * (XM_TEAM_H / XM_TEAM_W);
      const tx = w / 2 - tw / 2 - xm.steer * w * 0.05, ty = h - sh * 0.72 - th + xm.pitch * 0.3;
      // 캔버스 좌표(w×h 설계 크기)를 장면 크기에 맞게 % 로 배치
      xmTeamEl.style.width = `${(tw / w * 100).toFixed(3)}%`; xmTeamEl.style.height = `${(th / h * 100).toFixed(3)}%`;
      xmTeamEl.style.left = `${(tx / w * 100).toFixed(3)}%`; xmTeamEl.style.top = `${(ty / h * 100).toFixed(3)}%`;
      xmTeamEl.style.transform = `rotate(${(xm.roll * 0.6 + xm.steerV * -0.004).toFixed(4)}rad)`;
      xmSleigh.style.height = `${(sh / h * 100).toFixed(3)}%`;   // 순록 고삐 끝과 썰매 앞판 높이가 화면비와 무관하게 맞도록
      xmSleigh.style.transform = `translateY(${(Math.sin(xm.t * 1.7) * 2).toFixed(1)}px) rotate(${(xm.roll * 0.25).toFixed(4)}rad)`;
      xmDrawTeam();

      // ── 앞쪽: 선물 · 반짝이 · 루돌프 코 · 홀리데이 보케 · 가까운 눈 · 따뜻한 색
      const f = xfctx;
      f.clearRect(0, 0, w, h);
      for (const gf of xm.gifts) {
        const q = xmLayerXf(gf.layer).map(gf.target.u, gf.target.v);
        const k = Math.min(1, gf.k), ks = k * k * (3 - 2 * k);
        const x = xmLerp(gf.x0, q.x, ks), y = xmLerp(gf.y0, q.y, ks) - Math.sin(Math.PI * ks) * h * 0.18;
        const sz = xmLerp(70, 10, ks);
        f.save(); f.translate(x, y); f.rotate(gf.spin + ks * 4);
        f.globalAlpha = 0.35; f.fillStyle = '#ffe39a'; f.beginPath(); f.arc(0, 0, sz * 0.9, 0, 7); f.fill();
        f.globalAlpha = 1;
        if (xmGiftImg && xmGiftImg.complete && xmGiftImg.naturalWidth) f.drawImage(xmGiftImg, -sz / 2, -sz * 0.55, sz, sz * 1.1);
        f.restore();
      }
      for (const sp of xm.sparks) { f.globalAlpha = xmClamp(sp.life); f.fillStyle = sp.c; f.fillRect(sp.x, sp.y, 2.5, 2.5); }
      f.globalAlpha = 1;
      const nx = tx + tw * 0.505, ny = ty + th * 0.085 + xm.bob[2] * tw / XM_TEAM_W;
      const nk = 0.75 + 0.25 * Math.sin(xm.t * 4) + xm.noseFlash * 1.6, R = tw * (0.05 + 0.03 * nk);
      f.save(); f.globalCompositeOperation = 'lighter';
      const ng = f.createRadialGradient(nx, ny, 0, nx, ny, R);
      ng.addColorStop(0, `rgba(255, 70, 55, ${Math.min(0.95, 0.6 * nk).toFixed(3)})`);
      ng.addColorStop(0.4, `rgba(255, 40, 30, ${Math.min(0.6, 0.3 * nk).toFixed(3)})`);
      ng.addColorStop(1, 'rgba(255, 20, 20, 0)');
      f.fillStyle = ng; f.beginPath(); f.arc(nx, ny, R, 0, 7); f.fill();
      for (const bk of xmBokeh) {
        bk.x = (bk.x + bk.sp * 0.05 - xm.steerV * 0.0004 + 1) % 1;
        const x = bk.x * w, y = (bk.y + Math.sin(xm.t * 0.2 + bk.ph) * 0.02) * h;
        const dot = bk.c < 0.55 ? XM_BOKEH_DOTS.warm : (bk.c < 0.8 ? XM_BOKEH_DOTS.red : XM_BOKEH_DOTS.green);
        f.globalAlpha = 0.045 + 0.035 * Math.sin(xm.t * 0.8 + bk.ph);
        f.drawImage(dot, x - bk.r, y - bk.r, bk.r * 2, bk.r * 2);
      }
      f.restore();
      xmDrawSnow(f, true);
    }

    xmasResize();
    return {
      frame,
      setFilter(css) {
        if (css === xmFilter) return;
        xmFilter = css;
        XM_ZONES.forEach(z => { z.baked = null; });
      },
      click() { xmBoost(); },
      action(name) {
        if (name === 'gift') xmDropGift();
        if (name === 'boost') xmBoost();
        if (name === 'village') xmGo(0);
        if (name === 'aurora') xmGo(1);
        if (name === 'moon') xmGo(2);
      },
      destroy() { root.innerHTML = ''; root.style.background = ''; }
    };
  }
});
