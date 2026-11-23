# myWinAssets

[LiveWallpaper](https://github.com/zaruous/myWinDesktop)의 **공식 에셋 팩 저장소**입니다.
폴더 하나가 팩 하나이며, 앱의 스토어 탭에서 골라 설치합니다.

```
myWinAssets/
├─ index.json                  ← 앱이 읽는 팩 목록 (자동 생성 — 직접 편집 금지)
├─ schema/manifest.schema.json ← manifest 검증 스키마
├─ tools/build-index.mjs       ← 검사 + index.json 생성
└─ packs/
   └─ xmas-eve/
      ├─ manifest.json
      ├─ thumb.jpg             ← 480×270 썸네일
      ├─ scene.js              ← 장면 스크립트
      └─ assets/…              ← 이미지 등
```

## 팩 추가·수정 절차

1. `packs/<id>/` 폴더를 만들고 `manifest.json`, `thumb.jpg`, `scene.js`, `assets/`를 넣습니다. (`id` = 폴더 이름)
2. 고칠 때는 `manifest.json`의 `version`을 올립니다. 앱은 버전이 바뀌어야 업데이트로 인식합니다.
   - 팩이 새 앱 기능에 기대면 `"minAppVersion": "1.2.0"`을 적습니다. 그보다 낮은 앱에서는 스토어에 "앱 업데이트 필요"로 표시되고 설치되지 않습니다. (앱 버전 = `LiveWallpaper.csproj`의 `<Version>`)
   - 앱 없이 장면만 보려면 레포 루트에서 `python -m http.server 8790`을 실행하고 `http://localhost:8790/tools/preview.html?pack=<id>`를 엽니다. (장면 버튼·색감 필터·펫 자리 표시 포함)
3. `node tools/build-index.mjs`로 검사합니다. (`main`에 push하면 Action이 `index.json`을 다시 만들어 커밋합니다)
4. **배포**: GitHub → Actions → `release` → *Run workflow*. (또는 `gh workflow run release -R zaruous/myWinAssets`)

## 배포 구조 (채널 + 태그)

```
앱 ── ① raw.githubusercontent.com/…/main/channel.json   { "ref": "v2026.11.22" }
   └─ ② cdn.jsdelivr.net/gh/zaruous/myWinAssets@v2026.11.22/index.json, 팩 파일
        (실패하면 raw.githubusercontent.com/…/v2026.11.22/ 로 재시도)
```

- `main`에 push해도 **배포 전까지는 사용자에게 보이지 않습니다.** 앱은 `channel.json`이 가리키는 태그만 읽습니다.
- `release` 워크플로가 `index.json` 확인 → 태그 `vYYYY.MM.DD`(같은 날 또 하면 `.2`, `.3` …) 생성 → `channel.json` 갱신을 처리합니다.
- 태그는 내용이 바뀌지 않으므로 목록과 파일이 항상 짝이 맞고, CDN이 영구 캐시합니다.
- **롤백**: `release`를 실행할 때 `rollback_to`에 이전 태그를 넣으면 `channel.json`만 되돌립니다.
- 앱 개발 중 배포 전 상태를 미리 보려면 환경 변수 `LIVEWALLPAPER_STORE_URL=https://raw.githubusercontent.com/zaruous/myWinAssets/main/`로 채널을 건너뛸 수 있습니다.

> 파일은 바이트 그대로 저장합니다(`.gitattributes`의 `* -text`). 줄바꿈이 바뀌면 sha256이 달라져 앱이 설치를 거부합니다.
> 파일 하나는 20MB 이하로 유지합니다(jsDelivr CDN 제한). 큰 영상은 Release 첨부 파일로 올립니다.

## 장면 인터페이스 (sceneApi 1)

`scene.js`는 앱의 배경 페이지 안에서 실행되며, 다음과 같이 장면을 등록합니다.

```js
window.LiveWallpaperScenes.register({
  id: 'my-scene',               // manifest 의 id 와 같아야 함
  create(host) {
    // host.root      장면 전용 <div> (화면 전체). 여기에 캔버스·이미지를 만들어 넣습니다
    // host.w, host.h 장면 좌표계 크기 (설계 해상도, 기본 1920×1080 — 매 프레임 다시 읽을 것)
    // host.mouse     { normX, normY } 0~1 마우스 위치 (실시간 갱신되는 같은 객체)
    // host.asset(p)  팩 폴더 기준 경로 → URL. 캔버스에서 픽셀을 읽을 이미지는 img.crossOrigin = 'anonymous'
    // host.manifest  이 팩의 manifest
    // host.pets?.()  (앱 1.1.0+) 켜진 펫 위치 [{ key, x, y }] — 설계 좌표, y 는 발 높이. 이전 앱에는 없으므로 ?. 로 호출
    return {
      frame(t) {},              // 매 프레임 (requestAnimationFrame 시각). dt 는 직접 계산하고 상한(예: 0.05초)을 둘 것
      setFilter(css) {},        // 색감 테마의 CSS filter 문자열 (선택)
      click() {},               // 바탕화면 클릭 (선택)
      action(id) {},            // manifest.actions 버튼 (선택)
      destroy() {}              // 다른 배경으로 바뀔 때 정리 (선택). 돌아오면 create 가 다시 호출됨
    };
  }
});
```

- 장면은 펫·파티클·위젯 **아래**에 그려집니다. 앱의 전역 `canvas { z-index: 3 }` 규칙을 덮어쓰려면 `#id`로 z-index를 지정하세요.
- 스타일은 `host.root` 안에 `<style>`로 넣고, 선택자는 장면 고유 id나 class로 한정하세요.
- **배경 레이어와 권장 테마** — 팩은 *배경 레이어*(scene.js 가 그리는 장면 자체)와 *권장 테마*(그 위에 앱의 프로그램 효과를 골라 둔 설정)를 함께 제공합니다. 앱의 정의·규칙은 [앱 README의 '배경 레이어 · 테마 · 장면 팩'](https://github.com/zaruous/myWinDesktop#-배경-레이어--테마--장면-팩)을 따릅니다.
  ```json
  "theme": {
    "name": "🦑 바닷속 심해 테마",
    "config": { "particleType": "fireflies", "particleCount": 40, "vignette": true, "mouseEffect": "aura_lines",
                "activeCreatures": ["otter", "pastel_cat"], "petCostume": "auto" }
  }
  ```
  - `config` 키는 앱 테마 설정 이름(대소문자 무시): `colorTheme`, `brightness`, `particleType`/`Count`/`Speed`, `sunbeams`, `vignette`, `fogEffect`, `auroraEffect`, `shootingStars`, `lightningEffect`, `breathingEffect`, `mouseEffect`, `activeCreatures`, `petFleeMode`, `petCostume`, `iconCollision`, `windowCollision` 등. 모르는 키는 무시됩니다.
  - 배경 소스(`bgMode`·`bgUrl`)와 위젯 배치(`widgets` 등)는 바꿀 수 없습니다. 적지 않은 항목은 사용자의 현재 설정을 따릅니다.
  - 권장 테마에는 장면과 겹치는 효과는 끄고, 장면을 살리는 **프로그램 효과를 골라 넣습니다** (예: 해양 → 기포 파티클 + 물결 마우스, 난파선 → 안개 + 비네트).
  - 앱 동작(1.2.0+): 스토어에서 처음 설치하거나 '적용'하면 배경과 이 테마를 함께 적용하고, 설치된 팩마다 이 테마가 테마 목록에 들어갑니다. 같은 이름의 테마가 있으면 덮어쓰지 않으며, 사용자는 고쳐 저장할 수 있고 **↺ 기본값으로** 버튼으로 지금 팩의 `theme` 값으로 되돌릴 수 있습니다. `theme` 이 없으면 배경만 바꾼 '아이콘 + 팩 이름' 테마를 만듭니다.
- manifest 에 `"petCostume": "scuba"` 처럼 적으면 이 장면이 켜져 있는 동안 펫에게 그 분장을 씌웁니다(사용자 펫 분장 설정이 '🎭 장면에 맞춤'일 때만, 앱 1.2.0+. '분장 없음'이면 씌우지 않음). 값: `santa`·`rudolph`·`mix`·`scuba`.
- `host.w×host.h` 는 화면(모니터) 해상도입니다. **16:9 가 아닐 수 있으니**(21:9·16:10·세로 모니터·여러 모니터 이어 붙이기) 캔버스를 CSS 로 늘리지 말고, 16:9 설계 좌표를 한 번의 변환(가로·세로 같은 배율)으로 화면에 맞추세요. 바닥이 중요한 장면은 아래쪽에 붙이고 위쪽을 잘라 냅니다(예: `ocean-*` 팩의 `updateView`/`baseT`). 캔버스에 devicePixelRatio를 곱하지 마세요(고DPI에서 2배 이상 무거워집니다).
