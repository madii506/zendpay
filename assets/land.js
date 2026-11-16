// ZEND landing: a glossy sealed envelope over an ascii globe, four more orbiting behind it. "enter terminal" dives through the seal into the app.
import * as THREE from './three.module.min.js';
import { RoomEnvironment } from './RoomEnvironment.js';
import { RoundedBoxGeometry } from './RoundedBoxGeometry.js';

const root = document.getElementById('land'), html = document.documentElement;
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const PHONE = Math.min(innerWidth, innerHeight) < 600;
const api = () => window.zendApi || {};

const WORD = ['███████ ███████ ███    ██ ██████  ', '   ███  ██      ████   ██ ██   ██ ', '  ███   █████   ██ ██  ██ ██   ██ ', ' ███    ██      ██  ██ ██ ██   ██ ', '███████ ███████ ██   ████ ██████ ▣'];
const STYLES = [
  { name: 'pearl', bg0: '#f6f3fd', bg1: '#e4ddf7', ink: '#17131f', ink2: '#6b6386', s1: '#8b5cff', s2: '#17131f', stamp: '#8b5cff', stampInk: '#ffffff', edge: '#d9d1f0', flap: 'rgba(60,40,120,.07)', seal: '#7646ff' },
  { name: 'obsidian', bg0: '#221d31', bg1: '#120f1b', ink: '#e9e4ff', ink2: '#8f88ad', s1: '#8b5cff', s2: '#e9e4ff', stamp: '#e9e4ff', stampInk: '#17131f', edge: '#16121f', flap: 'rgba(255,255,255,.05)', seal: '#8b5cff' },
  { name: 'violet', bg0: '#9a6dff', bg1: '#6b3df0', ink: '#ffffff', ink2: '#e2d8ff', s1: '#ffffff', s2: '#17131f', stamp: '#17131f', stampInk: '#ffffff', edge: '#5b31d6', flap: 'rgba(20,0,60,.12)', seal: '#17131f' },
  { name: 'lavender', bg0: '#ded3ff', bg1: '#b9a6f7', ink: '#17131f', ink2: '#4f4570', s1: '#17131f', s2: '#ffffff', stamp: '#ffffff', stampInk: '#6b3df0', edge: '#a693ea', flap: 'rgba(40,20,100,.09)', seal: '#6b3df0' },
  { name: 'silver', bg0: '#f2f2f6', bg1: '#c9c8d4', ink: '#17131f', ink2: '#5c5a6b', s1: '#17131f', s2: '#8b5cff', stamp: '#17131f', stampInk: '#cfc4ff', edge: '#b4b2c2', flap: 'rgba(0,0,0,.06)', seal: '#8b5cff', metal: .55 },
];

let started = false;
window.zendLand = { open() { html.classList.add('landing'); root.classList.remove('out', 'diving', 'ready'); if (!started) boot(); else start(); } };

// ---------------------------------------------------------------- textures
const rr = (x, y, w, h, r) => { const p = new Path2D(); p.moveTo(x + r, y); p.arcTo(x + w, y, x + w, y + h, r); p.arcTo(x + w, y + h, x, y + h, r); p.arcTo(x, y + h, x, y, r); p.arcTo(x, y, x + w, y, r); p.closePath(); return p; };
function paper(c, W, H, S, back) {
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, S.bg0); g.addColorStop(1, S.bg1); c.fillStyle = g; c.fillRect(0, 0, W, H);
  // airmail border: diagonal stripes in a band round the edge
  const b = W * .024; c.save(); const band = new Path2D(); band.rect(0, 0, W, H); band.rect(b, b, W - 2 * b, H - 2 * b); c.clip(band, 'evenodd');
  const sw = W * .03; for (let i = -H / sw - 2, k = 0; i < W / sw + 2; i++, k++) { const x0 = i * sw * 1.5; c.fillStyle = k % 2 ? S.s1 : S.s2; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + sw * .75, 0); c.lineTo(x0 + sw * .75 + H, H); c.lineTo(x0 + H, H); c.closePath(); c.fill(); }
  c.restore();
  if (back) { // flaps: a top flap down to a point, two side creases
    c.fillStyle = S.flap; c.beginPath(); c.moveTo(b, b); c.lineTo(W / 2, H * .6); c.lineTo(W - b, b); c.closePath(); c.fill();
    c.strokeStyle = S.flap; c.lineWidth = W * .003; c.beginPath(); c.moveTo(b, H - b); c.lineTo(W * .42, H * .5); c.moveTo(W - b, H - b); c.lineTo(W * .58, H * .5); c.stroke();
  }
}
function word(c, x, y, p, ink, dot) { const cw = p * .6, ch = p * 1.08; WORD.forEach((l, r) => [...l].forEach((g, k) => { if (g === '█') { c.fillStyle = ink; c.fillRect(x + k * cw, y + r * ch, cw + .6, ch + .6); } else if (g === '▣') { c.fillStyle = dot; c.fillRect(x + k * cw, y + r * ch, cw + .6, ch + .6); } })); return [cw * WORD[0].length, ch * 5]; }
function zmark(c, cx, cy, s, col, lw) { c.save(); c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'square'; c.lineJoin = 'miter'; c.beginPath(); c.moveTo(cx - s, cy - s); c.lineTo(cx + s, cy - s); c.lineTo(cx - s, cy + s); c.lineTo(cx + s, cy + s); c.stroke(); c.restore(); }
function front(S, W) {
  const H = Math.round(W / 1.5455), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), u = W / 2048, F = "'JetBrains Mono', ui-monospace, monospace";
  c.save(); c.clip(rr(0, 0, W, H, 14 * u)); paper(c, W, H, S, false);
  // wordmark + line
  word(c, 150 * u, 150 * u, 30 * u, S.ink, S.name === 'violet' ? S.s2 : '#8b5cff');
  c.fillStyle = S.ink2; c.font = `700 ${40 * u}px ${F}`; c.fillText('the privacy payment layer', 152 * u, 400 * u);
  // stamp: perforated, a Z, SEALED
  const sx = W - 470 * u, sy = 120 * u, sW = 300 * u, sH = 360 * u, pr = 13 * u;
  c.fillStyle = S.name === 'obsidian' ? '#2c2640' : '#ffffff'; c.fillRect(sx, sy, sW, sH);
  const bgAt = S.bg0; c.fillStyle = bgAt; for (let x = sx; x <= sx + sW + 1; x += pr * 2.6) { c.beginPath(); c.arc(x, sy, pr, 0, 7); c.arc(x, sy + sH, pr, 0, 7); c.fill(); } for (let y = sy; y <= sy + sH + 1; y += pr * 2.6) { c.beginPath(); c.arc(sx, y, pr, 0, 7); c.arc(sx + sW, y, pr, 0, 7); c.fill(); }
  c.fillStyle = S.stamp; c.fillRect(sx + 30 * u, sy + 30 * u, sW - 60 * u, sH - 60 * u);
  zmark(c, sx + sW / 2, sy + sH / 2 - 22 * u, 62 * u, S.stampInk, 30 * u);
  c.fillStyle = S.stampInk; c.font = `800 ${30 * u}px ${F}`; c.textAlign = 'center'; c.fillText('SEALED', sx + sW / 2, sy + sH - 58 * u); c.textAlign = 'left';
  // postmark over the stamp's corner, with cancel waves
  c.save(); c.translate(sx - 30 * u, sy + 250 * u); c.rotate(-.2); c.globalAlpha = .6; c.strokeStyle = S.ink; c.lineWidth = 5 * u;
  c.beginPath(); c.arc(0, 0, 135 * u, 0, 7); c.stroke(); c.beginPath(); c.arc(0, 0, 100 * u, 0, 7); c.stroke();
  c.fillStyle = S.ink; c.font = `800 ${25 * u}px ${F}`; const ring = (t, r, a0, dir) => { [...t].forEach((ch, i) => { c.save(); c.rotate(a0 + dir * i * .2); c.translate(0, -r * dir); c.textAlign = 'center'; c.fillText(ch, 0, dir > 0 ? 8 * u : 8 * u); c.restore(); }); };
  ring('SEALED', 108 * u, -.5, 1); ring('SOLANA', 108 * u, -.5 + Math.PI, 1);
  c.font = `800 ${34 * u}px ${F}`; c.textAlign = 'center'; c.fillText('ZEND', 0, 12 * u); c.restore();
  c.save(); c.globalAlpha = .55; c.strokeStyle = S.ink; c.lineWidth = 6 * u; for (let k = 0; k < 5; k++) { c.beginPath(); for (let x = 0; x <= 380 * u; x += 6 * u) { const X = sx - 560 * u + x, Y = sy + 170 * u + k * 34 * u + Math.sin(x / (40 * u)) * 10 * u; x ? c.lineTo(X, Y) : c.moveTo(X, Y); } c.stroke(); } c.restore();
  // address: to anyone, from nobody
  const ax = 640 * u, ay = 720 * u; c.fillStyle = S.ink2; c.font = `800 ${32 * u}px ${F}`; c.fillText('TO', ax, ay); c.fillText('FROM', ax, ay + 190 * u);
  c.fillStyle = S.ink; c.font = `800 ${68 * u}px ${F}`; c.fillText('any solana wallet', ax + 150 * u, ay + 10 * u);
  c.fillStyle = S.ink; c.fillRect(ax + 150 * u, ay + 136 * u, 700 * u, 70 * u);
  c.fillStyle = S.ink2; c.globalAlpha = .45; c.fillRect(ax, ay + 50 * u, 1200 * u, 4 * u); c.fillRect(ax, ay + 240 * u, 1200 * u, 4 * u); c.globalAlpha = 1;
  // postal bars and a route line
  for (let i = 0; i < 46; i++) { const tall = (i * 7 + 3) % 5 < 2; c.fillStyle = S.ink; c.fillRect(150 * u + i * 15 * u, H - (tall ? 210 : 185) * u, 7 * u, (tall ? 60 : 35) * u); }
  c.fillStyle = S.ink2; c.font = `700 ${26 * u}px ${F}`; c.fillText('SEALED ROUTE · NEAR INTENTS · SOL / USDC', 150 * u, H - 105 * u);
  c.restore(); return tex(cv);
}
function back(S, W) {
  const H = Math.round(W / 1.5455), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), u = W / 2048, F = "'JetBrains Mono', ui-monospace, monospace";
  c.save(); c.clip(rr(0, 0, W, H, 14 * u)); paper(c, W, H, S, true);
  c.fillStyle = S.ink2; c.font = `700 ${28 * u}px ${F}`; c.textAlign = 'center'; c.fillText('opened only by the wallet it was sent to', W / 2, H - 120 * u);
  c.restore(); return tex(cv);
}
let maxAniso = 4; const tex = cv => { const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = maxAniso; return t; };

// the wax seal with a raised Z
function seal(S) {
  const g = new THREE.Group(), sh = new THREE.Shape(), N = 64;
  for (let i = 0; i <= N; i++) { const a = i / N * Math.PI * 2, r = .34 * (1 + .045 * Math.sin(a * 9) + .03 * Math.sin(a * 5 + 1)); i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r); }
  const mat = new THREE.MeshPhysicalMaterial({ color: S.seal, roughness: .3, metalness: .05, clearcoat: 1, clearcoatRoughness: .18 });
  const disc = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: .04, bevelEnabled: true, bevelThickness: .03, bevelSize: .03, bevelSegments: 4, curveSegments: 4 }), mat); g.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.25, .014, 8, 48), mat); ring.position.z = .075; g.add(ring);
  const z = new THREE.Shape(), s = .13, w = .05; // a Z drawn as one polygon
  z.moveTo(-s, s); z.lineTo(s, s); z.lineTo(s, s - w); z.lineTo(-s + w * 1.25, -s + w); z.lineTo(s, -s + w); z.lineTo(s, -s); z.lineTo(-s, -s); z.lineTo(-s, -s + w); z.lineTo(s - w * 1.25, s - w); z.lineTo(-s, s - w); z.closePath();
  const zm = new THREE.Mesh(new THREE.ExtrudeGeometry(z, { depth: .03, bevelEnabled: true, bevelThickness: .008, bevelSize: .008, bevelSegments: 2 }), mat); zm.position.z = .07; g.add(zm);
  return g;
}
function envelope(S, res) {
  const g = new THREE.Group(), W = 3.4, H = 2.2, D = .045;
  const body = new THREE.Mesh(new RoundedBoxGeometry(W, H, D, 3, .02), new THREE.MeshPhysicalMaterial({ color: S.edge, roughness: .5, metalness: S.metal || 0 })); g.add(body);
  const mk = map => new THREE.MeshPhysicalMaterial({ map, roughness: .34, metalness: S.metal || 0, clearcoat: 1, clearcoatRoughness: .1, alphaTest: .5 });
  const fr = new THREE.Mesh(new THREE.PlaneGeometry(W - .004, H - .004), mk(front(S, res))); fr.position.z = D / 2 + .0012; g.add(fr);
  const bk = new THREE.Mesh(new THREE.PlaneGeometry(W - .004, H - .004), mk(back(S, res))); bk.rotation.y = Math.PI; bk.position.z = -D / 2 - .0012; g.add(bk);
  const se = seal(S); se.rotation.y = Math.PI; se.position.set(0, H / 2 - H * .6 + .02, -D / 2 - .004); g.add(se); g.userData.seal = se;
  return g;
}

// the ascii globe
function globeTex(W) {
  const H = W / 2, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
  c.fillStyle = '#0d0b16'; c.fillRect(0, 0, W, H);
  const img = globeTex.mask, mc = document.createElement('canvas'); mc.width = 600; mc.height = 200; const mx = mc.getContext('2d'); mx.drawImage(img, 0, 0); const M = mx.getImageData(0, 0, 600, 200).data;
  const land = (lon, lat) => { const x = Math.floor((lon + 180) / 360 * 600), y = Math.floor(116.6 - lat * 1.6667); if (x < 0 || x >= 600 || y < 0 || y >= 200) return 0; return M[(y * 600 + x) * 4] / 255; };
  const COLS = 360, ROWS = 150, cw = W / COLS, ch = H / ROWS; c.font = `700 ${ch * .95}px 'JetBrains Mono', monospace`; c.textBaseline = 'top'; c.textAlign = 'center';
  const hsh = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  for (let r = 0; r < ROWS; r++) { const lat = 90 - (r + .5) / ROWS * 180, step = Math.max(1, Math.round(1 / Math.max(.08, Math.cos(lat * Math.PI / 180))));
    for (let k = 0; k < COLS; k += step) { const lon = -180 + (k + .5) / COLS * 360, l = land(lon, lat), h = hsh(k, r);
      if (l > .4) { const edge = land(lon - 1, lat) < .4 || land(lon + 1, lat) < .4 || land(lon, lat - 1.2) < .4 || land(lon, lat + 1.2) < .4; c.fillStyle = edge ? '#efeaff' : h > .7 ? '#c9bcff' : '#a594e8'; c.fillText(edge ? '+' : h > .86 ? '%' : '#', k * cw + cw / 2, r * ch); }
      else if ((k / step) % 3 === 0 && r % 2 === 0) { c.fillStyle = '#2a2444'; c.fillText('·', k * cw + cw / 2, r * ch); } } }
  // graticule
  c.strokeStyle = 'rgba(139,92,255,.22)'; c.lineWidth = Math.max(1, W / 2048); for (let lon = -180; lon <= 180; lon += 30) { const x = (lon + 180) / 360 * W; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); } for (let lat = -60; lat <= 60; lat += 30) { const y = (90 - lat) / 180 * H; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  return tex(cv);
}
const CITY = { ny: [40.7, -74], sf: [37.8, -122.4], mia: [25.8, -80.2], mex: [19.4, -99.1], sao: [-23.5, -46.6], lon: [51.5, -.1], ber: [52.5, 13.4], lag: [6.5, 3.4], nai: [-1.3, 36.8], dub: [25.2, 55.3], mum: [19.1, 72.9], sin: [1.35, 103.8], man: [14.6, 121], tok: [35.7, 139.7], syd: [-33.9, 151.2], tor: [43.7, -79.4] };
const ROUTES = [['ny', 'lon'], ['ny', 'lag'], ['mia', 'sao'], ['sf', 'tok'], ['lon', 'nai'], ['ber', 'dub'], ['dub', 'mum'], ['mum', 'sin'], ['sin', 'man'], ['tok', 'syd'], ['mex', 'mia'], ['tor', 'ber'], ['sao', 'lag'], ['sf', 'mex'], ['lon', 'mum'], ['man', 'syd']];
const ll = (lat, lon, r) => { const phi = (lon + 180) / 360 * Math.PI * 2, th = (90 - lat) / 180 * Math.PI; return new THREE.Vector3(-r * Math.cos(phi) * Math.sin(th), r * Math.cos(th), r * Math.sin(phi) * Math.sin(th)); };

// ---------------------------------------------------------------- scene
let R, scene, cam, hero, orbs = [], globe, gGroup, stars, routes = [], T0 = 0, state = 'idle', D0 = 0, raf = 0, ptr = { x: 0, y: 0, sx: 0, sy: 0 }, fitInfo = {};
const ui = () => root.querySelector('.lui'), flash = () => root.querySelector('.flash');
const ease = { out: t => 1 - Math.pow(1 - t, 3), inOut: t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, back: t => { const c1 = 1.4, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); } };
const cl = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

async function boot() {
  started = true;
  try { R = new THREE.WebGLRenderer({ canvas: root.querySelector('canvas'), antialias: true, powerPreference: 'high-performance' }); } catch (e) { return bail(); }
  if (!R.getContext()) return bail();
  R.setPixelRatio(Math.min(devicePixelRatio || 1, PHONE ? 1.75 : 2)); R.outputColorSpace = THREE.SRGBColorSpace; R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
  maxAniso = Math.min(8, R.capabilities.getMaxAnisotropy());
  scene = new THREE.Scene();
  const sky = document.createElement('canvas'); sky.width = 4; sky.height = 512; const sx = sky.getContext('2d'), sg = sx.createLinearGradient(0, 0, 0, 512);
  sg.addColorStop(0, '#06050b'); sg.addColorStop(.6, '#0b0916'); sg.addColorStop(1, '#151027'); sx.fillStyle = sg; sx.fillRect(0, 0, 4, 512); scene.background = tex(sky);
  const pm = new THREE.PMREMGenerator(R); scene.environment = pm.fromScene(new RoomEnvironment(R), .04).texture;
  cam = new THREE.PerspectiveCamera(32, 1, .1, 200);
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(-4, 6, 8); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9b74ff, 2.2); rim.position.set(5, 2, -6); scene.add(rim);
  scene.add(new THREE.AmbientLight(0x6c5aa8, .35));
  try { await document.fonts.load("700 40px 'JetBrains Mono'"); await document.fonts.load("800 40px 'JetBrains Mono'"); } catch (e) {}
  // globe
  const img = new Image(); img.src = '/assets/land.png'; try { await img.decode(); globeTex.mask = img; } catch (e) {}
  gGroup = new THREE.Group(); scene.add(gGroup);
  const GR = 16, gmap = globeTex.mask ? globeTex(PHONE ? 2048 : 4096) : null;
  // the land fades toward the limb so the edge reads as one clean ring, not packed glyphs
  const gmat = gmap ? new THREE.ShaderMaterial({ uniforms: { map: { value: gmap } },
    vertexShader: 'varying vec2 vUv; varying vec3 n; varying vec3 v; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.); n = normalize(normalMatrix * normal); v = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D map; varying vec2 vUv; varying vec3 n; varying vec3 v; void main(){ vec3 c = texture2D(map, vUv).rgb * vec3(.82, .8, .92); float f = dot(normalize(n), normalize(v)); c *= smoothstep(.12, .62, f); gl_FragColor = vec4(c, 1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}' }) : new THREE.MeshBasicMaterial({ color: 0x0d0b16 });
  globe = new THREE.Mesh(new THREE.SphereGeometry(GR, 96, 64), gmat); gGroup.add(globe);
  const rimM = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { c: { value: new THREE.Color('#b49bff') } },
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); n = normalize(normalMatrix * normal); v = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 c; varying vec3 n; varying vec3 v; void main(){ float f = 1. - abs(dot(n, v)); float a = smoothstep(.86, .985, f) * .9; gl_FragColor = vec4(c * a, a); }' });
  gGroup.add(new THREE.Mesh(new THREE.SphereGeometry(GR * 1.004, 96, 64), rimM));
  const dotM = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const k in CITY) { const d = new THREE.Mesh(new THREE.SphereGeometry(.07, 10, 8), dotM); d.position.copy(ll(CITY[k][0], CITY[k][1], GR * 1.003)); globe.add(d); }
  const envT = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 88; const x = c.getContext('2d'); x.fillStyle = '#f4f1fb'; x.fillRect(4, 4, 120, 80); x.strokeStyle = '#8b5cff'; x.lineWidth = 8; x.beginPath(); x.moveTo(8, 10); x.lineTo(64, 50); x.lineTo(120, 10); x.stroke(); x.fillStyle = '#8b5cff'; x.beginPath(); x.arc(64, 50, 13, 0, 7); x.fill(); return tex(c); })();
  ROUTES.forEach(([a, b], i) => { const A = ll(...CITY[a], 1).normalize(), B = ll(...CITY[b], 1).normalize(), ang = A.angleTo(B), pts = [];
    for (let j = 0; j <= 64; j++) { const t = j / 64, p = new THREE.Vector3().copy(A).multiplyScalar(Math.sin((1 - t) * ang) / Math.sin(ang)).add(new THREE.Vector3().copy(B).multiplyScalar(Math.sin(t * ang) / Math.sin(ang))); pts.push(p.normalize().multiplyScalar(GR * (1.004 + .12 * ang * Math.sin(Math.PI * t)))); }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x8b5cff, transparent: true, opacity: .75 })); globe.add(line);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: envT, transparent: true, depthWrite: false })); sp.scale.set(.46, .32, 1); globe.add(sp);
    routes.push({ pts, sp, sp0: (i * .37) % 1, dur: 4.5 + (i % 5) * .7 }); });
  // stars
  const N = PHONE ? 500 : 1100, pos = new Float32Array(N * 3), ph = new Float32Array(N);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - .5) * 120; pos[i * 3 + 1] = Math.random() * 50 - 8; pos[i * 3 + 2] = -30 - Math.random() * 40; ph[i] = Math.random() * 6.28; }
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sgeo.setAttribute('ph', new THREE.BufferAttribute(ph, 1));
  stars = new THREE.Points(sgeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { t: { value: 0 }, px: { value: R.getPixelRatio() } },
    vertexShader: 'attribute float ph; uniform float t; uniform float px; varying float a; void main(){ a = .35 + .65 * (.5 + .5 * sin(t * 1.3 + ph * 7.)); gl_PointSize = (1. + step(.92, fract(ph * 13.)) * 1.2) * px * 1.4; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'varying float a; void main(){ vec2 d = gl_PointCoord - .5; if (dot(d, d) > .25) discard; gl_FragColor = vec4(.86, .82, 1., a); }' }));
  scene.add(stars);
  // envelopes
  hero = envelope(STYLES[0], PHONE ? 1536 : 2048); scene.add(hero);
  for (let i = 1; i < 5; i++) { const e = envelope(STYLES[i], 1024); scene.add(e); orbs.push(e); }
  // ui
  root.querySelector('#lEnter').onclick = enter;
  root.querySelector('#lConnect').onclick = () => { const a = api(); if (a.pk && a.pk()) return enter(); a.connect && a.connect(); };
  const paintW = () => { const a = api(), pk = a.pk && a.pk(), b = root.querySelector('#lConnect'); b.classList.toggle('on', !!pk); b.querySelector('span').textContent = pk ? (a.short ? a.short(pk) : pk.slice(0, 4) + '…' + pk.slice(-4)) : 'connect wallet'; };
  api().onWallet && api().onWallet(paintW); paintW();
  addEventListener('resize', fit); addEventListener('pointermove', e => { ptr.x = e.clientX / innerWidth * 2 - 1; ptr.y = e.clientY / innerHeight * 2 - 1; });
  addEventListener('keydown', e => { if (html.classList.contains('landing') && state !== 'dive' && e.key === 'Enter' && !/INPUT|TEXTAREA|BUTTON/.test(document.activeElement.tagName) && !document.querySelector('.sheet[style*="grid"], .sheet.on')) enter(); });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && html.classList.contains('landing')) loop(); });
  start();
}
function bail() { html.classList.remove('landing'); root.remove(); window.zendLand = null; }
function start() { ui().style.visibility = ''; state = 'intro'; T0 = performance.now(); cam.fov = 32; fit(); root.classList.remove('ready'); setTimeout(() => root.classList.add('ready'), RM ? 0 : 900); cancelAnimationFrame(raf); loop(); }
function fit() { if (!R) return; const w = innerWidth, h = innerHeight; R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  const D = 10, visH = 2 * D * Math.tan(THREE.MathUtils.degToRad(16)), visW = visH * cam.aspect, port = cam.aspect < 1;
  const hw = Math.min(visW * (port ? .64 : .29), visH * .36 * 1.5455), s = hw / 3.4;
  fitInfo = { s, port, visW, visH, hy: port ? .25 : .62, rx: port ? visW * .5 : Math.min(visW * .27, 4.2), gz: -14 };
  { const half = (10 - fitInfo.gz) * Math.tan(THREE.MathUtils.degToRad(16)); fitInfo.gr = port ? Math.min(half * cam.aspect * .95, half * .55) : Math.min(half * .68, half * cam.aspect * .42); fitInfo.gy = port ? fitInfo.hy * .9 : fitInfo.hy * .55 - .1; }
  gGroup.position.set(0, fitInfo.gy, fitInfo.gz); gGroup.scale.setScalar(fitInfo.gr / 16);
  // put the buttons just under the hero envelope
  cam.position.set(0, .25, 10); cam.lookAt(0, .1, 0); cam.updateMatrixWorld();
  const bottom = new THREE.Vector3(0, fitInfo.hy - 1.1 * s, 0).project(cam), y = (1 - bottom.y) / 2 * h; ui().style.top = Math.round(y + (port ? 34 : 44)) + 'px'; }
function loop() { cancelAnimationFrame(raf); const f = now => { if (!html.classList.contains('landing') || document.hidden) return; raf = requestAnimationFrame(f); frame(now); }; raf = requestAnimationFrame(f); }
function frame(now) {
  const t = (now - T0) / 1000, tt = RM ? 0 : now / 1000, { s, hy, rx, port } = fitInfo;
  ptr.sx += (ptr.x - ptr.sx) * .06; ptr.sy += (ptr.y - ptr.sy) * .06;
  stars.material.uniforms.t.value = tt; gGroup.rotation.set(.2, tt * .06 + 1.1, .1);
  routes.forEach(r => { const k = ((tt / r.dur + r.sp0) % 1), j = k * 64, a = Math.floor(j), p = r.pts[a].clone().lerp(r.pts[Math.min(64, a + 1)], j - a); r.sp.position.copy(p); r.sp.material.opacity = Math.sin(Math.PI * k); });
  // hero: drop in, float, a slow flip that shows the seal now and then
  const di = RM ? 1 : cl((t - .1) / 1.15), e = ease.back(di);
  let flip = 0; if (!RM && state !== 'dive') { const ph = (t - 4) % 12; if (t > 4) flip = ph < 6 ? 0 : ph < 7.4 ? ease.inOut((ph - 6) / 1.4) * Math.PI : ph < 10.4 ? Math.PI : Math.PI + ease.inOut(cl((ph - 10.4) / 1.4)) * Math.PI; }
  hero.scale.setScalar(s); hero.position.set(0, hy + (1 - e) * 6 + Math.sin(tt * 1.1) * .06 * s, 0);
  if (state !== 'dive') hero.rotation.set(-.9 * (1 - e) + ptr.sy * .12 + .05, flip + ptr.sx * .32 + Math.sin(tt * .5) * .1, Math.sin(tt * .7) * .025 - (1 - e) * .3);
  orbs.forEach((o, i) => { const ap = RM ? 1 : ease.out(cl((t - .55 - i * .12) / .9)), th = tt * .2 + i * Math.PI / 2, out = state === 'dive' ? 1 + ease.inOut(cl((now - D0) / 900)) * 3 : 1;
    o.scale.setScalar(s * (port ? .5 : .5) * ap); if (port) o.position.set(Math.cos(th) * rx * out, hy + s * (.75 + Math.sin(th) * 1.3) * out, -2.4 - Math.abs(Math.sin(th * .5 + i)) * .6); else o.position.set(Math.cos(th) * rx * out, hy + Math.sin(th * 2 + i) * .3 * s + (i % 2 ? .55 : -.4) * s, -2.7 + Math.sin(th) * 1.05);
    o.rotation.set(.12 + Math.sin(tt * .6 + i) * .1, -Math.cos(th) * .7 + Math.sin(tt * .3 + i) * .2, Math.sin(tt * .4 + i * 2) * .12); });
  // camera: slight parallax, or the dive through the seal
  if (state === 'dive') { const d = (now - D0) / 1000, a = ease.inOut(cl(d / .5)), b = ease.inOut(cl((d - .35) / .95));
    hero.rotation.set(D0r.x * (1 - a), D0r.y + (D0t - D0r.y) * a, D0r.z * (1 - a));
    const sw = new THREE.Vector3(); hero.userData.seal.getWorldPosition(sw); cam.position.set(sw.x * b, .25 + (sw.y - .25) * b, 10 - (10 - (sw.z - .25)) * b); cam.fov = 32 - 14 * b; cam.updateProjectionMatrix(); cam.lookAt(0 + sw.x * b, .1 + (sw.y - .1) * b, sw.z - 1);
    if (d > .95 && !root.classList.contains('out')) { flash().classList.add('go'); root.classList.add('out'); setTimeout(done, 520); } }
  else { cam.position.set(ptr.sx * .35, .25 - ptr.sy * .18, 10); cam.lookAt(0, .1, 0); }
  R.render(scene, cam);
}
let D0r = { x: 0, y: 0, z: 0 }, D0t = Math.PI;
function enter() { if (state === 'dive') return; if (!R || RM) { root.classList.add('out'); setTimeout(done, 380); return; }
  state = 'dive'; D0 = performance.now(); root.classList.add('diving'); ui().style.visibility = 'hidden'; D0r = { x: hero.rotation.x, y: hero.rotation.y, z: hero.rotation.z }; D0t = Math.PI + 2 * Math.PI * Math.round((D0r.y - Math.PI) / (2 * Math.PI)); }
function done() { html.classList.remove('landing'); root.classList.remove('out', 'diving', 'ready'); flash().classList.remove('go'); state = 'idle'; cancelAnimationFrame(raf); cam.position.set(0, .25, 10); cam.fov = 32; cam.updateProjectionMatrix(); dispatchEvent(new Event('zend:entered')); }

if (html.classList.contains('landing')) boot();
