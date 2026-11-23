// 🐋 바닷속 이야기 — 장면 팩 (sceneApi 1)
// 같은 scene.js 를 세 팩이 함께 씀: ocean-reef(햇살 산호초) / ocean-wreck(난파선) / ocean-abyss(심해).
// 팩 id 로 구역을 정하고 그 구역에 필요한 그림만 불러옴. (id 가 목록에 없으면 세 구역을 2.5분마다 도는 이야기 모드)
// 사진(실사 배경)은 가리지 않고 그대로 두고, 그 위에 "사진 속에서 일어나는 일"만 얹는다.
// · 산호초: 모래 위 커스틱 빛무늬(저해상도 층, 모래 마스크로 한 번에 자름) + 왼쪽 위 햇살 + 고래가 지나가면 모래 위로 그림자가 쓸고 지나감
// · 난파선: 선체 틈 빛기둥이 숨 쉬듯 밝아졌다 어두워짐, 원경 안개 속을 지나는 고래가 빛을 가림
// · 심해: 마린 스노우, 고래 몸은 거의 안 보이고 윤곽의 발광 점이 머리→꼬리로 물결치듯 켜짐, 클릭·펫 발걸음에 한 박자 늦게 빛이 응답
// 고래는 세로 띠로 잘라 띠마다 위아래로 어긋나게 그려 꼬리가 물결친다.
// 펫 위치는 host.pets?.() 가 있으면 사용 (없으면 펫 반응만 빠짐).
// 파일 전체를 함수 범위로 감쌈: 팩 여러 개가 같은 파일을 차례로 불러도 const 이름이 겹치지 않게
(() => {
const OCEAN_SCENE = {
  create(host) {
    const root = host.root;
    root.style.background = '#04121e';
    root.innerHTML = `
      <style>
        #ds-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; z-index: 0; pointer-events: none; }
      </style>
      <canvas id="ds-canvas"></canvas>`;
    const cv = root.querySelector('#ds-canvas'), c = cv.getContext('2d');
    const mouse = host.mouse;
    // 장면은 16:9 설계 좌표(DW×DH)로 그리고, 캔버스는 모니터 해상도(host.w×host.h) 그대로 씀.
    // 한 번의 변환(가로·세로 같은 배율)으로 화면을 꽉 채우며 찌그러지지 않음. 비율이 다르면 넘치는 부분은
    // 위쪽(물) 또는 좌우에서 잘리고, 바닥(해저·펫이 걷는 자리)은 항상 화면 맨 아래에 붙음.
    const DW = 1920, DH = 1080;
    const w = DW, h = DH;
    const V = { s: 1, ox: 0, oy: 0, top: 0, left: 0, right: DW, sw: DW, sh: DH };
    function updateView() {
      const sw = Math.max(1, Math.round(host.w)), sh = Math.max(1, Math.round(host.h));
      if (sw === V.sw && sh === V.sh && cv.width === sw) return;
      V.sw = sw; V.sh = sh; cv.width = sw; cv.height = sh;
      V.s = Math.max(sw / DW, sh / DH);
      V.ox = (sw - DW * V.s) / 2; V.oy = sh - DH * V.s;
      V.top = Math.max(0, -V.oy / V.s); V.left = Math.max(0, -V.ox / V.s); V.right = Math.min(DW, (sw - V.ox) / V.s);
    }
    const baseT = (x = 0, y = 0) => c.setTransform(V.s, 0, 0, V.s, V.ox + x * V.s, V.oy + y * V.s);
    const vy = f => V.top + f * (DH - V.top);            // 세로 비율(0~1) → 화면에 보이는 범위 안의 설계 좌표
    const toScene = (x, y) => [(x - V.ox) / V.s, (y - V.oy) / V.s];   // 화면(캔버스) 픽셀 → 설계 좌표

    const TAU = Math.PI * 2;
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp01 = v => Math.max(0, Math.min(1, v));
    const smooth = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
    const mk = (cw, ch) => { const k = document.createElement('canvas'); k.width = Math.max(1, Math.ceil(cw)); k.height = Math.max(1, Math.ceil(ch)); return k; };
    function glowDot(rgb) {
      const k = mk(64, 64), g = k.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.35, `rgba(${rgb},0.35)`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
      return k;
    }
    const DOT = { white: glowDot('235,245,255'), cyan: glowDot('110,235,255'), teal: glowDot('120,255,220'), silt: glowDot('150,165,170'), gold: glowDot('255,215,130') };
    function bubbleSprite() {
      const k = mk(32, 32), g = k.getContext('2d');
      let gr = g.createRadialGradient(16, 16, 8, 16, 16, 15);
      gr.addColorStop(0, 'rgba(220,245,255,0.04)'); gr.addColorStop(0.8, 'rgba(220,245,255,0.22)'); gr.addColorStop(0.95, 'rgba(240,252,255,0.7)'); gr.addColorStop(1, 'rgba(240,252,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(16, 16, 15, 0, TAU); g.fill();
      gr = g.createRadialGradient(11, 10, 0, 11, 10, 5);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
      return k;
    }
    const BUBBLE = bubbleSprite();

    // ── 커스틱 무늬 타일 (256×256, 이음매 없이 반복) — 한 번만 계산
    function causticTile(seed) {
      const N = 256, k = mk(N, N), g = k.getContext('2d'), im = g.createImageData(N, N), d = im.data;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const u = x / N * TAU, v = y / N * TAU;
        const a = Math.sin(3 * u + 1.6 * Math.sin(2 * v + seed) + 0.8 * Math.sin(5 * v - u));
        const b = Math.sin(4 * v + 1.4 * Math.sin(3 * u - seed) + 0.7 * Math.sin(2 * u + 3 * v));
        const e = Math.sin(2 * u + 5 * v + 1.2 * Math.sin(4 * u + seed * 2));
        const val = Math.pow(1 - Math.abs(a), 9) + Math.pow(1 - Math.abs(b), 9) + 0.6 * Math.pow(1 - Math.abs(e), 12);
        const i = (y * N + x) * 4;
        d[i] = 235; d[i + 1] = 255; d[i + 2] = 250; d[i + 3] = Math.min(255, val * 200);
      }
      g.putImageData(im, 0, 0);
      return k;
    }
    const CAUSTIC = [causticTile(0.7), causticTile(2.9)];

    // ── 구역 (사진 좌표는 화면 비율 0~1)
    const ZONES = [
      { id: 'reef', file: 'assets/deepsea_reef.jpg', water: 'rgb(40,150,172)', tint: 0.42, whale: 'side', ww: 0.42, wy: 0.10, alpha: 0.9, blur: 0.8, dur: 30,
        snow: { a: 0.22, vy: -4, col: 'white' } },
      { id: 'wreck', file: 'assets/deepsea_wreck.jpg', water: 'rgb(22,74,130)', tint: 0.66, whale: 'far', ww: 0.30, wy: 0.13, alpha: 0.72, blur: 1.6, dur: 40,
        snow: { a: 0.28, vy: 3, col: 'white' } },
      { id: 'abyss', file: 'assets/deepsea_abyss.jpg', water: 'rgb(6,16,42)', tint: 0.86, whale: 'side', ww: 0.55, wy: 0.14, alpha: 0.22, blur: 2.5, dur: 36,
        snow: { a: 0.32, vy: 9, col: 'white' } }
    ];
    const SAND = { y0: 0.6, y1: 1.0 };                  // 커스틱 층이 덮는 세로 범위
    // 산호초 사진 속 모래 면 (산호 위로 빛무늬가 번지지 않게 다각형으로 자름, 비율 좌표)
    const SAND_POLY = [[0.40, 0.70], [0.60, 0.70], [0.70, 0.78], [0.80, 0.84], [1.0, 0.88], [1, 1], [0, 1], [0, 0.88], [0.18, 0.84], [0.30, 0.77]];
    const SHAFTS = [[0.335, 0.42, 0.30, 0.86, 34], [0.40, 0.52, 0.37, 0.84, 26], [0.30, 0.46, 0.26, 0.80, 20]];   // 난파선 빛기둥 [위 x, 위 y, 아래 x, 아래 y, 폭]
    // 가슴지느러미 (스프라이트 원본 픽셀 좌표): 다각형으로 잘라 따로 그리고, 어깨(pivot)를 축으로 살살 돌림
    // 앞(가까운) 지느러미와 뒤 지느러미는 박자를 어긋나게. amp = 최대 회전(라디안)
    const FINS = {
      side: [
        { poly: [[962, 150], [990, 190], [935, 218], [890, 268], [850, 312], [790, 352], [700, 398], [620, 444], [545, 452], [542, 425], [580, 408], [650, 350], [700, 290], [740, 238], [790, 213], [870, 192]], pivot: [945, 182], amp: 0.075, ph: 0 },
        { poly: [[1000, 228], [1045, 232], [1048, 258], [1000, 302], [962, 362], [905, 398], [856, 400], [868, 372], [922, 330], [950, 272], [975, 240]], pivot: [1022, 238], amp: 0.06, ph: 2.3 }
      ],
      far: [
        { poly: [[800, 162], [812, 205], [762, 243], [722, 283], [660, 324], [600, 372], [522, 424], [438, 456], [424, 432], [470, 398], [540, 338], [590, 288], [640, 250], [700, 212], [760, 178]], pivot: [780, 188], amp: 0.075, ph: 0 },
        { poly: [[870, 226], [945, 222], [968, 260], [1002, 298], [1055, 350], [1032, 362], [985, 332], [940, 298], [898, 262]], pivot: [912, 236], amp: 0.06, ph: 2.3 }
      ]
    };
    // 작은 물고기 (구역별 종류·수·크기). 화면에 4~8마리가 살랑살랑
    const FISH = [
      { kinds: ['tang_blue', 'tang_yellow', 'butterfly', 'clown'], n: [5, 8], len: [90, 145], tint: 0.16, alpha: 1 },
      { kinds: ['jack', 'snapper'], n: [4, 6], len: [100, 160], tint: 0.55, alpha: 0.85 },
      { kinds: ['lantern', 'hatchet'], n: [4, 6], len: [75, 115], tint: 0.55, alpha: 0.85 }
    ];
    const FISH_Y = [0.14, 0.8];                         // 헤엄치는 높이 범위 (맨 아래 펫 자리는 피함)
    // 심해 생물: 해파리(검은 바탕 → 가산 합성), 빗해파리, 아귀(미끼 끝 = 스프라이트의 LURE_TIP)
    const JELLY = { jelly_cyan: { bell: 0.40, h: [230, 330] }, jelly_red: { bell: 0.38, h: [220, 300] }, jelly_glass: { bell: 0.40, h: [150, 210] } };
    const LURE_TIP = [513, 46], ANGLER_W = 430;
    // 난파선: 사진 속 켈프(흔들 영역, 비율 좌표 x0,x1,y0,y1), 선체 틈(기포), 선체 구멍(보물 반짝임), 은빛 물고기 떼가 도는 열린 물
    const KELP = [[0.0, 0.118, 0.43, 0.888, 0], [0.562, 0.668, 0.53, 0.888, 2.1]];
    const HULL_LEAKS = [[0.42, 0.53], [0.30, 0.565], [0.47, 0.50]];
    const TREASURE = [[0.395, 0.668], [0.262, 0.71]];
    // 물고기 무리 (구역별). 모두 같은 물리: 목표점을 향한 끌림 + 이웃과 간격(분리) + 속도 제한, 몸을 돌릴 때 폭이 얇아졌다 반대로 펴짐, 꼬리 젓기, 거리감(크기·투명도)
    //  · hover  = 산호 위에 구름처럼 떠서 제자리 맴돎 (앤티아스). 마우스가 오면 산호 쪽으로 내려앉고, 클릭하면 산호 속으로 숨었다 올라옴
    //  · ball   = 가끔 나타나는 정어리 떼: 옆에서 줄지어 들어와 공처럼 소용돌이치다 반대쪽으로 빠져나감. 돌 때마다 은빛이 물결처럼 번쩍
    //  · school = 열린 물을 크게 도는 무리 (난파선 전갱이)
    const SCHOOLS = [
      { zone: 0, kind: 'anthias', mode: 'hover', size: 28, tint: 0.08, alpha: 1, flash: 0, speed: 70,
        clouds: [[0.20, 0.47, 125, 48, 22], [0.80, 0.465, 125, 48, 22]] },
      { zone: 0, kind: 'sardine', mode: 'ball', size: 30, tint: 0.14, alpha: 0.95, flash: 0.75, speed: 300, n: 200,
        ball: [0.56, 0.27, 150], every: [70, 110], swirl: 24 },
      { zone: 1, kind: 'jack', mode: 'school', size: 46, tint: 0.5, alpha: 0.85, flash: 0.6, speed: 230, n: 42,
        cx: 0.7, cy: 0.42, rx: 0.2, ry: 0.13, spread: [90, 45] }
    ];
    // 산호초 바다거북 (한 마리). turtle_swim.png = 지느러미 한 번 젓는 32프레임 (8열×4행, 칸 400×291, 몸통은 칸 위에서 24px 아래부터 197px)
    //   — 사진을 자르지 않고 부드럽게 휘어 미리 만든 프레임이라 틈·삐죽한 가장자리가 없음 (팩 밖 ocean-pack-sources/turtle_frames.py 로 생성)
    const TURTLE = { w: 320, dur: [42, 56], y: [0.34, 0.5], every: [55, 90], frames: 32, cols: 8, cw: 400, ch: 291, top: 24, bodyH: 197 };
    // 큰 생물 (가끔 한 마리씩 지나감). 프레임 시트는 사진을 휘어 미리 만든 헤엄 동작 (팩 밖 ocean-pack-sources/*_frames.py)
    const SHARK = { zone: 1, len: 440, y: [0.5, 0.7], dur: [18, 24], every: [50, 80] };
    const RAY = { zone: 1, w: 420, y: [0.12, 0.28], dur: [28, 36], every: [45, 70], frames: 24, cols: 6, cw: 700, ch: 317, cy: 159.5 };
    const SQUID = { zone: 2, w: 900, y: [0.3, 0.48], dur: [45, 55], every: [60, 100], frames: 32, cols: 6, cw: 640, ch: 309, cy: 145, base: 0.15 };
    const ZONE_DUR = 150;                               // 구역 하나에 머무는 시간(초)
    const FADE = 3;                                     // 구역 전환 크로스페이드(초)

    const PACK_ZONE = { 'ocean-reef': 0, 'ocean-wreck': 1, 'ocean-abyss': 2 };
    const FIXED = PACK_ZONE[host.manifest?.id] ?? null;          // 한 구역만 보여 주는 팩
    const ZON = i => FIXED === null || FIXED === i;              // 이 구역을 쓰는가
    const IMG = {};
    const load = (key, p) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.src = host.asset(p); IMG[key] = im; };
    ZONES.forEach((z, i) => { if (ZON(i)) { load(z.id, z.file); load(z.whale, `assets/whale_${z.whale}.png`); FISH[i].kinds.forEach(n => load('fish_' + n, `assets/fish_${n}.png`)); } });
    SCHOOLS.forEach(sc => { if (ZON(sc.zone)) load('fish_' + sc.kind, `assets/fish_${sc.kind}.png`); });
    if (ZON(0)) { load('turtleSwim', 'assets/turtle_swim.png'); load('below', 'assets/whale_below.png'); }
    if (ZON(1)) { load('fish_shark', 'assets/fish_shark.png'); load('raySwim', 'assets/ray_swim.png'); }
    if (ZON(2)) { ['jelly_cyan', 'jelly_red', 'jelly_glass', 'comb', 'anglerfish'].forEach(n => load(n, `assets/${n}.png`)); load('squidSwim', 'assets/squid_swim.png'); }
    const ready = () => Object.values(IMG).every(im => im.complete && im.naturalWidth);

    let filterCss = 'none', built = '';
    const L = {};
    // 물빛으로 물들이고 위는 밝게 아래는 어둡게, 거리만큼 흐리게 (테두리 8px 여유)
    function tintLayer(a, z) {
      const W = a.width, H = a.height, g = a.getContext('2d');
      g.globalCompositeOperation = 'source-atop';
      g.globalAlpha = z.tint; g.fillStyle = z.water; g.fillRect(0, 0, W, H); g.globalAlpha = 1;
      const lg = g.createLinearGradient(0, -a.oy, 0, a.fullH - a.oy);
      lg.addColorStop(0, 'rgba(210,245,255,0.16)'); lg.addColorStop(0.5, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,10,25,0.25)');
      g.fillStyle = lg; g.fillRect(0, 0, W, H);
      const out = mk(W + 16, H + 16), og = out.getContext('2d');
      og.filter = `blur(${z.blur}px)`; og.drawImage(a, 8, 8);
      return out;
    }
    // 고래 = 몸통(지느러미를 도려내되 뿌리 부분은 남겨 구멍이 안 보이게) + 지느러미 조각들
    function buildWhale(z) {
      const src = IMG[z.whale], W = Math.round(w * z.ww), H = Math.round(W * src.naturalHeight / src.naturalWidth), k = W / src.naturalWidth;
      const full = mk(W, H), fg = full.getContext('2d');
      fg.filter = filterCss; fg.drawImage(src, 0, 0, W, H); fg.filter = 'none';
      const body = mk(W, H), bg = body.getContext('2d');
      bg.drawImage(full, 0, 0);
      const fins = [];
      for (const f of FINS[z.whale]) {
        const pts = f.poly.map(([x, y]) => [x * k, y * k]), path = new Path2D();
        pts.forEach(([x, y], i) => i ? path.lineTo(x, y) : path.moveTo(x, y)); path.closePath();
        const xs = pts.map(q => q[0]), ys = pts.map(q => q[1]);
        const LW = Math.max(3, 6 * k);   // 다각형 가장자리를 조금 넓혀 잘라 원래 지느러미 테두리가 몸통에 남지 않게
        const x0 = Math.floor(Math.min(...xs) - LW), y0 = Math.floor(Math.min(...ys) - LW), x1 = Math.ceil(Math.max(...xs) + LW), y1 = Math.ceil(Math.max(...ys) + LW);
        const fin = mk(x1 - x0, y1 - y0), g = fin.getContext('2d');
        g.translate(-x0, -y0); g.lineWidth = LW * 2; g.lineJoin = 'round'; g.fill(path); g.stroke(path); g.globalCompositeOperation = 'source-in'; g.drawImage(full, 0, 0);
        fin.oy = y0; fin.fullH = H;
        bg.globalCompositeOperation = 'destination-out'; bg.lineWidth = LW * 2; bg.lineJoin = 'round'; bg.fill(path); bg.stroke(path);
        // 뿌리 주변은 몸통에 그대로 남겨 둠 (회전해도 어깨 쪽에 틈이 안 생기게)
        const px = f.pivot[0] * k, py = f.pivot[1] * k, rr = (f.root ?? 70) * k;
        bg.globalCompositeOperation = 'destination-over';
        bg.save(); bg.beginPath(); bg.arc(px, py, rr, 0, TAU); bg.clip(); bg.drawImage(full, 0, 0); bg.restore();
        bg.globalCompositeOperation = 'source-over';
        fins.push({ img: tintLayer(fin, z), x0: x0 - 8, y0: y0 - 8, px, py, amp: f.amp, ph: f.ph, behind: !!f.behind });
      }
      body.oy = 0; body.fullH = H;
      return { body: tintLayer(body, z), fins };
    }
    function rebuild() {
      updateView();
      // 배경: 색감 필터를 한 번 구워 둠
      L.bg = ZONES.map((z, zi) => {
        if (!ZON(zi)) return null;
        const k = mk(w, h), g = k.getContext('2d'); g.filter = filterCss; g.drawImage(IMG[z.id], 0, 0, w, h); g.filter = 'none';
        if (z.id === 'reef') {   // 흰 모래가 밝아 펫이 묻히지 않게 맨 아래를 살짝 어둡게
          const lg = g.createLinearGradient(0, h * 0.82, 0, h);
          lg.addColorStop(0, 'rgba(0,40,55,0)'); lg.addColorStop(1, 'rgba(0,40,55,0.32)');
          g.fillStyle = lg; g.fillRect(0, h * 0.82, w, h * 0.18);
        }
        return k;
      });
      // 고래: 구역 물빛으로 물들이고, 위는 밝게 아래는 어둡게, 거리만큼 흐리게 → 한 번 구워 둠
      L.whale = ZONES.map((z, zi) => ZON(zi) ? buildWhale(z) : null);
      // 물고기: 구역 물빛으로 살짝 물들여 구워 둠
      L.fish = ZONES.map((z, zi) => {
        const o = {}; if (!ZON(zi)) return o;
        for (const n of FISH[zi].kinds) {
          const src = IMG['fish_' + n], k = mk(src.naturalWidth, src.naturalHeight), g = k.getContext('2d');
          g.filter = filterCss; g.drawImage(src, 0, 0); g.filter = 'none';
          g.globalCompositeOperation = 'source-atop'; g.globalAlpha = FISH[zi].tint; g.fillStyle = z.water; g.fillRect(0, 0, k.width, k.height);
          o[n] = k;
        }
        return o;
      });
      L.fbuf = mk(200, 200);
      if (ZON(1)) {   // 상어: 난파선 물빛으로 물들여 개별 물고기와 같은 방식(띠 애니메이션)으로 그림
        const src = IMG.fish_shark, k = mk(src.naturalWidth, src.naturalHeight), g = k.getContext('2d');
        g.filter = filterCss; g.drawImage(src, 0, 0); g.filter = 'none';
        g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.45; g.fillStyle = ZONES[1].water; g.fillRect(0, 0, k.width, k.height);
        L.fish[1].shark = k;
      }
      const tintSheet = (src, col, a) => { const k = mk(src.naturalWidth, src.naturalHeight), g = k.getContext('2d'); g.filter = filterCss; g.drawImage(src, 0, 0); g.filter = 'none'; g.globalCompositeOperation = 'source-atop'; g.globalAlpha = a; g.fillStyle = col; g.fillRect(0, 0, k.width, k.height); return k; };
      if (ZON(1)) L.ray = tintSheet(IMG.raySwim, ZONES[1].water, 0.58);
      if (ZON(2)) L.squid = tintSheet(IMG.squidSwim, 'rgb(8,24,52)', 0.55);
      // 물고기 떼: 구역 물빛으로 물들여 작게 구워 둠 (떼는 띠 애니메이션 없이 한 장씩 찍음)
      L.mini = SCHOOLS.map(sc => {
        if (!ZON(sc.zone)) return null;
        const src = IMG['fish_' + sc.kind], W = Math.round(sc.size * 1.2), H = Math.round(W * src.naturalHeight / src.naturalWidth);
        const k = mk(W, H), g = k.getContext('2d'); g.filter = filterCss; g.drawImage(src, 0, 0, W, H); g.filter = 'none';
        g.globalCompositeOperation = 'source-atop'; g.globalAlpha = sc.tint; g.fillStyle = ZONES[sc.zone].water; g.fillRect(0, 0, W, H);
        return k;
      });
      // 심해: 빛이 닿은 자리만 드러날 '밝힌 사진' (1/2 해상도) + 빛 마스크 버퍼
      L.abyssLit = mk(w / 2, h / 2);
      if (ZON(2)) {
        const g = L.abyssLit.getContext('2d');
        g.filter = `${filterCss === 'none' ? '' : filterCss + ' '}brightness(3.6) saturate(1.25)`; g.drawImage(IMG.abyss, 0, 0, w / 2, h / 2); g.filter = 'none';
        g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(70,200,230,0.14)'; g.fillRect(0, 0, w / 2, h / 2);
      }
      L.lightBuf = mk(w / 2, h / 2);
      L.pool = mk(160, 40);   // 난파선: 빛기둥이 닿는 바닥의 일렁이는 빛 웅덩이 (작은 층, 초당 15번 갱신)
      if (ZON(2)) {   // 아귀: 심해 물빛으로 어둡게 물들여 둠 (미끼 빛이 닿는 앞쪽만 드러남)
        const src = IMG.anglerfish, s2 = ANGLER_W / src.naturalWidth, W = ANGLER_W, H = Math.round(src.naturalHeight * s2);
        L.angler = mk(W, H); const g = L.angler.getContext('2d');
        g.filter = filterCss; g.drawImage(src, 0, 0, W, H); g.filter = 'none';
        g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(20,60,90,0.35)'; g.fillRect(0, 0, W, H);
        L.anglerTip = [LURE_TIP[0] * s2, LURE_TIP[1] * s2];
        L.angBuf = mk(W, H);
      }
      if (ZON(0)) {   // 바다거북 프레임 시트: 색감 필터 + 산호초 물빛을 한 번 구워 둠
        const src = IMG.turtleSwim; L.turtle = mk(src.naturalWidth, src.naturalHeight); const g = L.turtle.getContext('2d');
        g.filter = filterCss; g.drawImage(src, 0, 0); g.filter = 'none';
        g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 0.14; g.fillStyle = ZONES[0].water; g.fillRect(0, 0, L.turtle.width, L.turtle.height);
      }
      // 산호초 모래 위 고래 그림자 (아래에서 본 실루엣을 납작하게 눌러 흐리게)
      if (ZON(0)) {
        const Sw = w * 0.46, Sh = Sw * 0.2, t = mk(Sw, Sh), tg = t.getContext('2d');
        tg.drawImage(IMG.below, 0, 0, Sw, Sh); tg.globalCompositeOperation = 'source-in'; tg.fillStyle = 'rgb(0,48,62)'; tg.fillRect(0, 0, Sw, Sh);
        L.shadow = mk(Sw + 80, Sh + 80); const sg = L.shadow.getContext('2d'); sg.filter = 'blur(16px)'; sg.drawImage(t, 40, 40);
      }
      // 커스틱 층 (모래 면만, 1/4 해상도) + 모래 마스크
      L.cw = Math.round(w / 4); L.ch = Math.round(h * (SAND.y1 - SAND.y0) / 4);
      L.caustic = mk(L.cw, L.ch);
      L.sandMask = mk(L.cw, L.ch);
      {
        // 다각형 모래 면을 흐리게 칠해 가장자리를 부드럽게 → 멀어질수록(위쪽) 약하게
        const g = L.sandMask.getContext('2d'), sx = L.cw, sy = L.ch / (SAND.y1 - SAND.y0);
        g.filter = 'blur(6px)'; g.fillStyle = '#000'; g.beginPath();
        SAND_POLY.forEach(([u, v], i) => i ? g.lineTo(u * sx, (v - SAND.y0) * sy) : g.moveTo(u * sx, (v - SAND.y0) * sy));
        g.closePath(); g.fill(); g.filter = 'none';
        g.globalCompositeOperation = 'destination-in';
        const vg = g.createLinearGradient(0, 0, 0, L.ch);
        vg.addColorStop(0, 'rgba(0,0,0,0.25)'); vg.addColorStop(0.5, 'rgba(0,0,0,0.8)'); vg.addColorStop(1, 'rgba(0,0,0,1)');
        g.fillStyle = vg; g.fillRect(0, 0, L.cw, L.ch); g.globalCompositeOperation = 'source-over';
      }
      L.pat = CAUSTIC.map(t => c.createPattern(t, 'repeat'));
      // 산호초 햇살 (왼쪽 위에서 비스듬히) — 두 벌을 만들어 번갈아 일렁임
      L.rays = [0, 1].map(seed => {
        const W2 = w / 2, H2 = h / 2, k = mk(W2, H2), g = k.getContext('2d');
        g.filter = 'blur(10px)';
        for (let i = 0; i < 6; i++) {
          const x0 = W2 * (0.02 + 0.07 * i + seed * 0.035), bw = rand(18, 46);
          g.save(); g.translate(x0, -20); g.rotate(-0.5 + rand(-0.04, 0.04));
          const lg = g.createLinearGradient(0, 0, 0, H2 * 1.1);
          lg.addColorStop(0, `rgba(220,255,250,${rand(0.18, 0.3)})`); lg.addColorStop(1, 'rgba(220,255,250,0)');
          g.fillStyle = lg; g.fillRect(-bw / 2, 0, bw, H2 * 1.2); g.restore();
        }
        return k;
      });
      // 난파선 빛기둥 (사진 속 빛기둥 자리에 겹쳐 밝기만 바꿈)
      L.shaft = mk(w / 2, h / 2);
      {
        const g = L.shaft.getContext('2d'); g.filter = 'blur(8px)';
        for (const [ux, uy, lx, ly, bw] of SHAFTS) {
          const x0 = ux * w / 2, y0 = uy * h / 2, x1 = lx * w / 2, y1 = ly * h / 2, hw = bw / 4;
          const lg = g.createLinearGradient(x0, y0, x1, y1);
          lg.addColorStop(0, 'rgba(170,230,255,0.5)'); lg.addColorStop(0.6, 'rgba(150,215,255,0.25)'); lg.addColorStop(1, 'rgba(150,215,255,0)');
          g.fillStyle = lg; g.beginPath(); g.moveTo(x0 - hw * 0.6, y0); g.lineTo(x0 + hw * 0.6, y0); g.lineTo(x1 + hw * 1.6, y1); g.lineTo(x1 - hw * 1.6, y1); g.closePath(); g.fill();
        }
      }
      // 심해 고래 윤곽 발광 점 (고래 실루엣 가장자리에서 고름)
      L.edge = [];
      if (ZON(2)) try {
        const z = ZONES[2], src = IMG.side, W = Math.round(w * z.ww), H = Math.round(W * src.naturalHeight / src.naturalWidth);
        const k = mk(W, H), g = k.getContext('2d'); g.drawImage(src, 0, 0, W, H);
        const d = g.getImageData(0, 0, W, H).data, A = (x, y) => d[(y * W + x) * 4 + 3];
        const pts = [];
        for (let y = 3; y < H - 3; y += 3) for (let x = 3; x < W - 3; x += 3)
          if (A(x, y) > 128 && (A(x - 3, y) < 60 || A(x + 3, y) < 60 || A(x, y - 3) < 60 || A(x, y + 3) < 60)) pts.push([x + 8, y + 8]);
        for (let i = 0; i < 150 && pts.length; i++) {
          const p = pts.splice(Math.floor(Math.random() * pts.length), 1)[0];
          L.edge.push({ x: p[0], y: p[1], s: 1 - p[0] / W, ph: rand(0, TAU), r: rand(0.6, 1.3) });
        }
      } catch (e) { /* file:// 등 픽셀을 못 읽으면 발광 윤곽 없이 */ }
      built = `${filterCss}`;
      if (S.fishInit) { S.fishInit = false; for (let i = 0; i < S.fishN; i++) S.fish.push(newFish(S.zone, true)); }
    }

    // ── 상태
    const S = {
      last: performance.now(), t: 0, zone: FIXED ?? 0, prev: -1, zoneT: 0, fadeT: FADE,
      whale: null, whaleQueue: FIXED === null ? [12, ZONE_DUR - 40] : [rand(12, 20)],   // 구역마다 들어오자마자 한 번, 떠나기 전 한 번 (떠나는 고래를 따라 다음 구역으로)
      snow: [], bubbles: [], bio: [], silt: [], later: [],
      eventT: rand(30, 50), causticT: 0, pets: new Map(), fish: [], fishN: 6, fishSpawnT: 0,
      lure: { x: 0.7, y: 0.66, tx: 0.7, ty: 0.66, retarget: 4, ph: 0 },
      turtle: null, turtleT: rand(20, 35), schools: SCHOOLS.map(() => null), ballT: rand(25, 40), shark: null, sharkT: rand(20, 35), ray: null, rayT: rand(10, 20), squid: null, squidT: rand(20, 35), motes: [], poolT: 0, leakT: rand(6, 12), glint: null, glintT: rand(12, 25), jelly: [], comb: null, combT: rand(15, 30), angler: null, anglerT: rand(25, 40), extraLights: []
    };
    S.fishN = Math.round(rand(FISH[S.zone].n[0], FISH[S.zone].n[1]));
    S.fishInit = true;
    for (let i = 0; i < 160; i++) S.motes.push({ x: rand(0.22, 0.46), y: rand(0.4, 0.88), vx: rand(-3, 3), vy: rand(-4, 2), ph: rand(0, TAU), r: rand(0.8, 1.8) });
    for (let i = 0; i < 110; i++) S.snow.push({ x: rand(0, 1), y: rand(0, 1), z: rand(0.3, 1), ph: rand(0, TAU), ox: 0, oy: 0 });
    for (let i = 0; i < 170; i++) S.bio.push({ x: rand(0, 1), y: rand(0.05, 0.95), r: rand(0.6, 1.4), glow: 0, fireAt: -1, tw: rand(0, TAU) });

    const zoneW = i => i === S.zone ? smooth(S.fadeT / FADE) : (i === S.prev ? 1 - smooth(S.fadeT / FADE) : 0);
    const mouseXY = () => {
      const r = cv.getBoundingClientRect();
      return toScene((mouse.normX * innerWidth - r.left) / r.width * V.sw, (mouse.normY * innerHeight - r.top) / r.height * V.sh);
    };

    function gotoZone(i) {
      S.prev = S.zone; S.zone = (i + ZONES.length) % ZONES.length; S.zoneT = 0; S.fadeT = 0;
      S.whaleQueue = [12, ZONE_DUR - 40];
      S.fishN = Math.round(rand(FISH[S.zone].n[0], FISH[S.zone].n[1])); S.fishSpawnT = 1.5;
    }
    function callWhale() {
      if (S.whale && S.whale.p < 0.85) return;
      const z = ZONES[S.zone];
      S.whale = { zone: S.zone, p: 0, dur: z.dur * rand(0.9, 1.1), dy: rand(-0.03, 0.04), ph: rand(0, TAU) };
    }
    function bubbles(x, y, n, spread) {
      for (let i = 0; i < n; i++) S.later.push({ t: i * rand(0.04, 0.12), fn: () => S.bubbles.push({ x: x + rand(-spread, spread), y, r: rand(3, 11), vy: rand(-70, -130), ph: rand(0, TAU), a: 0, age: 0, life: rand(6, 11) }) });
    }
    function bioWave(x, y, speed = 520) {   // 가까운 점부터 차례로 켜짐
      for (const p of S.bio) {
        const d = Math.hypot(p.x * w - x, p.y * h - y);
        if (d < w * 0.6) p.fireAt = S.t + 0.25 + d / speed + rand(0, 0.25);
      }
    }
    function act(name) {
      const z = ZONES[S.zone].id;
      if (name === 'whale') callWhale();
      if (name === 'sardine') startSardines();
      if (name === 'next' && FIXED === null) gotoZone(S.zone + 1);
      if (name === 'shark' && z === 'wreck' && !S.shark) S.shark = passBy('shark', SHARK, SHARK.len * 0.6);
      if (name === 'ray' && z === 'wreck' && !S.ray) S.ray = passBy('ray', RAY, RAY.w * 0.6);
      if (name === 'squid' && z === 'abyss' && !S.squid) S.squid = passBy('squid', SQUID, SQUID.w * 0.6);
      if (name === 'angler' && z === 'abyss' && !S.angler) { S.angler = { t: 0, dur: rand(14, 18) }; S.lure.retarget = 0; }
      if (name === 'bubbles') for (let k = 0; k < 4; k++) bubbles(rand(0.15, 0.85) * w, h * rand(0.86, 0.95), 14, 20);
      if (name === 'glow') bioWave(rand(0.3, 0.7) * w, vy(rand(0.4, 0.7)), z === 'abyss' ? 520 : 800);
    }

    // ── 고래: 세로 띠마다 위아래로 어긋나게 (꼬리일수록 크게) — 띠 폭 6px, 이웃 띠 차이는 1px 미만이라 이음매가 안 보임
    function whaleWave(s, t, H) { return H * (0.075 * Math.pow(s, 2.4) * Math.sin(t * 1.5 - s * 3.4) + 0.012 * Math.sin(t * 1.5 + 1.2)); }
    // 띠는 1px 겹쳐 그리므로 반투명으로 바로 그리면 겹친 줄이 세로 줄무늬로 보임 → 버퍼에 불투명으로 모은 뒤 한 번에 반투명 합성
    function drawWhale(wh, x, y, t, alpha, step = 6) {
      const img = wh.body, W = img.width, H = img.height, STEP = step, M = Math.ceil(H * 0.1);
      if (!L.wbuf || L.wbuf.width < W || L.wbuf.height < H + M * 2) L.wbuf = mk(W, H + M * 2);
      const g = L.wbuf.getContext('2d');
      g.clearRect(0, 0, W, H + M * 2);
      for (let sx = 0; sx < W; sx += STEP) {
        const s = 1 - (sx + STEP / 2) / W;
        g.drawImage(img, sx, 0, STEP + 1, H, sx, M + whaleWave(s, t, H), STEP + 1, H);
      }
      // 가슴지느러미: 어깨 높이의 몸통 물결을 따라가며 어깨를 축으로 천천히 저음
      for (const f of wh.fins) {
        const px = f.px + 8, py = f.py + 8, dy = whaleWave(1 - px / W, t, H);
        const a = f.amp * Math.sin(t * 0.9 + f.ph) + f.amp * 0.3 * Math.sin(t * 2.1 + f.ph * 1.7);
        g.setTransform(1, 0, 0, 1, px, M + py + dy); g.rotate(a);
        g.drawImage(f.img, f.x0 + 8 - px, f.y0 + 8 - py);
        g.setTransform(1, 0, 0, 1, 0, 0);
      }
      c.globalAlpha = alpha; c.drawImage(L.wbuf, 0, 0, W, H + M * 2, x, y - M, W, H + M * 2); c.globalAlpha = 1;
    }

    function newFish(zi, onScreen) {
      const F = FISH[zi], dir = Math.random() < 0.5 ? 1 : -1, z = rand(0.6, 1);
      const len = rand(F.len[0], F.len[1]) * z;
      return { zone: zi, kind: F.kinds[Math.floor(Math.random() * F.kinds.length)], len, z,
        x: onScreen ? rand(0.08, 0.92) * w : (dir > 0 ? -len : w + len), y: vy(rand(FISH_Y[0], FISH_Y[1])),
        dir, face: dir, v: rand(35, 80) * (0.6 + z * 0.5), boost: 0, ph: rand(0, TAU), ty: vy(rand(FISH_Y[0], FISH_Y[1])), retarget: rand(3, 8), turnT: rand(8, 20), leaving: false };
    }
    function scareFish(x, y, R, k) {
      for (const f of S.fish) {
        const d = Math.hypot(f.x - x, f.y - y);
        if (d < R) { f.dir = f.x >= x ? 1 : -1; f.boost = Math.max(f.boost, k * (1 - d / R)); f.ty = Math.max(vy(FISH_Y[0]), Math.min(vy(FISH_Y[1]), f.y + (f.y - y) * 0.8)); }
      }
    }
    function updateFish(dt, mx, my) {
      // 현재 구역 물고기 수 맞추기 (다른 구역 물고기는 빠르게 빠져나감)
      const mine = S.fish.filter(f => f.zone === S.zone && !f.leaving).length;
      S.fishSpawnT -= dt;
      if (mine < S.fishN && S.fishSpawnT <= 0) { S.fish.push(newFish(S.zone, false)); S.fishSpawnT = rand(1.5, 4); }
      scareFish(mx, my, 150, 2.2);
      for (const f of S.fish) {
        if (f.zone !== S.zone && !f.leaving) { f.leaving = true; f.boost = 2; }
        f.boost = Math.max(0, f.boost - dt * 0.8);
        const sp = f.v * (1 + f.boost * 1.6);
        f.face += (f.dir - f.face) * Math.min(1, dt * 5);           // 뒤돌 때 좌우로 납작해졌다 펴짐
        f.x += f.face * sp * dt;
        f.retarget -= dt; if (f.retarget <= 0) { f.retarget = rand(3, 8); f.ty = vy(rand(FISH_Y[0], FISH_Y[1])); }
        f.y += (f.ty - f.y) * dt * 0.25 + Math.sin(f.ph * 0.15) * 6 * dt;
        f.ph += dt * (5 + sp / 18);
        if (!f.leaving) {
          f.turnT -= dt;
          const out = f.x < w * 0.04 && f.dir < 0 || f.x > w * 0.96 && f.dir > 0;
          if (f.turnT <= 0 || (out && Math.random() < 0.6 * dt)) { f.turnT = rand(8, 20); f.dir *= -1; }
        }
      }
      S.fish = S.fish.filter(f => f.x > -f.len * 2 && f.x < w + f.len * 2);
    }
    // 물고기 그리기: 머리부터 띠를 이어 그리며 꼬리 쪽일수록 위아래로 출렁이고, 꼬리지느러미는 좌우로 저어 폭이 줄었다 늘어남
    function drawFishOne(f, alpha) {
      const img = L.fish[f.zone][f.kind]; if (!img) return;
      const W = Math.round(f.len), H = Math.round(f.len * img.height / img.width), M = Math.ceil(H * 0.15) + 2;
      if (L.fbuf.width < W + 4 || L.fbuf.height < H + M * 2) L.fbuf = mk(W + 40, H + M * 2 + 40);
      const g = L.fbuf.getContext('2d'), N = Math.max(8, Math.round(W / 4)), sw = img.width / N;
      g.clearRect(0, 0, L.fbuf.width, L.fbuf.height);
      let x = W;
      for (let i = N - 1; i >= 0; i--) {                            // i = N-1 이 머리(오른쪽)
        const s = 1 - (i + 0.5) / N;                                 // 0 머리 → 1 꼬리
        const sq = s > 0.72 ? 1 - 0.38 * ((s - 0.72) / 0.28) * Math.abs(Math.sin(f.ph)) : 1;
        const dw = W / N * sq;
        x -= dw;
        const dy = H * (0.06 * s * s * Math.sin(f.ph - s * 2.6) + 0.012 * Math.sin(f.ph * 0.5));
        g.drawImage(img, i * sw, 0, sw, img.height, x, M + dy, dw + 0.7, H);
      }
      const tilt = Math.max(-0.25, Math.min(0.25, (f.ty - f.y) / h * 1.2)) * Math.sign(f.face || 1);
      c.save(); c.globalAlpha = alpha;
      c.translate(f.x, f.y); c.rotate(tilt); c.scale(f.face, 1);
      c.drawImage(L.fbuf, 0, 0, W, H + M * 2, -W / 2, -H / 2 - M, W, H + M * 2);
      c.restore();
    }
    function newJelly(fromBottom) {
      const kinds = Object.keys(JELLY), kind = kinds[Math.floor(Math.random() * kinds.length)], J = JELLY[kind];
      return { kind, hgt: rand(J.h[0], J.h[1]), x: rand(0.08, 0.92) * w, y: fromBottom ? h + 60 : vy(rand(0.2, 0.75)), vx: rand(-6, 6), ph: rand(0, TAU), rate: rand(1.5, 2.1) };
    }
    // 바다거북: 앞지느러미로 크게 물을 저을 때마다 앞으로 밀려 나가며 살짝 떠오름
    function updateTurtle(dt) {
      const inReef = ZONES[S.zone].id === 'reef';
      S.turtleT -= dt;
      if (inReef && !S.turtle && S.turtleT <= 0 && (!S.whale || S.whale.p > 0.7)) {
        const d = Math.random() < 0.5 ? 1 : -1;
        S.turtle = { d, x: d > 0 ? -TURTLE.w * 0.7 : w + TURTLE.w * 0.7, y: vy(rand(TURTLE.y[0], TURTLE.y[1])), vy: rand(-6, 6), ph: 0, sp: (w + TURTLE.w * 1.4) / rand(TURTLE.dur[0], TURTLE.dur[1]), shy: 0 };
      }
      const tu = S.turtle; if (!tu) return;
      tu.ph += dt * 1.7;
      const stroke = Math.max(0, Math.sin(tu.ph - 0.6));                  // 아래로 젓는 순간 추진
      const [mx, my] = mouseXY();
      if (Math.hypot(mx - tu.x, my - tu.y) < 220) tu.shy = Math.min(1, tu.shy + dt * 2); else tu.shy = Math.max(0, tu.shy - dt * 0.5);
      tu.x += tu.d * tu.sp * (0.6 + 0.8 * stroke + tu.shy * 0.8) * (inReef ? 1 : 2.5) * dt;
      tu.y += (tu.vy - 10 * stroke + Math.sin(tu.ph * 0.3) * 4 - tu.shy * 25) * dt;
      if (tu.x < -TURTLE.w || tu.x > w + TURTLE.w) { S.turtle = null; S.turtleT = rand(TURTLE.every[0], TURTLE.every[1]); }
    }
    function drawTurtle(k) {
      // 지느러미 위상 → 프레임 두 장을 겹쳐 부드럽게 이어 그림 (작은 버퍼에서 섞은 뒤 한 번 합성)
      const tu = S.turtle, T = TURTLE, sc = T.w / T.cw;
      const fp = ((tu.ph % TAU) + TAU) % TAU / TAU * T.frames, i0 = Math.floor(fp) % T.frames, i1 = (i0 + 1) % T.frames, ft = fp - Math.floor(fp);
      if (!L.tbuf) L.tbuf = mk(T.cw, T.ch);
      const g = L.tbuf.getContext('2d'), cell = i => [(i % T.cols) * T.cw, Math.floor(i / T.cols) * T.ch];
      g.clearRect(0, 0, T.cw, T.ch);
      let [sx, sy] = cell(i0); g.globalAlpha = 1; g.drawImage(L.turtle, sx, sy, T.cw, T.ch, 0, 0, T.cw, T.ch);
      [sx, sy] = cell(i1); g.globalAlpha = ft; g.drawImage(L.turtle, sx, sy, T.cw, T.ch, 0, 0, T.cw, T.ch); g.globalAlpha = 1;
      const pitch = (-0.04 * Math.sin(tu.ph - 1.2) - tu.shy * 0.12) * tu.d;
      c.save(); c.globalAlpha = k;
      c.translate(tu.x, tu.y); c.rotate(pitch); c.scale(tu.d * sc, sc);
      c.drawImage(L.tbuf, -T.cw / 2, -(T.top + T.bodyH / 2));
      c.restore();
    }
    function newSchoolFish(cf, x, y) {
      const z = Math.random();
      return { x, y, vx: 0, vy: 0, ax: 0, ay: 0, z, sz: 0.62 + 0.5 * z, yaw: Math.random() < 0.5 ? 0 : Math.PI, face: 1, ph: rand(0, TAU),
        hx: 0, hy: 0, th: rand(0, TAU), orb: 0, w: rand(0.7, 1.25), lag: rand(0, 1), wph: rand(0, TAU) };
    }
    function startSardines() {
      const si = SCHOOLS.findIndex(c => c.mode === 'ball'), cf = SCHOOLS[si];
      if (S.zone !== cf.zone || S.schools[si]) return;
      const dir = Math.random() < 0.5 ? 1 : -1, x0 = dir > 0 ? -0.2 * w : 1.2 * w, fish = [];
      for (let i = 0; i < cf.n; i++) {
        const f = newSchoolFish(cf, x0 - dir * rand(0, 320), vy(cf.ball[1]) + rand(-40, 40));
        f.orb = cf.ball[2] * Math.pow(rand(0.02, 1), 0.65); f.vx = dir * 200; f.yaw = dir > 0 ? 0 : Math.PI; fish.push(f);
      }
      fish.sort((a, b) => a.z - b.z);
      S.schools[si] = { fish, mode: 'ball', dir, phase: 'in', t: 0, cx: x0, cy: vy(cf.ball[1]), scatter: 0 };
    }
    function obstacles() {   // 무리를 갈라놓는 큰 생물 (거북·고래)
      const o = [];
      if (S.turtle) o.push([S.turtle.x, S.turtle.y, 170]);
      if (S.shark) o.push([S.shark.x, S.shark.y, 240]);
      if (S.whale && ZONES[S.whale.zone].id === 'reef') { const [x, y, img] = whalePos(S.whale.zone); o.push([x + img.width * 0.55, y + img.height * 0.45, img.width * 0.42]); }
      return o;
    }
    function updateSchools(dt) {
      const [mx, my] = mouseXY(), obs = obstacles();
      SCHOOLS.forEach((cf, si) => {
        const here = S.zone === cf.zone;
        if (here && !S.schools[si] && cf.mode === 'hover') {
          const fish = [];
          for (const [u, v, rx, ry, n] of cf.clouds) for (let i = 0; i < n; i++) {
            const a = rand(0, TAU), r = Math.sqrt(Math.random()), f = newSchoolFish(cf, 0, 0);
            f.hx = u * w + Math.cos(a) * r * rx; f.hy = v * h + Math.sin(a) * r * ry; f.x = f.hx; f.y = f.hy; fish.push(f);
          }
          fish.sort((a, b) => a.z - b.z);
          S.schools[si] = { fish, mode: 'hover', dive: 0, scatter: 0 };
        }
        if (here && !S.schools[si] && cf.mode === 'school') {
          const fish = [], from = Math.random() < 0.5 ? -1 : 1;
          for (let i = 0; i < cf.n; i++) {
            const a = rand(0, TAU), r = Math.sqrt(Math.random()), f = newSchoolFish(cf, from > 0 ? w + 80 + rand(0, 200) : -80 - rand(0, 200), vy(cf.cy) + rand(-60, 60));
            f.hx = Math.cos(a) * r * cf.spread[0]; f.hy = Math.sin(a) * r * cf.spread[1]; f.vx = -120 * from; fish.push(f);
          }
          fish.sort((a, b) => a.z - b.z);
          S.schools[si] = { fish, mode: 'school', a: from > 0 ? 0 : Math.PI, scatter: 0 };
        }
        if (cf.mode === 'ball' && here && !S.schools[si]) { S.ballT -= dt; if (S.ballT <= 0) { S.ballT = rand(cf.every[0], cf.every[1]); startSardines(); } }
        const g = S.schools[si]; if (!g) return;
        g.scatter = Math.max(0, g.scatter - dt * 0.35);
        let tx = 0, ty = 0;
        if (g.mode === 'school') {
          g.a += dt * 0.11;
          tx = (cf.cx + Math.cos(g.a) * cf.rx + Math.sin(g.a * 2.3) * 0.04) * w; ty = vy(cf.cy + Math.sin(g.a * 1.3) * cf.ry);
        } else if (g.mode === 'ball') {
          g.t += dt;
          const bx = cf.ball[0] * w;
          if (g.phase === 'in') { g.cx += (bx - g.cx) * Math.min(1, dt * 0.45); if (Math.abs(g.cx - bx) < 20) { g.phase = 'swirl'; g.t = 0; } }
          else if (g.phase === 'swirl') { g.cx = bx + Math.sin(g.t * 0.2) * 60; g.cy = vy(cf.ball[1]) + Math.sin(g.t * 0.27) * 25; if (g.t > cf.swirl || !here) { g.phase = 'out'; g.t = 0; } }
          else { g.cx += g.dir * Math.min(260, 60 + g.t * 90) * dt; }
        } else {
          g.dive = Math.max(0, g.dive - dt * 0.25);
        }
        for (const f of g.fish) {
          let gx, gy, kp = 1.6, kd = 1.15;
          if (g.mode === 'hover') {
            // 제자리 주변을 천천히 맴돎. 마우스가 가까우면 산호 쪽으로 내려앉고, 클릭(dive)하면 산호 속으로
            const near = Math.hypot(f.hx - mx, f.hy - my) < 220 ? 1 : 0;
            gx = f.hx + Math.sin(S.t * 0.5 * f.w + f.wph) * 34; gy = f.hy + Math.sin(S.t * 0.7 * f.w + f.wph * 1.3) * 16 + near * 34 + g.dive * 95;
            kp = 0.9; kd = 1.4;
            if (!here) { gx = f.hx; gy = f.hy + 80; }
          } else if (g.mode === 'ball') {
            if (g.phase === 'swirl') {
              f.th += dt * f.w * g.dir * 1.1;
              const R = f.orb * (1 + 0.12 * Math.sin(S.t * 0.6 + f.wph) + g.scatter * 1.5);
              gx = g.cx + Math.cos(f.th) * R; gy = g.cy + Math.sin(f.th) * R * 0.55;
              kp = 3.2; kd = 1.8;
            } else {   // 줄지어 들어오고 나감: 앞쪽은 길게, 뒤로 처짐
              gx = g.cx - g.dir * f.lag * 360 + Math.cos(f.th) * f.orb * 0.35; gy = g.cy + Math.sin(f.th) * f.orb * 0.3 + Math.sin(f.lag * 9 + S.t) * 10;
              kp = 2.4; kd = 1.6;
            }
          } else {
            gx = tx + f.hx * (1 + g.scatter * 2.5); gy = ty + f.hy * (1 + g.scatter * 2.5);
            if (!here) { gx = w + 300; gy = f.y - 40; }
          }
          // 마우스·큰 생물 피하기
          const dm = Math.hypot(f.x - mx, f.y - my);
          if (g.mode !== 'hover' && dm < 130 && dm > 0) { gx += (f.x - mx) / dm * 220; gy += (f.y - my) / dm * 160; }
          for (const [ox, oy, orr] of obs) { const d = Math.hypot(f.x - ox, f.y - oy); if (d < orr && d > 0) { gx += (f.x - ox) / d * (orr - d) * 2.2; gy += (f.y - oy) / d * (orr - d) * 2.2; } }
          f.ax = (gx - f.x) * kp - f.vx * kd; f.ay = (gy - f.y) * kp - f.vy * kd;
        }
        // 이웃과 간격 (공 모양 정어리 떼는 궤도가 있어 생략)
        if (g.mode !== 'ball') {
          const fs = g.fish, R = cf.size * 0.75;
          for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) {
            const a = fs[i], b = fs[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
            if (d2 < R * R && d2 > 0.01) { const d = Math.sqrt(d2), p = (R - d) / R * 160 / d; a.ax += dx * p; a.ay += dy * p; b.ax -= dx * p; b.ay -= dy * p; }
          }
        }
        for (const f of g.fish) {
          f.vx += f.ax * dt; f.vy += f.ay * dt;
          const vmax = cf.speed * (0.75 + 0.25 * f.z) * (1 + g.scatter), sp = Math.hypot(f.vx, f.vy);
          if (sp > vmax) { f.vx *= vmax / sp; f.vy *= vmax / sp; }
          f.x += f.vx * dt; f.y += f.vy * dt;
          // 향하는 쪽: 일정 속도 이상으로 반대로 갈 때만 몸을 돌림 (얇아졌다 펴짐)
          if (f.vx > 10) f.face = 1; else if (f.vx < -10) f.face = -1;
          const want = f.face > 0 ? 0 : Math.PI, dyaw = want - f.yaw;
          f.yaw += Math.max(-dt * 4.2, Math.min(dt * 4.2, dyaw));
          f.ph += dt * (5 + Math.hypot(f.vx, f.vy) / 14);
        }
        if (g.mode === 'ball' && g.phase === 'out' && g.fish.every(f => f.x < -60 || f.x > w + 60)) S.schools[si] = null;
        if (g.mode === 'school' && !here && g.fish.every(f => f.x > w + 100)) S.schools[si] = null;
      });
    }
    function updateWreck(dt) {
      const inWreck = ZONES[S.zone].id === 'wreck';
      updateSchools(dt);
      if (!inWreck) return;
      // 선체 틈에서 새어 나오는 공기
      S.leakT -= dt;
      if (S.leakT <= 0) { S.leakT = rand(8, 16); const [u, v] = HULL_LEAKS[Math.floor(Math.random() * HULL_LEAKS.length)]; bubbles(u * w, v * h, Math.round(rand(5, 9)), 3); }
      // 선체 구멍 속 보물 반짝임
      S.glintT -= dt;
      if (S.glintT <= 0) { S.glintT = rand(18, 35); const [u, v] = TREASURE[Math.floor(Math.random() * TREASURE.length)]; S.glint = { x: u * w, y: v * h, t: 0 }; }
      if (S.glint && (S.glint.t += dt) > 1.6) S.glint = null;
    }
    function drawKelp(k) {
      // 사진 속 켈프 영역을 가로 띠로 다시 그리며 좌우로 흔듦 (뿌리는 고정, 위로 갈수록 크게)
      const bg = L.bg[1], t = S.t;
      c.globalAlpha = k;
      for (const [u0, u1, v0, v1, ph] of KELP) {
        const x0 = u0 * w, x1 = u1 * w, y0 = v0 * h, y1 = v1 * h, RH = 5;
        for (let y = y0; y < y1; y += RH) {
          const f = (y1 - y) / (y1 - y0), dx = (Math.sin(t * 0.7 + ph - f * 1.8) * 7 + Math.sin(t * 1.9 + ph + y * 0.02) * 1.5) * f ** 1.4;
          c.drawImage(bg, x0, y, x1 - x0, RH, x0 + dx, y, x1 - x0, RH + 0.5);
        }
      }
      c.globalAlpha = 1;
    }
    // 무리 그리기: 머리 쪽과 꼬리 쪽 두 조각 (꼬리는 이음매를 축으로 젓고 폭이 줄었다 늘어남), 몸을 돌릴 땐 가로 폭 = cos(yaw)
    function drawSchool(si, k) {
      const g = S.schools[si], cf = SCHOOLS[si]; if (!g || k < 0.01) return;
      const m = L.mini[si], W = m.width, H = m.height, SP = Math.round(W * 0.42), sc = cf.size / W * 1.2;
      for (const f of g.fish) {
        let cyw = Math.cos(f.yaw); if (Math.abs(cyw) < 0.1) cyw = cyw < 0 ? -0.1 : 0.1;
        const pitch = Math.max(-0.55, Math.min(0.55, Math.atan2(f.vy, Math.max(Math.abs(f.vx), 25)))) * Math.sign(cyw), s = f.sz * sc;
        c.globalAlpha = k * cf.alpha * (0.55 + 0.45 * f.z);
        baseT(f.x, f.y); c.rotate(pitch); c.scale(cyw * s, s);
        c.drawImage(m, SP, 0, W - SP, H, -W / 2 + SP, -H / 2, W - SP, H);
        c.translate(-W / 2 + SP, 0); c.rotate(0.26 * Math.sin(f.ph));
        const q = 1 - 0.22 * Math.abs(Math.sin(f.ph));
        c.drawImage(m, 0, 0, SP + 1, H, -SP * q, -H / 2, (SP + 1) * q, H);
      }
      baseT();
      if (cf.flash > 0) {   // 은빛 번쩍임: 몸을 돌리는 순간 + (정어리 공) 궤도를 따라 물결처럼
        c.globalCompositeOperation = 'lighter';
        for (const f of g.fish) {
          let fl = Math.max(0, 1 - Math.abs(Math.cos(f.yaw)) * 1.6);
          if (g.mode === 'ball' && g.phase === 'swirl') fl = Math.max(fl, Math.max(0, Math.sin(f.th * 2 - S.t * 2.2)) ** 10 * 0.8);
          if (fl < 0.05) continue;
          c.globalAlpha = k * fl * cf.flash * (0.5 + 0.5 * f.z); const r = cf.size * 0.42 * f.sz;
          c.drawImage(DOT.white, f.x - r, f.y - r * 0.5, r * 2, r);
        }
        c.globalCompositeOperation = 'source-over';
      }
      c.globalAlpha = 1;
    }
    function drawGlint(k) {
      const g0 = S.glint; if (!g0) return;
      const e = Math.sin(Math.min(1, g0.t / 1.6) * Math.PI), r = 10 + 26 * e;
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = k * e * 0.55; c.drawImage(DOT.gold, g0.x - r * 1.6, g0.y - r * 1.6, r * 3.2, r * 3.2);
      c.globalAlpha = k * e; c.drawImage(DOT.gold, g0.x - r * 2, g0.y - 1.5, r * 4, 3); c.drawImage(DOT.gold, g0.x - 1.5, g0.y - r * 1.3, 3, r * 2.6);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    // 큰 생물 한 마리: 화면 한쪽에서 들어와 반대쪽으로 천천히 지나감
    function passBy(key, cf, span) {
      const d = Math.random() < 0.5 ? 1 : -1;
      return { d, x: d > 0 ? -span : w + span, y: vy(rand(cf.y[0], cf.y[1])), sp: (w + span * 2) / rand(cf.dur[0], cf.dur[1]), ph: rand(0, TAU), t: 0, bio: 0 };
    }
    function updateBig(dt) {
      const z = S.zone;
      for (const [key, cf, span] of [['shark', SHARK, SHARK.len], ['ray', RAY, RAY.w], ['squid', SQUID, SQUID.w]]) {
        const tk = key + 'T';
        S[tk] -= dt;
        if (z === cf.zone && !S[key] && S[tk] <= 0) S[key] = passBy(key, cf, span * 0.6);
        const o = S[key]; if (!o) continue;
        o.t += dt; o.x += o.d * o.sp * (z === cf.zone ? 1 : 2.5) * dt; o.y += Math.sin(o.t * 0.25) * 6 * dt;
        o.ph += dt * (key === 'shark' ? 4 : key === 'ray' ? 1.3 : 1.25);
        if (o.x < -span || o.x > w + span) { S[key] = null; S[tk] = rand(cf.every[0], cf.every[1]); }
      }
      // 상어가 지나가면 주변 물고기가 흩어짐
      if (S.shark) scareFish(S.shark.x, S.shark.y, 260, 1.6);
      // 대왕오징어 근처에서 가끔 작은 빛이 켜져 몸 일부가 드러남
      const sq = S.squid;
      if (sq) { sq.bio -= dt; if (sq.bio <= 0) { sq.bio = rand(3, 6); bioWave(sq.x + rand(-SQUID.w * 0.4, SQUID.w * 0.3), sq.y + rand(-80, 80), 380); } }
    }
    // 프레임 시트 생물 그리기: 위상 → 이웃 두 프레임을 작은 버퍼에서 섞어 한 번 합성
    function sheetFrame(sheet, cf, ph) {
      const fp = ((ph % TAU) + TAU) % TAU / TAU * cf.frames, i0 = Math.floor(fp) % cf.frames, i1 = (i0 + 1) % cf.frames, ft = fp - Math.floor(fp);
      if (!L.sbuf || L.sbuf.width < cf.cw || L.sbuf.height < cf.ch) L.sbuf = mk(Math.max(cf.cw, L.sbuf?.width || 0), Math.max(cf.ch, L.sbuf?.height || 0));
      const g = L.sbuf.getContext('2d'), at = i => [(i % cf.cols) * cf.cw, Math.floor(i / cf.cols) * cf.ch];
      g.clearRect(0, 0, cf.cw, cf.ch);
      let [sx, sy] = at(i0); g.globalAlpha = 1; g.drawImage(sheet, sx, sy, cf.cw, cf.ch, 0, 0, cf.cw, cf.ch);
      [sx, sy] = at(i1); g.globalAlpha = ft; g.drawImage(sheet, sx, sy, cf.cw, cf.ch, 0, 0, cf.cw, cf.ch); g.globalAlpha = 1;
      return g;
    }
    function drawRay(k) {
      const o = S.ray, cf = RAY, sc = cf.w / cf.cw; sheetFrame(L.ray, cf, o.ph);
      c.save(); c.globalAlpha = k * 0.72; c.translate(o.x, o.y); c.rotate(Math.sin(o.t * 0.25) * 0.05); c.scale(o.d * sc, sc);
      c.drawImage(L.sbuf, 0, 0, cf.cw, cf.ch, -cf.cw / 2, -cf.cy, cf.cw, cf.ch); c.restore();
    }
    function drawShark(k) {
      const o = S.shark;
      drawFishOne({ zone: 1, kind: 'shark', len: SHARK.len, x: o.x, y: o.y, ty: o.y + Math.sin(o.t * 0.25) * 20, face: o.d, ph: o.ph }, k * 0.88);
    }
    // 대왕오징어: 아주 희미하게(base) + 생물발광 빛이 닿는 부분만 더 드러남
    function drawSquid(k) {
      const o = S.squid, cf = SQUID, sc = cf.w / cf.cw, g = sheetFrame(L.squid, cf, o.ph);
      if (!L.smask) L.smask = mk(cf.cw, cf.ch);
      const mg = L.smask.getContext('2d');
      mg.globalCompositeOperation = 'copy'; mg.fillStyle = `rgba(0,0,0,${cf.base})`; mg.fillRect(0, 0, cf.cw, cf.ch);
      mg.globalCompositeOperation = 'lighter';
      for (const [lx, ly, r, a] of abyssLights()) {
        const ux = (lx - o.x) / (o.d * sc) + cf.cw / 2, uy = (ly - o.y) / sc + cf.cy, rr = r * 1.3 / sc;
        if (ux < -rr || ux > cf.cw + rr || uy < -rr || uy > cf.ch + rr) continue;
        mg.globalAlpha = Math.min(0.6, a * 0.7); mg.drawImage(DOT.white, ux - rr, uy - rr, rr * 2, rr * 2);
      }
      mg.globalAlpha = 1; mg.globalCompositeOperation = 'source-over';
      g.globalCompositeOperation = 'destination-in'; g.drawImage(L.smask, 0, 0); g.globalCompositeOperation = 'source-over';
      const env = smooth(Math.min(o.x + cf.w * 0.5, w + cf.w * 0.5 - o.x) / (cf.w * 0.5));
      c.save(); c.globalAlpha = k * env * 0.8; c.translate(o.x, o.y); c.scale(o.d * sc, sc);
      c.drawImage(L.sbuf, 0, 0, cf.cw, cf.ch, -cf.cw / 2, -cf.cy, cf.cw, cf.ch); c.restore();
    }
    function updateDeep(dt) {
      updateWreck(dt);
      updateBig(dt);
      updateTurtle(dt);
      const inAbyss = ZONES[S.zone].id === 'abyss';
      // 해파리 2~3마리: 갓을 오므릴 때 위로 밀려 올라가고, 펼 때는 천천히 가라앉음
      if (inAbyss && S.jelly.length < 3 && (S.jelly.length < 2 || Math.random() < dt * 0.05)) S.jelly.push(newJelly(S.jelly.length > 0 || S.fadeT >= FADE));
      for (const j of S.jelly) {
        j.ph += dt * j.rate;
        const pulse = Math.max(0, Math.sin(j.ph)) ** 2;
        j.y += (-(10 + 55 * pulse) + 9) * dt * (j.hgt / 260); j.x += j.vx * dt;
        if (!inAbyss) j.y -= 40 * dt;
      }
      S.jelly = S.jelly.filter(j => j.y > -j.hgt * 1.2);
      // 빗해파리: 가끔 옆으로 천천히 흘러감
      S.combT -= dt;
      if (inAbyss && !S.comb && S.combT <= 0) { const d = Math.random() < 0.5 ? 1 : -1; S.comb = { x: d > 0 ? -220 : w + 220, y: vy(rand(0.2, 0.5)), d, ph: 0, sz: rand(170, 230) }; }
      if (S.comb) { S.comb.x += S.comb.d * 28 * dt; S.comb.ph += dt; S.comb.y += Math.sin(S.comb.ph * 0.4) * 5 * dt; if (S.comb.x < -300 || S.comb.x > w + 300) { S.comb = null; S.combT = rand(40, 70); } }
      // 아귀: 미끼 빛 뒤에서 가끔 얼굴을 드러냈다 다시 어둠 속으로
      S.anglerT -= dt;
      if (inAbyss && !S.angler && S.anglerT <= 0) { S.angler = { t: 0, dur: rand(14, 18) }; S.lure.retarget = 0; }
      if (S.angler) { S.angler.t += dt; if (S.angler.t >= S.angler.dur) { S.angler = null; S.anglerT = rand(50, 80); } }
      // 생물들의 빛 → 암반을 비춤
      S.extraLights = S.jelly.map(j => [j.x, j.y + j.hgt * 0.15, j.hgt * 1.4, 0.32 * (0.7 + 0.3 * Math.max(0, Math.sin(j.ph)) ** 2)]);
      if (S.comb) S.extraLights.push([S.comb.x, S.comb.y, S.comb.sz * 1.4, 0.2]);
    }
    // 해파리: 갓과 촉수 띠를 버퍼에 불투명으로 이어 붙인 뒤(가산 합성에서 띠 겹침이 밝은 줄로 보이지 않게) 한 번에 가산 합성
    function drawJelly(j, k) {
      const img = IMG[j.kind], J = JELLY[j.kind], sc = j.hgt / img.naturalHeight, W = img.naturalWidth * sc;
      const pulse = Math.max(0, Math.sin(j.ph)) ** 2, bellH = img.naturalHeight * J.bell;
      const PAD = Math.ceil(24 * j.hgt / 260), BW = Math.ceil(W + PAD * 2), BH = Math.ceil(j.hgt * 1.12 + 4);
      if (!L.jbuf || L.jbuf.width < BW || L.jbuf.height < BH) L.jbuf = mk(Math.max(BW, L.jbuf?.width || 0), Math.max(BH, L.jbuf?.height || 0));
      const g = L.jbuf.getContext('2d');
      g.fillStyle = '#000'; g.fillRect(0, 0, BW, BH);
      const cx = BW / 2, bellBot = bellH * sc * 1.07;
      // 갓: 오므리면 좁고 길어짐 (아래 가장자리 기준)
      const bw = W * (1 - 0.12 * pulse), bh = bellH * sc * (1 + 0.07 * pulse);
      // 촉수: 가로 띠마다 좌우로 물결 (아래로 갈수록 크게, 한 박자 늦게)
      const rows = Math.ceil((img.naturalHeight - bellH) / 6), rowH = (img.naturalHeight - bellH) / rows, stretch = 1 + 0.06 * (1 - pulse);
      g.globalCompositeOperation = 'lighten';   // 띠 겹침은 밝은 쪽만 남김 (더해지지 않음)
      for (let r = 0; r < rows; r++) {
        const f = (r + 0.5) / rows, dx = Math.sin(j.ph * 0.9 - f * 3.2) * 14 * f * (j.hgt / 260) + Math.sin(S.t * 0.5 + j.x) * 4 * f;
        const q = 1 - 0.12 * pulse * Math.max(0, 1 - f * 3) ** 2;   // 갓 바로 아래 촉수는 갓과 함께 오므라들어 이음매가 끊기지 않음
        g.drawImage(img, 0, bellH + r * rowH, img.naturalWidth, rowH, cx - W * q / 2 + dx, bellBot + r * rowH * sc * stretch, W * q, rowH * sc * stretch + 0.6);
      }
      g.drawImage(img, 0, 0, img.naturalWidth, bellH, cx - bw / 2, bellBot - bh, bw, bh);
      g.globalCompositeOperation = 'source-over';
      c.globalAlpha = k * (0.7 + 0.3 * pulse);
      c.drawImage(L.jbuf, 0, 0, BW, BH, j.x - BW / 2, j.y - j.hgt * 0.5 - (bellBot - bellH * sc), BW, BH);
    }
    function drawComb(k) {
      const cb = S.comb, img = IMG.comb, sc = cb.sz / img.naturalWidth, W = cb.sz, H = img.naturalHeight * sc, N = 24, sw = img.naturalWidth / N;
      // 몸을 따라 빛이 물결치며 흐름 (빗판이 차례로 반짝이는 모습)
      for (let i = 0; i < N; i++) {
        const u = i / N, wave = 0.45 + 0.55 * Math.max(0, Math.sin(cb.ph * 3 - u * 9)) ** 2;
        c.globalAlpha = k * wave;
        c.drawImage(img, i * sw, 0, sw, img.naturalHeight, cb.x - W / 2 + u * W, cb.y - H / 2 + Math.sin(cb.ph * 0.8 + u * 2) * 2, W / N + 0.2, H);
      }
    }
    function drawAngler(k) {
      const an = S.angler, e = smooth(an.t / 3) * smooth((an.dur - an.t) / 3);
      if (e < 0.01) return;
      const lu = S.lure, lx = lu.x * w, ly = lu.y * h + Math.sin(lu.ph * 1.3) * 6;
      const A = L.angler, g = L.angBuf.getContext('2d'), [tx, ty] = L.anglerTip;
      // 미끼 빛이 닿는 머리 쪽만 보이게 원형으로 잘라냄
      g.globalCompositeOperation = 'copy'; g.drawImage(A, 0, 0);
      g.globalCompositeOperation = 'destination-in'; const R = A.width * 1.05; g.drawImage(DOT.white, tx - R, ty - R * 0.8, R * 2, R * 2);
      g.globalCompositeOperation = 'source-over';
      const bob = Math.sin(an.t * 0.9) * 4;
      c.globalAlpha = k * e * 0.9; c.drawImage(L.angBuf, lx - tx, ly - ty + bob);
      c.globalAlpha = 1;
    }
    function update(dt) {
      S.zoneT += dt; S.fadeT = Math.min(FADE, S.fadeT + dt);
      if (S.fadeT >= FADE) S.prev = -1;
      if (S.whaleQueue.length && S.zoneT >= S.whaleQueue[0]) {
        S.whaleQueue.shift(); callWhale();
        if (FIXED !== null) S.whaleQueue.push(S.zoneT + rand(70, 110));   // 한 구역 팩: 고래가 주기적으로 지나감
      }
      if (FIXED === null && S.zoneT >= ZONE_DUR && (!S.whale || S.whale.p > 0.6)) gotoZone(S.zone + 1);   // 이야기 모드: 고래를 따라 다음 구역으로   // 고래가 지나간 뒤를 따라 다음 구역으로
      if (S.whale) { S.whale.p += dt / S.whale.dur; if (S.whale.p >= 1) S.whale = null; }
      // 구역별 자동 사건
      S.eventT -= dt;
      if (S.eventT <= 0) {
        S.eventT = rand(45, 90);
        const z = ZONES[S.zone].id;
        if (z === 'reef') bubbles(rand(0.25, 0.75) * w, h * 0.8, 10, 6);
        else bioWave(rand(0.2, 0.8) * w, vy(rand(0.3, 0.8)), z === 'abyss' ? 480 : 900);
      }
      S.later = S.later.filter(q => { q.t -= dt; if (q.t <= 0) { q.fn(); return false; } return true; });
      // 부유 입자 (마우스 근처는 살짝 밀려났다 돌아옴)
      const [mx, my] = mouseXY(), sn = ZONES[S.zone].snow;
      for (const p of S.snow) {
        p.y += sn.vy * p.z * dt / h; p.x += Math.sin(S.t * 0.3 + p.ph) * 4 * dt / w;
        if (p.y > 1.02) p.y = -0.02; if (p.y < -0.02) p.y = 1.02;
        const dx = p.x * w + p.ox - mx, dy = p.y * h + p.oy - my, d = Math.hypot(dx, dy);
        if (d < 140 && d > 1) { const f = (1 - d / 140) * 60 * dt; p.ox += dx / d * f; p.oy += dy / d * f; }
        p.ox *= 1 - dt * 0.6; p.oy *= 1 - dt * 0.6;
      }
      // 기포: 큰 것일수록 빠른 일정 속도까지 떠오르고(멈추지 않음), 올라가며 살짝 커지고, 수명이 다하면 서서히 사라짐
      S.bubbles = S.bubbles.filter(b => {
        b.age += dt; b.vy += (-(45 + b.r * 6) - b.vy) * Math.min(1, dt * 1.5);
        b.y += b.vy * dt; b.r *= 1 + dt * 0.03; b.ph += dt * 5; b.x += Math.sin(b.ph) * 18 * dt;
        b.a = Math.min(1, b.age * 4, (b.life - b.age) / 1.2);
        return b.age < b.life && b.y > -30;
      });
      S.silt = S.silt.filter(s => (s.age += dt) < s.life);
      for (const p of S.bio) {
        if (p.fireAt > 0 && S.t >= p.fireAt) { p.glow = Math.max(p.glow, rand(0.6, 1)); p.fireAt = -1; }
        p.glow = Math.max(0, p.glow - dt * 0.45);
        if (Math.random() < dt * 0.01) p.glow = Math.max(p.glow, 0.25);   // 가끔 혼자 반짝
      }
      updateFish(dt, mx, my);
      // 아귀 미끼: 암반 근처 어둠 속을 천천히 떠돎
      const lu = S.lure;
      lu.retarget -= dt; if (lu.retarget <= 0) { lu.retarget = rand(5, 10); lu.tx = rand(0.45, 0.88); lu.ty = S.angler ? rand(0.5, 0.6) : rand(0.55, 0.78); }
      updateDeep(dt);
      lu.x += (lu.tx - lu.x) * dt * 0.08; lu.y += (lu.ty - lu.y) * dt * 0.08; lu.ph += dt;
      petReact(dt);
    }

    // 펫 발걸음 반응: 산호초=멈추면 기포, 난파선=걸을 때 모래먼지, 심해=지나온 자리가 한 박자 늦게 켜짐
    function petReact(dt) {
      const list = (host.pets?.() || []).map(p => { const [x, y] = toScene(p.x, p.y); return { ...p, x, y }; });
      const z = ZONES[S.zone].id;
      list.forEach((pt, i) => {
        let st = S.pets.get(i);
        if (!st) { st = { x: pt.x, still: 0, acc: 0 }; S.pets.set(i, st); }
        const mv = Math.abs(pt.x - st.x); st.x = pt.x;
        if (mv < 0.5) {
          st.still += dt;
          if (z === 'reef' && st.still > 1.2) { st.still = -rand(2, 4); bubbles(pt.x, pt.y, 3, 4); }
        } else {
          st.still = 0; st.acc += mv;
          if (st.acc > 46) {
            st.acc = 0;
            if (z === 'wreck') for (let k = 0; k < 3; k++) S.silt.push({ x: pt.x + rand(-10, 10), y: pt.y + rand(-4, 4), age: 0, life: rand(1.2, 2.2), r: rand(10, 20) });
            if (z === 'abyss') { const x = pt.x, y = pt.y; S.later.push({ t: 0.5, fn: () => {
              for (let k = 0; k < 3; k++) S.bio.push({ x: (x + rand(-18, 18)) / w, y: (y + rand(-14, 4)) / h, r: rand(0.5, 0.9), glow: rand(0.6, 0.9), fireAt: -1, tw: 0, temp: true });
            } }); }
          }
        }
      });
      if (S.bio.length > 230) S.bio = S.bio.filter(p => !p.temp || p.glow > 0.02);
    }

    // ── 그리기
    function drawReef(k) {
      const t = S.t;
      // 햇살 (두 벌을 천천히 번갈아)
      c.globalCompositeOperation = 'lighter';
      const s = 0.5 + 0.5 * Math.sin(t * 0.35);
      c.globalAlpha = k * (0.35 + 0.35 * s); c.drawImage(L.rays[0], 0, 0, w, h);
      c.globalAlpha = k * (0.35 + 0.35 * (1 - s)); c.drawImage(L.rays[1], 0, 0, w, h);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      // 커스틱 층 갱신 (초당 20번)
      if (S.causticT <= 0) {
        S.causticT = 0.05;
        const g = L.caustic.getContext('2d');
        g.globalCompositeOperation = 'copy'; g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, L.cw, L.ch);
        g.globalCompositeOperation = 'lighter';
        L.pat[0].setTransform(new DOMMatrix([0.5, 0, 0, 0.3, (t * 6) % 256, (t * 2.5) % 256]));
        L.pat[1].setTransform(new DOMMatrix([0.62, 0, 0, 0.36, (-t * 4.5) % 256, (t * 3.5) % 256]));
        g.globalAlpha = 0.8; g.fillStyle = L.pat[0]; g.fillRect(0, 0, L.cw, L.ch);
        g.globalAlpha = 0.7; g.fillStyle = L.pat[1]; g.fillRect(0, 0, L.cw, L.ch);
        g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.drawImage(L.sandMask, 0, 0);
        // 고래 그림자 자리는 햇빛무늬가 사라짐
        const sh = shadowRect();
        if (sh) { g.globalCompositeOperation = 'destination-out'; g.globalAlpha = 0.85 * sh.a; g.drawImage(L.shadow, sh.x / 4, (sh.y - SAND.y0 * h) / 4, sh.w / 4, sh.h / 4); g.globalAlpha = 1; }
        g.globalCompositeOperation = 'source-over';
      }
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.33 * k;
      c.drawImage(L.caustic, 0, SAND.y0 * h, w, (SAND.y1 - SAND.y0) * h);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      const sh = shadowRect();
      if (sh) { c.globalAlpha = 0.42 * sh.a * k; c.drawImage(L.shadow, sh.x, sh.y, sh.w, sh.h); c.globalAlpha = 1; }
    }
    function whalePos(zi) {
      const wh = S.whale, img = L.whale[zi].body, z = ZONES[zi];
      const p = wh.p, x = -img.width - 40 + (w + img.width + 80) * p;
      const y = vy(z.wy + wh.dy) + Math.sin(p * Math.PI) * -0.02 * h + Math.sin(S.t * 0.4) * 6;
      return [x, y, img];
    }
    function shadowRect() {   // 산호초 고래 그림자: 햇빛이 왼쪽 위에서 오므로 고래보다 오른쪽 아래 모래 위
      if (!S.whale || ZONES[S.whale.zone].id !== 'reef') return null;
      const [x, , img] = whalePos(S.whale.zone);
      const sw = L.shadow.width, shh = L.shadow.height;
      return { x: x + img.width / 2 - sw / 2 + w * 0.12, y: h * 0.74 + Math.sin(S.t * 0.4) * 3, w: sw, h: shh, a: smooth(Math.min(S.whale.p, 1 - S.whale.p) * 8) };
    }
    function drawWreck(k) {
      const t = S.t;
      const dim = S.whale && ZONES[S.whale.zone].id === 'wreck' ? Math.sin(S.whale.p * Math.PI) ** 2 : 0;   // 고래가 위를 지나면 빛이 약해짐
      const breathe = 0.5 + 0.5 * Math.sin(t * 0.5) * Math.sin(t * 0.17 + 1);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = k * (0.25 + 0.45 * breathe) * (1 - dim * 0.9); c.drawImage(L.shaft, 0, 0, w, h);
      c.globalCompositeOperation = 'source-over';
      if (dim > 0.01) { c.globalAlpha = k * dim * 0.18; c.fillStyle = 'rgb(0,8,24)'; c.fillRect(0, 0, w, h); }
      c.globalAlpha = 1;
      const lightK = k * (0.35 + 0.65 * breathe) * (1 - dim * 0.9);
      // 빛기둥이 닿는 바닥: 커스틱 무늬를 작은 타원 층에 그려 일렁이게
      S.poolT -= 1 / 60;
      if (S.poolT <= 0) {
        S.poolT = 1 / 15;
        const g = L.pool.getContext('2d'), PW = L.pool.width, PH = L.pool.height;
        g.globalCompositeOperation = 'copy'; g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, PW, PH);
        g.globalCompositeOperation = 'lighter';
        L.pat[0].setTransform(new DOMMatrix([0.35, 0, 0, 0.14, (t * 5) % 256, (t * 2) % 256])); g.globalAlpha = 0.9; g.fillStyle = L.pat[0]; g.fillRect(0, 0, PW, PH);
        L.pat[1].setTransform(new DOMMatrix([0.42, 0, 0, 0.17, (-t * 4) % 256, (t * 3) % 256])); g.globalAlpha = 0.8; g.fillStyle = L.pat[1]; g.fillRect(0, 0, PW, PH);
        g.globalAlpha = 1; g.globalCompositeOperation = 'destination-in'; g.drawImage(DOT.white, -PW * 0.1, -PH * 0.6, PW * 1.2, PH * 2.2);
        g.globalCompositeOperation = 'source-over';
      }
      c.globalCompositeOperation = 'lighter';
      for (const [ux, , lx, ly, bw] of SHAFTS) {
        const pw = bw * 5, ph = bw * 1.1;
        c.globalAlpha = lightK * 0.55; c.drawImage(L.pool, lx * w - pw / 2, ly * h - ph * 0.35, pw, ph);
      }
      // 빛기둥 속 부유물: 빛기둥을 지날 때만 반짝임
      for (const m of S.motes) {
        m.ph += 0.016;
        m.x += (m.vx + Math.sin(m.ph * 0.7) * 2) * 0.016 / w; m.y += (m.vy + Math.cos(m.ph * 0.5) * 2) * 0.016 / h;
        if (m.x < 0.2) m.x = 0.48; if (m.x > 0.48) m.x = 0.2; if (m.y < 0.38) m.y = 0.88; if (m.y > 0.9) m.y = 0.4;
        let lit = 0;
        for (const [ux, uy, lx, ly, bw] of SHAFTS) {
          const q = (m.y - uy) / (ly - uy); if (q < 0 || q > 1) continue;
          const cx = (ux + (lx - ux) * q) * w, hw = bw * (0.35 + 0.65 * q);
          lit = Math.max(lit, 1 - Math.abs(m.x * w - cx) / hw);
        }
        if (lit <= 0) continue;
        const tw = 0.6 + 0.4 * Math.sin(m.ph * 3.1), r = m.r * (2 + 2 * lit);
        c.globalAlpha = lightK * lit * tw * 0.9; c.drawImage(DOT.white, m.x * w - r, m.y * h - r, r * 2, r * 2);
      }
      c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      for (const s of S.silt) {
        const q = s.age / s.life;
        c.globalAlpha = k * 0.35 * Math.sin(q * Math.PI); const r = s.r * (1 + q * 1.5);
        c.drawImage(DOT.silt, s.x - r, s.y - r * 0.6 - q * 14, r * 2, r * 1.2);
      }
      c.globalAlpha = 1;
    }
    // 심해 빛 → 암반 드러내기: 빛 자리를 마스크로 칠하고, 밝힌 사진을 그 모양으로 잘라 덮음 (1/2 해상도, 한 번 합성)
    function abyssLights() {
      const out = [], lu = S.lure;
      out.push([lu.x * w, lu.y * h + Math.sin(lu.ph * 1.3) * 6, 170, 0.55 + 0.15 * Math.sin(lu.ph * 5) * Math.sin(lu.ph * 2.3)]);
      for (const p of S.bio) if (p.glow > 0.2) out.push([p.x * w, p.y * h, 70 + p.glow * 110, p.glow * 0.45]);
      for (const L2 of S.extraLights || []) out.push(L2);
      return out;
    }
    function drawAbyssLighting(k) {
      // 빛이 있는 영역(경계 상자)만 지우고·칠하고·합성 → 화면 전체를 매 프레임 처리하지 않음
      const lights = abyssLights(); if (!lights.length) return;
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const [x, y, r] of lights) { x0 = Math.min(x0, x - r); y0 = Math.min(y0, y - r); x1 = Math.max(x1, x + r); y1 = Math.max(y1, y + r); }
      const W2 = L.lightBuf.width, H2 = L.lightBuf.height;
      const bx = Math.max(0, Math.floor(x0 / 2)), by = Math.max(0, Math.floor(y0 / 2)), bx1 = Math.min(W2, Math.ceil(x1 / 2)), by1 = Math.min(H2, Math.ceil(y1 / 2));
      if (bx1 <= bx || by1 <= by) return;
      const bw = bx1 - bx, bh = by1 - by, g = L.lightBuf.getContext('2d');
      g.clearRect(bx, by, bw, bh);
      g.globalCompositeOperation = 'lighter';
      for (const [x, y, r, a] of lights) { g.globalAlpha = Math.min(1, a); g.drawImage(DOT.white, x / 2 - r / 2, y / 2 - r / 2, r, r); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-in'; g.drawImage(L.abyssLit, bx, by, bw, bh, bx, by, bw, bh);
      g.globalCompositeOperation = 'source-over';
      c.globalAlpha = k; c.drawImage(L.lightBuf, bx, by, bw, bh, bx * 2, by * 2, bw * 2, bh * 2); c.globalAlpha = 1;
    }
    function drawLure(k) {
      const lu = S.lure, x = lu.x * w, y = lu.y * h + Math.sin(lu.ph * 1.3) * 6, f = 0.75 + 0.25 * Math.sin(lu.ph * 5) * Math.sin(lu.ph * 2.3);
      c.globalCompositeOperation = 'lighter';
      c.globalAlpha = k * 0.35 * f; c.drawImage(DOT.teal, x - 40, y - 40, 80, 80);
      c.globalAlpha = k * 0.9 * f; c.drawImage(DOT.white, x - 7, y - 7, 14, 14);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    function drawAbyssGlow(k) {
      if (!S.whale || ZONES[S.whale.zone].id !== 'abyss' || !L.edge.length) return;
      const [x, y, img] = whalePos(S.whale.zone), env = smooth(Math.min(S.whale.p, 1 - S.whale.p) * 6), t = S.t + S.whale.ph;
      c.globalCompositeOperation = 'lighter';
      for (const e of L.edge) {
        const wave = Math.pow(Math.max(0, Math.sin(t * 1.3 - e.s * 7 + e.ph * 0.15)), 5);
        const a = k * env * (0.08 + 0.85 * wave) * (0.7 + 0.3 * Math.sin(t * 3 + e.ph));
        if (a < 0.03) continue;
        const px = x + e.x, py = y + e.y + whaleWave(e.s, t, img.height - 16), r = 7 * e.r * (0.7 + wave * 0.6);
        c.globalAlpha = a; c.drawImage(DOT.cyan, px - r, py - r, r * 2, r * 2);
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }

    function frame() {
      if (!ready()) { c.fillStyle = '#04121e'; c.fillRect(0, 0, w, h); return; }
      updateView();
      if (built !== `${filterCss}`) rebuild();
      baseT();
      const now = performance.now(), dt = Math.min(0.05, (now - S.last) / 1000);
      S.last = now; S.t += dt; S.causticT -= dt;
      update(dt);
      const kz = ZONES.map((_, i) => zoneW(i));
      // 배경 크로스페이드
      c.globalAlpha = 1;
      if (S.prev >= 0) c.drawImage(L.bg[S.prev], 0, 0, w, h);
      c.globalAlpha = kz[S.zone]; c.drawImage(L.bg[S.zone], 0, 0, w, h); c.globalAlpha = 1;
      // 구역 효과 (고래보다 뒤: 바닥 빛)
      if (kz[1] > 0) drawKelp(kz[1]);
      if (kz[2] > 0) { drawAbyssLighting(kz[2]); if (S.squid) drawSquid(kz[2]); if (S.angler) drawAngler(kz[2]); drawLure(kz[2]); }
      if (kz[0] > 0) drawReef(kz[0]);
      // 고래
      if (S.whale) {
        const zi = S.whale.zone, k = kz[zi];
        if (k > 0) {
          const [x, y] = whalePos(zi), env = smooth(Math.min(S.whale.p, 1 - S.whale.p) * 10);
          drawWhale(L.whale[zi], x, y, S.t + S.whale.ph, ZONES[zi].alpha * k * env, ZONES[zi].id === 'abyss' ? 14 : 6);   // 심해는 몸이 거의 안 보여 띠를 굵게(그리기 명령 절반 이하)
        }
      }
      if (S.turtle && kz[0] > 0) drawTurtle(kz[0]);
      if (S.ray && kz[1] > 0) drawRay(kz[1]);
      if (kz[1] > 0) { drawWreck(kz[1]); drawGlint(kz[1]); }
      SCHOOLS.forEach((cf, si) => drawSchool(si, kz[cf.zone]));
      if (S.shark && kz[1] > 0) drawShark(kz[1]);
      if (kz[2] > 0) drawAbyssGlow(kz[2]);
      // 해파리·빗해파리 (스스로 빛나므로 가산 합성)
      if (kz[2] > 0 && (S.jelly.length || S.comb)) {
        c.globalCompositeOperation = 'lighter';
        for (const j of S.jelly) drawJelly(j, kz[2] * 0.9);
        if (S.comb) drawComb(kz[2] * 0.85);
        c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      }
      // 물고기 (고래보다 가까움). 심해 샛비늘치는 몸 주변이 은은하게 빛남
      for (const f of S.fish) {
        const a = FISH[f.zone].alpha * (0.75 + 0.25 * f.z) * Math.max(kz[f.zone], f.leaving ? 0 : 1) * (f.leaving ? kz[f.zone] : 1);
        if (a < 0.02) continue;
        if (f.kind === 'lantern') { c.globalCompositeOperation = 'lighter'; c.globalAlpha = a * 0.22; const r = f.len * 0.7; c.drawImage(DOT.cyan, f.x - r, f.y - r * 0.5, r * 2, r); c.globalCompositeOperation = 'source-over'; }
        drawFishOne(f, a);
      }
      c.globalAlpha = 1;
      // 부유 입자 / 마린 스노우
      const sn = ZONES[S.zone].snow;
      c.globalCompositeOperation = 'lighter';
      for (const p of S.snow) {
        const r = 1.2 + p.z * 2.6;
        c.globalAlpha = sn.a * p.z * (0.6 + 0.4 * Math.sin(S.t * 0.7 + p.ph));
        c.drawImage(DOT[sn.col], p.x * w + p.ox - r, p.y * h + p.oy - r, r * 2, r * 2);
      }
      // 생물발광 (심해에서 가장 밝고, 난파선에서는 은은하게, 산호초에서는 없음)
      const bk = kz[2] + kz[1] * 0.5;
      if (bk > 0) for (const p of S.bio) {
        if (p.glow < 0.02) continue;
        const r = 3 + p.r * (6 + p.glow * 10);
        c.globalAlpha = bk * p.glow; c.drawImage(p.r > 1.1 ? DOT.teal : DOT.cyan, p.x * w - r, p.y * h - r, r * 2, r * 2);
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      for (const b of S.bubbles) { c.globalAlpha = b.a * 0.9; c.drawImage(BUBBLE, b.x - b.r, b.y - b.r, b.r * 2, b.r * 2); }
      c.globalAlpha = 1;
    }

    return {
      frame,
      setFilter(css) { css = css || 'none'; if (css !== filterCss) { filterCss = css; built = ''; } },
      click() {
        const [x, y] = mouseXY(), z = ZONES[S.zone].id;
        scareFish(x, y, 280, 3);
        SCHOOLS.forEach((cf, si) => {
          const g = S.schools[si]; if (!g || !g.fish.some(f => Math.hypot(f.x - x, f.y - y) < 240)) return;
          if (g.mode === 'hover') g.dive = 1; else g.scatter = 1;
        });
        if (z === 'reef') bubbles(x, y, 8, 6);
        else if (z === 'wreck') for (const p of S.snow) { if (Math.hypot(p.x * w + p.ox - x, p.y * h + p.oy - y) < 160) { p.ox += rand(-20, 20); p.oy += rand(-20, 20); } }
        if (z !== 'reef') bioWave(x, y, z === 'abyss' ? 420 : 700);
      },
      action: act,
      destroy() { root.innerHTML = ''; root.style.background = ''; },
      _state: S, _goto: gotoZone
    };
  }
};
// 같은 scene.js 를 세 팩이 함께 씀 → 이 스크립트를 불러온 팩 폴더 이름(…/<id>/scene.js)으로 자기 id 만 등록
// (여러 id 를 한꺼번에 등록하면 앱이 다른 팩을 manifest 없이 재사용해 이미지 경로가 깨짐)
{
  const m = /\/([a-z0-9-]+)\/[^/]*\.js(?:[?#]|$)/.exec(document.currentScript?.src || '');
  const ids = m ? [m[1]] : ['ocean-reef', 'ocean-wreck', 'ocean-abyss'];
  ids.forEach(id => window.LiveWallpaperScenes.register({ id, create: OCEAN_SCENE.create }));
}
})();
