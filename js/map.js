import * as THREE from '../lib/three.module.js';
import { GLTFLoader } from '../lib/jsm/loaders/GLTFLoader.js';
import { PRODUCT_LINKS } from './config.js';

// 03 PROJECTS: 3D 지도 (environment.glb, 핀 3개)
const canvas = document.getElementById('map');
if (canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 2.2, 6);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.AmbientLight(0xffffff, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5);
  sun.position.set(3, 5, 4);
  scene.add(sun);

  const group = new THREE.Group();
  scene.add(group);
  const pins = [];

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  addEventListener('resize', resize);
  resize();

  new GLTFLoader().load('./assets/models/environment.glb', (gltf) => {
    group.add(gltf.scene);
    gltf.scene.traverse((o) => {
      const m = /^pin-0(\d)$/.exec(o.name);
      if (m) pins.push({ obj: o, index: Number(m[1]) - 1 });
    });
  }, undefined, () => { /* 모델이 없으면 빈 지도로 둔다 */ });

  // 드래그로 회전
  let dragging = false, lastX = 0, rotY = 0;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    rotY += (e.clientX - lastX) * 0.008;
    lastX = e.clientX;
  });

  // 핀 클릭: 제품 페이지 이동 (주소는 config.js)
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener('click', (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pins.map((p) => p.obj), true);
    if (!hit.length) return;
    let o = hit[0].object;
    while (o && !/^pin-0\d$/.test(o.name)) o = o.parent;
    const pin = pins.find((p) => p.obj === o);
    const url = pin && PRODUCT_LINKS[pin.index];
    if (url) location.href = url;
  });

  const loop = () => {
    group.rotation.y = rotY;
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  };
  loop();
}
