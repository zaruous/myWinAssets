// packs/*/manifest.json 을 검사하고 index.json 을 만든다. (의존성 없음, Node 18+)
//   node tools/build-index.mjs           → index.json 갱신
//   node tools/build-index.mjs --check   → index.json 이 최신이 아니면 실패 (CI 용)
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PACKS = join(ROOT, 'packs');
const INDEX = join(ROOT, 'index.json');
const SCENE_API_MAX = 1;               // 앱이 지원하는 최신 장면 인터페이스
const errors = [];

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    if (e.name.startsWith('.')) return [];
    const p = join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

function validate(m, dir, folder) {
  const err = msg => errors.push(`${folder}: ${msg}`);
  if (m.id !== folder) err(`id "${m.id}" 가 폴더 이름과 다름`);
  if (!/^[a-z0-9][a-z0-9-]{1,47}$/.test(m.id ?? '')) err('id 는 소문자·숫자·하이픈 2~48자');
  if (!/^\d+\.\d+\.\d+$/.test(m.version ?? '')) err('version 은 1.2.3 형식');
  if (m.type !== 'scene') err(`알 수 없는 type "${m.type}"`);
  if (!m.title) err('title 없음');
  if (m.type === 'scene') {
    if (!Number.isInteger(m.sceneApi) || m.sceneApi < 1 || m.sceneApi > SCENE_API_MAX) err(`sceneApi 는 1~${SCENE_API_MAX}`);
    if (!m.entry || !existsSync(join(dir, m.entry))) err(`entry "${m.entry}" 파일 없음`);
  }
  if (m.thumb && !existsSync(join(dir, m.thumb))) err(`thumb "${m.thumb}" 파일 없음`);
  if (m.minAppVersion !== undefined && !/^\d+\.\d+\.\d+$/.test(m.minAppVersion)) err('minAppVersion 은 1.2.3 형식');
  const ids = new Set();
  for (const a of m.actions ?? []) {
    if (!/^[a-z0-9-]+$/.test(a.id ?? '') || !a.label) err(`잘못된 action ${JSON.stringify(a)}`);
    if (ids.has(a.id)) err(`action id 중복 "${a.id}"`);
    ids.add(a.id);
  }
}

const packs = [];
for (const folder of readdirSync(PACKS).sort()) {
  const dir = join(PACKS, folder);
  if (!statSync(dir).isDirectory()) continue;
  const mf = join(dir, 'manifest.json');
  if (!existsSync(mf)) { errors.push(`${folder}: manifest.json 없음`); continue; }
  let m;
  try { m = JSON.parse(readFileSync(mf, 'utf8')); } catch (e) { errors.push(`${folder}: manifest.json 파싱 실패 - ${e.message}`); continue; }
  validate(m, dir, folder);

  const files = walk(dir).sort().map(p => {
    const buf = readFileSync(p);
    return { path: relative(dir, p).split(sep).join('/'), size: buf.length, sha256: createHash('sha256').update(buf).digest('hex') };
  });
  const { $schema, ...meta } = m;
  packs.push({ ...meta, path: `packs/${folder}`, size: files.reduce((s, f) => s + f.size, 0), files });
}

if (errors.length) {
  console.error('❌ 팩 검사 실패\n  ' + errors.join('\n  '));
  process.exit(1);
}

const json = JSON.stringify({ schema: 1, packs }, null, 2) + '\n';
if (process.argv.includes('--check')) {
  const cur = existsSync(INDEX) ? readFileSync(INDEX, 'utf8').replace(/\r\n/g, '\n') : '';
  if (cur !== json) { console.error('❌ index.json 이 최신이 아닙니다. node tools/build-index.mjs 를 실행해 주세요.'); process.exit(1); }
  console.log(`✅ index.json 최신 (${packs.length}개 팩)`);
} else {
  writeFileSync(INDEX, json);
  console.log(`✅ index.json 갱신 (${packs.length}개 팩)`);
}
