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
3. `node tools/build-index.mjs`로 검사합니다. (`main`에 push하면 Action이 `index.json`을 다시 만들어 커밋합니다)
4. 배포할 시점에 태그를 답니다. 앱은 태그 기준으로 내려받습니다(예: `v2026.11.1`).

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
- 장면 좌표(`host.w×host.h`)는 화면 배율과 무관한 설계 해상도입니다. 캔버스에 devicePixelRatio를 곱하지 마세요(고DPI에서 2배 이상 무거워집니다).
