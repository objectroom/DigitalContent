/* 03 PROJECTS — 3D 축제 지도 (environment.glb) + 핀 + 핀 카드
   원본 웹사이트의 지도 조작(드래그 회전·기울기, Ctrl/⌘+휠 확대, +/−/초기화 버튼, 진입 연출, 대기 중 자동 회전)과
   핀·카드 디자인을 그대로 옮기고, 지도만 CSS 박스 대신 3D 모델로 바꿨다.
   와이어프레임 03-B: 핀 호버 → 카드(INTERACTION-09), 핀/카드 클릭 → 제품 페이지(INTERACTION-10) */
import * as THREE from '../lib/three.module.js';
import { GLTFLoader } from '../lib/jsm/loaders/GLTFLoader.js';
import { PRODUCT_LINKS, PRODUCT_DIRS, PIN_ANCHORS } from './config.js';

const $ = (s) => document.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const eOut = (t) => 1 - Math.pow(1 - t, 3);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const MISSING = '내용 입력 필요';

const mstage = $('#mapStage'), canvas = $('#map'), pinLayer = $('#mapPins');
const pcard = $('#pcard'), warpMap = $('#warpMap');

/* ---------- 제품 데이터: 각 제품 폴더의 product.json(TEXT-01) + product-hero.webp ---------- */
const products = PRODUCT_DIRS.map((dir, i) => ({ n: i + 1, dir, name: MISSING, one: MISSING }));
products.forEach((p) => {
  fetch(`${p.dir}/assets/content/product.json`)
    .then((r) => (r.ok ? r.json() : Promise.reject()))
    .then((j) => { const t = j['TEXT-01'] || {}; p.name = t['PATH GUARD'] || t.name || MISSING; p.one = t['필요한 순간, 길을 열다'] || t.tagline || MISSING; })
    .catch(() => {})
    .finally(() => { const el = pinEls[p.n - 1]; if (el) { el.querySelector('.tip').textContent = p.name === MISSING ? `PROJECT 0${p.n}` : p.name; el.setAttribute('aria-label', `${p.n}번 ${p.name === MISSING ? '' : p.name}`.trim()); } });
});

/* ---------- 핀 DOM (원본 디자인) ---------- */
pinLayer.innerHTML = products.map((p, i) =>
  `<div class="pin" data-n="${p.n}" style="--i:${i}" tabindex="0" role="button" aria-label="${p.n}번"><div class="pi"><span class="tip">PROJECT 0${p.n}</span><span class="head">${p.n}</span><span class="stem"></span></div></div>`).join('');
const pinEls = [...pinLayer.querySelectorAll('.pin')];

/* ---------- Three.js ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 500);
scene.add(new THREE.HemisphereLight(0xffffff, 0xd7d6e5, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.5);
sun.position.set(12, 24, 14);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 80 });
sun.shadow.radius = 6;
scene.add(sun);

const world = new THREE.Group();
scene.add(world);
const anchors = [null, null, null];      // 핀을 세울 3D 위치 (모델 좌표)
const anchorMeshes = [null, null, null];
let R = 20, loaded = false;

// 원본 지도 색: 윗면 흰색, 옆면 라벤더 그레이, 바닥 연보라
const MAT = {
  ground: new THREE.MeshStandardMaterial({ color: 0xf4f3fa, roughness: 1 }),
  box: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .85 }),
  round: new THREE.MeshStandardMaterial({ color: 0xede6f8, roughness: .8 }),
};
const HL = new THREE.MeshStandardMaterial({ color: 0xf1e5f7, roughness: .7, emissive: 0xb8b6e5, emissiveIntensity: .18 });

new GLTFLoader().load('./assets/models/environment.glb', (gltf) => {
  const root = gltf.scene;
  root.traverse((o) => {
    if (!o.isMesh) return;
    const hasOwn = o.material && o.material.name;           // 모델에 재질이 있으면 그대로 쓴다
    if (!hasOwn) o.material = /^Plane/.test(o.name) ? MAT.ground : /^Cylinder/.test(o.name) ? MAT.round : MAT.box;
    o.castShadow = !/^Plane/.test(o.name);
    o.receiveShadow = true;
  });
  world.add(root);
  root.updateMatrixWorld(true);
  // 모델 중심을 원점으로
  const box = new THREE.Box3().setFromObject(root);
  const c = box.getCenter(new THREE.Vector3());
  root.position.x -= c.x; root.position.z -= c.z; root.position.y -= box.min.y;
  root.updateMatrixWorld(true);
  R = box.getSize(new THREE.Vector3()).length() / 2;
  // 핀 위치: pin-01~03 오브젝트 → 없으면 PIN_ANCHORS 이름의 오브젝트 꼭대기
  for (let i = 0; i < 3; i++) {
    const find = (nm) => nm && (root.getObjectByName(nm) || root.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(nm)));   // 로더가 이름의 '.'을 지운다 (Cube.067 → Cube067)
    const o = find(`pin-0${i + 1}`) || find(PIN_ANCHORS[i]);
    if (!o) continue;
    const b = new THREE.Box3().setFromObject(o);
    anchors[i] = new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2);
    if (o.isMesh) { anchorMeshes[i] = o; o.userData.base = o.material; }
  }
  pinEls.forEach((el, i) => { el.hidden = !anchors[i]; });
  loaded = true; map.dirty = true; resize();
}, undefined, () => { pinEls.forEach((el) => { el.hidden = true; }); });

/* ---------- 지도 상태 (원본 값) ---------- */
const map = { rot: -38, tilt: 56, zoom: 1, tx: 0, tz: 0, cur: { rot: -38, tilt: 56, zoom: 1, tx: 0, tz: 0 }, sel: 0, hover: 0, dirty: true };
let W = 1, H = 1;
function resize() {
  W = mstage.clientWidth; H = mstage.clientHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  // 원본처럼 지도 중심을 화면 57% / 57% 지점에 둔다 (왼쪽 위 제목 자리 비우기)
  camera.setViewOffset(W, H, -W * .07, -H * .07, W, H);
  camera.updateProjectionMatrix();
  map.dirty = true;
}
addEventListener('resize', resize);
resize();

const tgt = new THREE.Vector3();
function applyCamera() {
  const c = map.cur;
  const fit = (R / Math.sin(THREE.MathUtils.degToRad(camera.fov / 2))) * .78;
  const aspectK = Math.max(1, 1.42 / camera.aspect);           // 세로로 긴 화면은 조금 더 멀리
  const dist = fit * aspectK / (c.zoom * (W < 700 ? 1.3 : 1));
  const az = THREE.MathUtils.degToRad(c.rot), po = THREE.MathUtils.degToRad(c.tilt);
  tgt.set(c.tx, 0, c.tz);
  camera.position.set(tgt.x + dist * Math.sin(po) * Math.sin(az), dist * Math.cos(po), tgt.z + dist * Math.sin(po) * Math.cos(az));
  camera.lookAt(tgt);
}

/* ---------- 핀 화면 위치 ---------- */
const v = new THREE.Vector3();
function placePins() {
  pinEls.forEach((el, i) => {
    const a = anchors[i]; if (!a) return;
    v.copy(a).add(world.position).project(camera);
    const x = (v.x * .5 + .5) * W, y = (-v.y * .5 + .5) * H;
    const off = v.z > 1 || x < -40 || x > W + 40 || y < -40 || y > H + 80;
    el.style.visibility = off ? 'hidden' : '';
    el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
  });
}

/* ---------- 강조 (핀 1.3배, 나머지 핀 40%) ---------- */
function setHL(n) {
  pinEls.forEach((p) => p.classList.toggle('hl', +p.dataset.n === n));
  pinLayer.classList.toggle('focus', !!n);
  anchorMeshes.forEach((m, i) => { if (m) m.material = (i + 1 === n) ? HL : m.userData.base; });
}

/* ---------- 카드 (원본 pcard) ---------- */
function warp(from = 46, dur = 900) {
  if (reduce || !warpMap) return; mstage.classList.add('warp'); const t0 = performance.now();
  (function f(t) { const k = clamp((t - t0) / dur); warpMap.setAttribute('scale', (from * (1 - eOut(k))).toFixed(2)); if (k < 1) requestAnimationFrame(f); else mstage.classList.remove('warp'); })(t0);
}
let shown = 0;
function fillCard(n) {
  const p = products[n - 1];
  const vis = $('#pcVis');
  vis.innerHTML = '';
  const img = new Image();
  img.alt = p.name === MISSING ? '' : p.name;
  img.onerror = () => img.remove();
  img.src = `${p.dir}/assets/images/product-hero.webp`;
  vis.appendChild(img);
  $('#pcLabel').textContent = `PROJECT 0${p.n}`;
  const nm = $('#pcName'), one = $('#pcOne');
  nm.textContent = p.name; one.textContent = p.one;
  nm.classList.toggle('is-missing', p.name === MISSING);
  one.classList.toggle('is-missing', p.one === MISSING);
  const go = $('#pcGo'), url = PRODUCT_LINKS[n - 1];
  go.hidden = !url; if (url) go.href = url;
}
function openCard(n, sticky) {
  if (sticky) {
    map.sel = n;
    const a = anchors[n - 1];
    if (a) { map.tx = a.x * .6; map.tz = a.z * .6; map.zoom = Math.max(map.zoom, 1.25); }
  }
  setHL(n);
  if (shown !== n) {
    fillCard(n);
    pcard.classList.remove('open'); void pcard.offsetWidth; pcard.classList.add('open'); warp();
    shown = n;
  }
}
function closeCard() {
  map.sel = 0; shown = 0; pcard.classList.remove('open'); setHL(0);
  map.tx = 0; map.tz = 0; map.zoom = Math.min(map.zoom, 1);
}
$('#pcardX').onclick = closeCard;
pcard.addEventListener('pointerdown', (e) => e.stopPropagation());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && shown) closeCard(); });

let hideT = 0;
pinEls.forEach((p) => {
  const n = +p.dataset.n;
  p.addEventListener('pointerenter', (e) => { if (e.pointerType === 'touch') return; if (pjTourActive) { setHL(n); return; } clearTimeout(hideT); if (!map.sel || map.sel === n) openCard(n, false); });
  p.addEventListener('pointerleave', (e) => { if (e.pointerType === 'touch' || map.sel) return; if (pjTourActive) { setHL(TOUR[pj.stop] || 0); return; } hideT = setTimeout(() => { if (!map.sel) closeCard(); }, 240); });
  p.addEventListener('click', (e) => {
    e.stopPropagation();
    const url = PRODUCT_LINKS[n - 1];
    const touch = e.pointerType === 'touch' || matchMedia('(pointer:coarse)').matches;
    if (url && (!touch || shown === n)) { location.href = url; return; }
    openCard(n, true);
  });
  p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const url = PRODUCT_LINKS[n - 1]; if (url && shown === n) location.href = url; else openCard(n, true); } });
});
pcard.addEventListener('pointerenter', () => clearTimeout(hideT));
pcard.addEventListener('pointerleave', () => { if (!map.sel) hideT = setTimeout(() => { if (!map.sel) closeCard(); }, 240); });

/* ---------- 드래그 회전·기울기, 확대 (원본 값) ---------- */
let drag = null, lastMapInt = performance.now();
mstage.addEventListener('pointerdown', (e) => {
  lastMapInt = performance.now();
  if (e.target.closest('.pin,.pcard,.map-ctrl')) return;
  drag = { x: e.clientX, y: e.clientY, r: map.rot, t: map.tilt, moved: false };
  mstage.setPointerCapture(e.pointerId);
});
mstage.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.abs(dx) + Math.abs(dy) > 4) { drag.moved = true; mstage.classList.add('drag'); }
  map.rot = drag.r - dx * .3; map.tilt = clamp(drag.t - dy * .18, 30, 72);
});
const endDrag = () => { if (!drag) return; const moved = drag.moved; drag = null; mstage.classList.remove('drag'); if (!moved && map.sel) closeCard(); };
mstage.addEventListener('pointerup', endDrag); mstage.addEventListener('pointercancel', endDrag);
mstage.addEventListener('wheel', (e) => { lastMapInt = performance.now(); if (!(e.ctrlKey || e.metaKey)) return; e.preventDefault(); map.zoom = clamp(map.zoom * Math.exp(-e.deltaY * .004), .6, 2.2); }, { passive: false });
$('#zIn').onclick = () => { map.zoom = clamp(map.zoom * 1.2, .6, 2.2); };
$('#zOut').onclick = () => { map.zoom = clamp(map.zoom / 1.2, .6, 2.2); };
$('#zReset').onclick = () => { map.rot = -38; map.tilt = 56; map.zoom = 1; map.tx = 0; map.tz = 0; closeCard(); };

/* ---------- 진입 연출 + 대기 중 자동 회전 (원본) ---------- */
let entered = false, visible = false;
new IntersectionObserver((es) => es.forEach((e) => {
  visible = e.isIntersecting;
  if (e.isIntersecting && !entered) {
    entered = true;
    if (!reduce) { map.cur.rot = -150; map.cur.tilt = 80; map.cur.zoom = .45; }
    pinLayer.classList.remove('pre'); pinLayer.classList.add('enter');
    lastMapInt = performance.now();
  }
}), { threshold: .02 }).observe($('#projects'));


/* ======================= PROJECTS v4 · 핀 번호 착지 → 가이드 투어 → 자유 탐색 =======================
   작업본(College Festival 2031 작업본)의 연출과 수치를 그대로 옮겼다. 구슬 대신 핀 번호 1·2·3이 각 핀 자리로 내려앉고,
   투어는 핀 1 → 2 → 3 순서로 카메라가 제품을 비춘다. 투어가 끝나면 제목·지도 버튼이 나타나고 직접 조작할 수 있다. */
const lerp = (a, b, t) => a + (b - a) * t;
const eIn = (t) => t * t * t, eIO = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const range = (p, a, b) => clamp((p - a) / (b - a));
const pj = { el: $('#projects'), p: 0, t: 0, stop: -2 };
const pjSticky = $('.pj-sticky'), pjHead = $('.pj-head'), pjOrbs = [...document.querySelectorAll('.pj-orb')];
const pjTour = $('#pjTour'), ptK = $('#ptK'), ptN = $('#ptN'), ptO = $('#ptO'), ptGo = $('#ptGo');
const TOUR = [1, 2, 3];
const PJ_T0 = .17, PJ_T1 = .91, PJ_TW = (PJ_T1 - PJ_T0) / TOUR.length;
const BASE = { rot: -38, tilt: 56 };
let pjTourActive = false;
function pinCenter(i) { const el = pinEls[i]; if (el && !el.hidden) { const r = el.querySelector('.head').getBoundingClientRect(); if (r.width) return [r.left + r.width / 2, r.top + r.height / 2]; } return [innerWidth * .57, innerHeight * .57]; }
function renderProjects(p) {
  const VW = innerWidth, VH = innerHeight;
  // 핀 번호 3개가 각 핀 자리로 내려앉는다
  const land = eIO(range(p, .05, .14)), gone = range(p, .13, .16);
  if (p < .17) {
    const box = pjSticky.getBoundingClientRect();
    pjOrbs.forEach((o, i) => {
      const gap = Math.min(VW * .26, 260), sx = VW / 2 + (i - 1) * gap, sy = VH * .34;
      const z = land > 0 ? pinCenter(i) : [sx, sy], x = lerp(sx, z[0], land), y = lerp(sy, z[1] - box.top, land) - Math.sin(land * Math.PI) * 60;
      o.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%) scale(${(1 - .78 * land).toFixed(4)})`;
      o.style.opacity = (1 - gone).toFixed(3);
      const rp = o.querySelector('.ripple'), rk = range(p, .12, .16);
      rp.style.transform = `translate(-50%,-50%) scale(${(rk * 4).toFixed(3)})`; rp.style.opacity = (rk > 0 ? (1 - rk) : 0).toFixed(3);
    });
  } else pjOrbs.forEach((o) => { o.style.opacity = '0'; });
  // 투어 정류장
  const st = p < PJ_T0 ? -1 : p < PJ_T1 ? Math.min(TOUR.length - 1, Math.floor((p - PJ_T0) / PJ_TW)) : 99;
  if (st !== pj.stop) {
    pj.stop = st;
    if (st >= 0 && st < 99) {
      const n = TOUR[st], pr = products[n - 1], a = anchors[n - 1];
      if (map.sel || shown) closeCard();
      if (a) { map.tx = a.x; map.tz = a.z; }
      map.zoom = VW < 700 ? 1.45 : 1.7; map.rot = BASE.rot + (st - 1) * 12; map.tilt = 52; setHL(n);
      ptK.textContent = `PROJECT 0${n}`;
      ptN.textContent = pr.name; ptO.textContent = pr.one;
      ptN.classList.toggle('is-missing', pr.name === MISSING); ptO.classList.toggle('is-missing', pr.one === MISSING);
      const url = PRODUCT_LINKS[n - 1]; ptGo.hidden = !url; if (url) ptGo.href = url;
    } else if (!map.sel) { map.tx = 0; map.tz = 0; map.zoom = 1; map.rot = BASE.rot; map.tilt = BASE.tilt; setHL(0); }
  }
  if (st >= 0 && st < 99) {
    const local = (p - PJ_T0) / PJ_TW - st, ti = eOut(clamp(local / .28)), to = eIn(clamp((local - .84) / .16)), w = (1 - ti) + to;
    pjTour.style.opacity = (ti * (1 - to)).toFixed(3);
    pjTour.style.transform = `translateY(${VW < 700 ? 0 : -50}%) translateY(${((1 - ti) * 36 - to * 30).toFixed(1)}px)`;
    pjTour.style.filter = w > .004 ? `blur(${(w * 10).toFixed(2)}px)` : 'none';
    pjTour.classList.toggle('live', ti * (1 - to) > .6);
  } else { pjTour.style.opacity = '0'; pjTour.classList.remove('live'); }
  pjTourActive = p >= PJ_T0 - .01 && p < PJ_T1;
  const free = p >= PJ_T1 + .01; pjSticky.classList.toggle('free', free);
  pjHead.style.opacity = free ? eOut(range(p, PJ_T1, PJ_T1 + .05)).toFixed(3) : '0';
  pjHead.style.pointerEvents = free ? '' : 'none';
}
function pjTick() {
  const el = pj.el, h = el.offsetHeight - innerHeight;
  pj.t = clamp((scrollY - el.offsetTop) / h);
  const near = Math.abs(pj.t - pj.p) > .0004;
  if (near) { pj.p = reduce ? pj.t : lerp(pj.p, pj.t, .14); renderProjects(pj.p); }
  else if (pj.p !== pj.t) { pj.p = pj.t; renderProjects(pj.p); }
}
renderProjects(0);

function tick(now) {
  pjTick();
  if (visible) {
    if (!reduce && entered && !map.sel && !drag && !pjTourActive && pjSticky.classList.contains('free') && now - lastMapInt > 4500 && !pinEls.some((p) => p.classList.contains('hl'))) map.rot += .035;
    const c = map.cur; let moving = false;
    for (const k of ['rot', 'tilt', 'zoom', 'tx', 'tz']) { const d = map[k] - c[k]; if (Math.abs(d) > .0005) { c[k] += d * .12; moving = true; } else c[k] = map[k]; }
    if (moving || map.dirty) { applyCamera(); placePins(); map.dirty = false; }
    if (loaded) renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
}
applyCamera();
requestAnimationFrame(tick);
