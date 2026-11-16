/* ZEND: the privacy payment layer for Solana. */
(() => {
'use strict';
const W3 = window.solanaWeb3, $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches, PHONE = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const TOKEN_PROG = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', ATA_PROG = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const LINK_MIN = 0.002, FEE = 5000, Buf = W3.PublicKey.default.toBuffer().constructor;
const conn = new W3.Connection(location.origin + '/api/z?op=rpc', { commitment: 'confirmed', disableRetryOnRateLimit: true });
const short = a => a ? a.slice(0, 4) + '…' + a.slice(-4) : '';
const fmt = (n, d = 4) => n == null || isNaN(n) ? '—' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d });
const usd = n => n == null || isNaN(n) ? '' : '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const isAddr = a => { try { return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a) && !!new W3.PublicKey(a); } catch (e) { return false; } };
const b64u = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tx$ = s => `https://solscan.io/tx/${s}`, ac$ = a => `https://solscan.io/account/${a}`;
let toastT; const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); };
const api = async (op, body, q = '') => { const r = await fetch(`/api/z?op=${op}${q}`, body ? { method: 'POST', headers: { 'content-type': 'text/plain' }, body: JSON.stringify(body) } : { cache: 'no-store' }); const j = await r.json().catch(() => ({ error: 'no answer' })); if (!r.ok || j.error) throw new Error(j.error || 'request failed'); return j; };
const errText = e => { const m = String((e && e.message) || e || ''); if (/reject|cancel|denied|User/i.test(m)) return 'cancelled in your wallet'; if (/insufficient|0x1\b|lamports/i.test(m)) return 'not enough SOL for this plus fees'; return m.slice(0, 160) || 'something went wrong'; };
const NET = { sol: null };

// ---------- loggers: terminal-style output into any element (optionally mirrored to the hero terminal)
function logger(el, mirror) { return (html, cls = '') => { for (const t of [el, mirror].filter(Boolean)) { if (t.dataset.fresh !== '1') { t.innerHTML = ''; t.dataset.fresh = '1'; } const d = document.createElement('div'); d.className = cls; d.innerHTML = html; t.appendChild(d); if (t.id === 'log' && !dockUser) dockSet(false); t.scrollTop = t.scrollHeight; } }; }
const heroLog = $('#log');

// =================================================================== the terminal: modules instead of a scrolling page
const MODS = ['home', 'send', 'request', 'batch', 'link', 'claim', 'trace', 'wallet', 'inspect', 'route', 'live', 'zends', 'vs', 'man'];
let dockUser = false; const dockSet = min => { const d = $('#dock'); if (!d) return; d.classList.toggle('min', min); const t = $('#dockT'); if (t) t.textContent = min ? '▴' : '▾'; };
function show(m, opts = {}) { if (!MODS.includes(m)) return; const el = $('#' + m); if (!el) return;
  if (!dockUser) dockSet(!$('#log').children.length);
  $$('.mod').forEach(x => x.classList.toggle('on', x === el)); $$('#rail button').forEach(b => b.classList.toggle('on', b.dataset.m === m));
  $('#main').scrollTop = 0; $('#mPath').innerHTML = m === 'home' ? 'zend:~' : `zend:~/<b>${m === 'inspect' ? 'tx' : m}</b>`; if (m === 'live') { try { curve.auto(); } catch (e) {} } const h = el.querySelector('.h2'); if (h && !RM) { h._dec = 0; typeof decode === 'function' && decode(h); }
  if (!opts.keepHash && !/[#&](c|r)=/.test(location.hash)) { try { history.replaceState(null, '', m === 'home' ? location.pathname + location.search : '#' + m); } catch (e) {} }
  const rb = $(`#rail button[data-m="${m}"]`), rail = $('#rail'); if (rb && rail.scrollWidth > rail.clientWidth) rail.scrollTo({ left: rb.offsetLeft - (rail.clientWidth - rb.offsetWidth) / 2, behavior: 'smooth' });
  if (opts.focus) { const f = el.querySelector('input:not([hidden])'); f && f.focus({ preventScroll: true }); } }
document.addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) { e.preventDefault(); show(b.dataset.m, { focus: !!b.closest('.quick') }); } });

// =================================================================== intro (no words): an envelope is drawn, sealed, sent across the world; the world folds into the seal; dive
const intro = (() => {
  const root = document.documentElement; if (!root.classList.contains('intro')) return { done: Promise.resolve() };
  let finish; const done = new Promise(r => finish = r);
  const cv = $('#introC'), x = cv.getContext('2d'); let W, H, dpr, F, cw, ch, COLS, ROWS, L = null, T0 = 0, ended = false;
  const INK = '#151513', VIO = '#7a3cff', MAP = '#aaa4bd', MAP2 = '#bdb7cf';
  const ENV = ['+-----------------------+', '|\\                     /|', '| \\                   / |', '|  \\                 /  |', '|   \\               /   |', '|    \\             /    |', '|     \\           /     |', '|      \\         /      |', '|       \\_______/       |', '|                       |', '+-----------------------+'];
  const EC = 25, ER = ENV.length, ORDER = []; ENV.forEach((l, r) => l.split('').forEach((c, k) => { if (c === ' ') return; let key; if (r === 0) key = k / 24 * .25; else if (k === 24) key = .25 + r / 10 * .25; else if (r === ER - 1) key = .5 + (24 - k) / 24 * .25; else if (k === 0) key = .75 + (10 - r) / 10 * .25; else key = 1 + r / 8 * .9; ORDER.push([r, k, c, key / 1.95]); }));
  const fit = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); F = W < 700 ? 8 : 11; cw = F * .6; ch = F * 1.18; COLS = Math.ceil(W / cw); ROWS = Math.ceil(H / ch); };
  fit();
  const img = new Image(); img.src = '/assets/land.png';
  const box = () => { const mw = Math.max(W, H * 2.4), mh = mw / 3, lon0 = W < 700 ? -50 : 0; return { mw, mh, ox: (W - mw) / 2 - lon0 / 360 * mw, oy: (H - mh) / 2 }; };
  const P = (lon, lat) => { const b = box(); return [b.ox + (lon + 180) / 360 * b.mw, b.oy + .583 * b.mh - lat / 360 * b.mw]; };
  const build = () => { const b = box(), c = document.createElement('canvas'); c.width = COLS; c.height = ROWS; const cx = c.getContext('2d'); cx.drawImage(img, b.ox / cw, b.oy / ch, b.mw / cw, b.mh / ch); const D = cx.getImageData(0, 0, COLS, ROWS).data; L = []; for (let r = 0; r < ROWS; r++) for (let k = 0; k < COLS; k++) if (D[(r * COLS + k) * 4] > 120) L.push([k, r, hash(k, r)]); };
  const CITY = { ny: [-74, 40.7], sf: [-122.4, 37.8], mia: [-80.2, 25.8], mex: [-99.1, 19.4], sao: [-46.6, -23.5], lon: [-0.1, 51.5], lag: [3.4, 6.5], nai: [36.8, -1.3], dub: [55.3, 25.3], mum: [72.9, 19.1], del: [77.2, 28.6], dha: [90.4, 23.8], man: [121, 14.6], tok: [139.7, 35.7], syd: [151.2, -33.9], jnb: [28, -26.2] };
  const ROUTES = [['ny', 'mum'], ['sf', 'man'], ['lon', 'lag'], ['mia', 'sao'], ['dub', 'dha'], ['ny', 'lon'], ['mex', 'mia'], ['lon', 'nai'], ['mum', 'syd'], ['sf', 'tok'], ['jnb', 'dub'], ['sao', 'lag'], ['del', 'man'], ['ny', 'mex'], ['tok', 'syd'], ['lag', 'mum']].map((r, i) => ({ a: r[0], b: r[1], t0: 2.9 + i * .13 + (i ? .25 : 0), dur: 1.35 + hash(i, 4) * .6, k: .16 + hash(i, 9) * .16 }));
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2, eo = t => 1 - Math.pow(1 - t, 3);
  const qp = (a, b, k, t) => { const [x1, y1] = a, [x2, y2] = b, d = Math.hypot(x2 - x1, y2 - y1), cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 - d * k; return [(1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2, (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2]; };
  const font = (sz, w = 800) => `${w} ${sz}px 'JetBrains Mono', monospace`;
  function envelope(cx, cy, s, reveal, sealT) {   // s = scale (1 = full), reveal 0..1 (draw order), sealT 0..1 (stamp)
    const Fe = Math.min(W * .62, 760) / (EC * .6) * s, ew = EC * Fe * .6, eh = ER * Fe * 1.06, ox = cx - ew / 2, oy = cy - eh / 2;
    if (reveal >= 1) { x.fillStyle = '#fff'; x.fillRect(ox - Fe * .4, oy - Fe * .3, ew + Fe * .8, eh + Fe * .6); }
    x.font = font(Fe); x.textBaseline = 'top';
    for (const [r, k, c, key] of ORDER) { if (key > reveal) continue; const head = reveal < 1 && reveal - key < .03; x.fillStyle = head ? VIO : INK; x.fillText(head ? '█' : c, ox + k * Fe * .6, oy + r * Fe * 1.06); }
    const sx = cx, sy = oy + 8.6 * Fe * 1.06;
    if (sealT > 0) { const k = sealT < 1 ? 1 + (1 - eo(sealT)) * 1.6 : 1, R = Fe * 1.55 * k; x.globalAlpha = Math.min(1, sealT * 2); x.fillStyle = VIO; x.beginPath(); for (let q = 0; q < 26; q++) { const an = q / 26 * Math.PI * 2, rr = R * (q % 2 ? 1.06 : .97); q ? x.lineTo(sx + Math.cos(an) * rr, sy + Math.sin(an) * rr) : x.moveTo(sx + Math.cos(an) * rr, sy + Math.sin(an) * rr); } x.closePath(); x.fill();
      x.fillStyle = '#fff'; x.font = font(R * 1.05); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Z', sx, sy + R * .04); x.textAlign = 'left'; x.textBaseline = 'top'; x.globalAlpha = 1; }
    return [sx, sy];
  }
  function ring(cx, cy, r, alpha, glyph = ':', n = 48, sq = .62) { x.globalAlpha = Math.max(0, alpha); x.fillStyle = VIO; x.font = font(F * 1.2); for (let q = 0; q < n; q++) { const an = q / n * Math.PI * 2; x.fillText(glyph, cx + Math.cos(an) * r, cy + Math.sin(an) * r * sq); } x.globalAlpha = 1; }
  function map(t, origin, vortex) {   // radial decode from origin; vortex pulls everything into the middle
    if (!L) return; const [ox, oy] = origin, Rr = Math.max(0, (t - 1.85) / 1.5) * Math.hypot(W, H) * 1.1, cx = W / 2, cy = H / 2; x.font = font(F, 700);
    for (const [k, r, h] of L) { let px = k * cw, py = r * ch; const dd = Math.hypot(px - ox, (py - oy) * 1.4) + h * 30; if (dd > Rr) continue; const fresh = Rr - dd < 50 && t < 3.6;
      if (vortex > 0) { const dx = px - cx, dy = py - cy, d = Math.hypot(dx, dy), an = Math.atan2(dy, dx) + vortex * (2.2 - d / Math.hypot(W, H) * 1.6), rr = d * Math.pow(1 - vortex, 1.6); px = cx + Math.cos(an) * rr; py = cy + Math.sin(an) * rr; x.globalAlpha = 1 - vortex * .6; }
      x.fillStyle = fresh ? VIO : vortex > .2 ? VIO : h > .85 ? MAP2 : MAP; x.fillText(fresh ? '#%@&*/'[(k * 7 + r + (t * 40 | 0)) % 6] : h > .86 ? '%' : '#', px, py); }
    x.globalAlpha = 1;
  }
  function flights(t, vortex) {
    for (const f of ROUTES) { const p = clamp((t - f.t0) / f.dur, 0, 1.5); if (p <= 0) continue; const a = P(...CITY[f.a]), b = P(...CITY[f.b]), head = Math.min(1, p), tail = Math.max(0, head - .5), n = 70;
      x.globalAlpha = 1 - vortex; const F2 = F * 1.3, c2 = cw * 1.3; x.font = font(F2);
      for (let j = Math.floor(tail * n); j <= head * n; j++) { const tt = j / n, [px, py] = qp(a, b, f.k, tt), kk = (tt - tail) / Math.max(.001, head - tail); x.fillStyle = kk > .92 && p < 1 ? INK : kk > .6 ? VIO : '#c4b4fa'; x.fillText(kk > .92 && p < 1 ? '█' : kk > .6 ? '=' : '-', px, py); }
      if (p < 1) { const [hx, hy] = qp(a, b, f.k, head); x.fillStyle = '#fff'; x.fillRect(hx - c2 * 2, hy - 2, c2 * 4.4, ch * 1.3 + 4); x.fillStyle = INK; x.fillText('[', hx - c2 * 1.4, hy); x.fillText(']', hx + c2 * 1.4, hy); x.fillStyle = VIO; x.fillText('Z', hx, hy); }
      else if (p < 1.5) ring(b[0], b[1] + ch / 2, 4 + (p - 1) * 70, (1 - (p - 1) / .5) * (1 - vortex), '·', 12, .7);
      x.fillStyle = INK; x.fillText('@', a[0] - cw / 2, a[1]); x.globalAlpha = 1; }
  }
  function frame(now) {
    if (ended) return; const t = (now - T0) / 1000; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
    const ny = P(...CITY.ny), shake = t > 1.35 && t < 1.6 ? (1 - (t - 1.35) / .25) * 7 : 0; if (shake) x.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    // 1-2: draw and seal the envelope
    if (t < 1.9) { envelope(W / 2, H / 2, 1, clamp(t / 1.25, 0, 1), clamp((t - 1.25) / .3, 0, 1)); const sw = clamp((t - 1.35) / .6, 0, 1); if (sw > 0 && sw < 1) { const sy = H / 2 - (ER * Math.min(W * .62, 760) / (EC * .6) * 1.06) / 2 + 8.6 * Math.min(W * .62, 760) / (EC * .6) * 1.06; ring(W / 2, sy, 40 + sw * W * .5, 1 - sw); ring(W / 2, sy, 20 + sw * W * .32, (1 - sw) * .7, '·'); } }
    // 3: pull back; the envelope flies to New York while the world decodes around it
    else if (t < 3.2) { const k = ease(clamp((t - 1.9) / 1.1, 0, 1)), cx = W / 2 + (ny[0] - W / 2) * k, cy = H / 2 + (ny[1] - H / 2) * k; map(t, [cx, cy], 0); envelope(cx, cy, 1 - k * .93, 1, 1); }
    // 4: zends cross every border
    else if (t < 5.7) { map(t, ny, 0); flights(t, 0); }
    // 5: the world folds into the seal
    else if (t < 6.7) { const v = ease(clamp((t - 5.7) / 1, 0, 1)); map(t, ny, v); flights(t, v); const R = v * Math.min(W, H) * .16; if (R > 1) { x.fillStyle = VIO; x.beginPath(); x.arc(W / 2, H / 2, R, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = font(R * 1.05); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Z', W / 2, H / 2 + R * .04); x.textAlign = 'left'; x.textBaseline = 'top'; } }
    // 6: dive through the seal into the terminal
    else { const z = clamp((t - 6.7) / .9, 0, 1), R = Math.min(W, H) * .16 + Math.pow(z, 2.2) * Math.hypot(W, H); x.fillStyle = VIO; x.beginPath(); x.arc(W / 2, H / 2, R, 0, 7); x.fill();
      x.globalAlpha = 1 - z; x.fillStyle = '#fff'; x.font = font(Math.min(W, H) * .17 * (1 + z * 6)); x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Z', W / 2, H / 2); x.textAlign = 'left'; x.textBaseline = 'top'; x.globalAlpha = clamp((z - .5) / .5, 0, 1); x.fillStyle = '#0d0c12'; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
      if (z >= 1) return end(); }
    requestAnimationFrame(frame);
  }
  function end() { if (ended) return; ended = true; try { sessionStorage.setItem('zend:intro', '1'); } catch (e) {} const v = $('#introV'); v.style.transition = 'opacity .35s'; v.style.opacity = '0'; setTimeout(() => { root.classList.remove('intro'); v.remove(); }, 360); finish(); }
  $('#skip').onclick = end; $('#introV').addEventListener('pointerdown', e => { if (e.target.id !== 'skip') end(); });
  addEventListener('keydown', e => { if (!ended && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) end(); });
  addEventListener('resize', () => { if (!ended) { fit(); if (img.naturalWidth) build(); } });
  const go = () => { if (img.naturalWidth) build(); T0 = performance.now(); requestAnimationFrame(frame); };
  (img.complete ? Promise.resolve() : img.decode().catch(() => {})).then(() => document.fonts && document.fonts.ready).then(go, go);
  setTimeout(end, 11000);   // backstop
  return { done };
})();

// =================================================================== wallets
const WAL = { prov: null, id: null, pk: null };
const WALLETS = [
  { id: 'phantom', name: 'Phantom', get: () => window.phantom && window.phantom.solana && window.phantom.solana.isPhantom ? window.phantom.solana : null, web: 'https://phantom.app/download', deep: u => `https://phantom.app/ul/browse/${encodeURIComponent(u)}?ref=${encodeURIComponent(location.origin)}` },
  { id: 'solflare', name: 'Solflare', get: () => window.solflare && window.solflare.isSolflare ? window.solflare : null, web: 'https://solflare.com/download', deep: u => `https://solflare.com/ul/v1/browse/${encodeURIComponent(u)}?ref=${encodeURIComponent(location.origin)}` },
  { id: 'backpack', name: 'Backpack', get: () => (window.backpack && (window.backpack.solana || (window.backpack.isBackpack && window.backpack))) || null, web: 'https://backpack.app/download' },
  { id: 'injected', name: 'Browser wallet', get: () => window.solana && !window.solana.isPhantom ? window.solana : null }
];
const onWallet = [];
function setWallet(prov, id) {
  WAL.prov = prov; WAL.id = id; WAL.pk = prov && prov.publicKey ? prov.publicKey.toString() : null;
  $('#walLabel').textContent = WAL.pk ? short(WAL.pk) : 'connect'; $('#connect').classList.toggle('on', !!WAL.pk);
  if (WAL.pk) { try { localStorage.setItem('zend:w', id); } catch (e) {} if (prov.on && !prov._zend) { prov._zend = 1; try { prov.on('accountChanged', pk => { if (pk) { WAL.pk = pk.toString(); $('#walLabel').textContent = short(WAL.pk); onWallet.forEach(f => f()); } else setWallet(null); }); } catch (e) {} } }
  onWallet.forEach(f => f());
}
async function connectWith(w) { const p = w.get(); if (!p) return false; closeSheet(); try { await p.connect(); setWallet(p, w.id); toast('connected ' + short(WAL.pk)); return true; } catch (e) { toast('connection cancelled'); return false; } }
function openSheet() {
  const o = $('#opts'); o.innerHTML = ''; $('#sheetH').textContent = WAL.pk ? 'wallet' : 'connect a wallet';
  if (WAL.pk) { o.innerHTML = `<div class="msg">${WAL.pk}</div><button class="opt" id="wCopy"><span class="lt">⧉</span>copy address</button><a class="opt" target="_blank" rel="noopener" href="${ac$(WAL.pk)}"><span class="lt">↗</span>view on solscan</a><button class="opt" id="wOff"><span class="lt">✕</span>disconnect</button>`;
    $('#wCopy').onclick = () => { navigator.clipboard.writeText(WAL.pk); toast('address copied'); closeSheet(); };
    $('#wOff').onclick = async () => { try { await WAL.prov.disconnect(); } catch (e) {} try { localStorage.removeItem('zend:w'); } catch (e) {} setWallet(null); closeSheet(); };
  } else { let any = false;
    WALLETS.forEach(w => { const p = w.get(); if (!p && w.id === 'injected') return; const b = document.createElement(p ? 'button' : 'a'); b.className = 'opt';
      b.innerHTML = `<span class="lt">${w.name[0]}</span>${w.name}<small>${p ? 'detected' : PHONE && w.deep ? 'open in app' : 'install'}</small>`;
      if (p) { any = true; b.onclick = () => connectWith(w); } else { b.href = PHONE && w.deep ? w.deep(location.href) : w.web; b.target = '_blank'; b.rel = 'noopener'; } o.appendChild(b); });
    if (!any) o.insertAdjacentHTML('afterbegin', `<div class="msg">${PHONE ? 'Open this page inside your wallet app to connect.' : 'No Solana wallet found in this browser.'}</div>`); }
  $('#sheet').classList.add('on');
}
const closeSheet = () => $('#sheet').classList.remove('on');
$('#connect').onclick = openSheet; $('#sheetX').onclick = closeSheet; $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
async function silent() { let id; try { id = localStorage.getItem('zend:w'); } catch (e) {} const w = WALLETS.find(x => x.id === id), p = w && w.get(); if (!p) return; try { await p.connect({ onlyIfTrusted: true }); if (p.publicKey) setWallet(p, w.id); } catch (e) {} }

// =================================================================== transactions
const ata = (owner, mint) => W3.PublicKey.findProgramAddressSync([new W3.PublicKey(owner).toBytes(), new W3.PublicKey(TOKEN_PROG).toBytes(), new W3.PublicKey(mint).toBytes()], new W3.PublicKey(ATA_PROG))[0];
const ixAtaIdem = (payer, owner, mint) => new W3.TransactionInstruction({ programId: new W3.PublicKey(ATA_PROG), data: Buf.from([1]), keys: [
  { pubkey: new W3.PublicKey(payer), isSigner: true, isWritable: true }, { pubkey: ata(owner, mint), isSigner: false, isWritable: true }, { pubkey: new W3.PublicKey(owner), isSigner: false, isWritable: false },
  { pubkey: new W3.PublicKey(mint), isSigner: false, isWritable: false }, { pubkey: W3.SystemProgram.programId, isSigner: false, isWritable: false }, { pubkey: new W3.PublicKey(TOKEN_PROG), isSigner: false, isWritable: false }] });
function ixTransferChecked(from, to, mint, units, dec) { const d = Buf.alloc(10); d[0] = 12; let v = BigInt(units); for (let i = 0; i < 8; i++) { d[1 + i] = Number(v & 255n); v >>= 8n; } d[9] = dec;
  return new W3.TransactionInstruction({ programId: new W3.PublicKey(TOKEN_PROG), data: d, keys: [{ pubkey: ata(from, mint), isSigner: false, isWritable: true }, { pubkey: new W3.PublicKey(mint), isSigner: false, isWritable: false }, { pubkey: ata(to, mint), isSigner: false, isWritable: true }, { pubkey: new W3.PublicKey(from), isSigner: true, isWritable: false }] }); }
async function buildPay(to, token, units) {
  const tx = new W3.Transaction(), me = WAL.pk;
  if (token === 'sol') tx.add(W3.SystemProgram.transfer({ fromPubkey: new W3.PublicKey(me), toPubkey: new W3.PublicKey(to), lamports: Number(units) }));
  else { tx.add(ixAtaIdem(me, to, USDC)); tx.add(ixTransferChecked(me, to, USDC, units, 6)); }
  const { blockhash } = await conn.getLatestBlockhash(); tx.recentBlockhash = blockhash; tx.feePayer = new W3.PublicKey(me); return tx;
}
async function walletSend(tx) { const p = WAL.prov; if (!p) throw new Error('connect a wallet first');
  if (p.signAndSendTransaction) { const r = await p.signAndSendTransaction(tx); return typeof r === 'string' ? r : r.signature; }
  const s = await p.signTransaction(tx); return await conn.sendRawTransaction(s.serialize()); }
async function confirmed(sig, secs = 90) { for (let i = 0; i < secs / 2; i++) { try { const { value } = await conn.getSignatureStatuses([sig]); const s = value && value[0]; if (s && s.err) throw new Error('the transaction failed on-chain'); if (s && /confirmed|finalized/.test(s.confirmationStatus || '')) return true; } catch (e) { if (/failed on-chain/.test(e.message)) throw e; } await sleep(2000); } throw new Error('not confirmed yet; check your wallet'); }
const units = (a, t) => BigInt(Math.round(a * (t === 'sol' ? 1e9 : 1e6)));
async function balanceOk(token, need) { try { if (token === 'sol') { const b = await conn.getBalance(new W3.PublicKey(WAL.pk)); return b / 1e9 >= need + .0001; } return true; } catch (e) { return true; } }

// a sealed route: quote -> deposit -> follow the solvers. log() prints terminal lines.
async function sealedRoute({ token, amount, recipient, log, onDone, mail, job }) {
  const js = t => job && jobs.set(job, t);
  log(`<span class="dim">></span> asking the solvers for a route…`);
  const q = await api('quote', { from: token, to: token, amount, recipient, refundTo: WAL.pk });
  log(`<span class="dim">></span> one-time address <a target="_blank" rel="noopener" href="${ac$(q.depositAddress)}">${short(q.depositAddress)}</a> · they get <b>${fmt(+q.amountOut, 6)} ${token.toUpperCase()}</b> · ~${q.timeEstimate || 20} s`);
  log(`<span class="dim">></span> sign the deposit in your wallet…`, 'warn'); js('sign in wallet');
  const sig = await walletSend(await buildPay(q.depositAddress, token, q.units));
  log(`<span class="ok">✓</span> deposit sent <a target="_blank" rel="noopener" href="${tx$(sig)}">${short(sig)}</a>`); mail && mail.set('route', .2);
  api('submit', { txHash: sig, depositAddress: q.depositAddress }).catch(() => {});
  const it = onDone ? onDone({ sig, dep: q.depositAddress }) : null; let last = '';
  for (let i = 0; i < 150; i++) { await sleep(3000); let s; try { s = await api('status', null, '&dep=' + q.depositAddress); } catch (e) { continue; }
    const lab = { PENDING_DEPOSIT: 'waiting for the deposit to land', KNOWN_DEPOSIT_TX: 'deposit seen', PROCESSING: 'solvers are routing it' }[s.status];
    if (lab && lab !== last) { last = lab; log(`<span class="dim">></span> ${lab}…`); js(s.status === 'PROCESSING' ? 'routing' : 'deposit'); if (mail && s.status === 'PROCESSING') mail.set('route', .55); }
    if (s.status === 'SUCCESS') { mail && mail.set('done'); log(`<span class="ok">✓</span> delivered${s.out[0] ? ` · receipt <a target="_blank" rel="noopener" href="${tx$(s.out[0])}">${short(s.out[0])}</a> (paid by the solvers)` : ''}`, 'ok'); return { sig, dep: q.depositAddress, out: s.out[0] || null, it }; }
    if (/REFUND|FAIL|INCOMPLETE/.test(s.status)) throw new Error(s.status === 'REFUNDED' ? 'the solvers could not fill it; refunded to your wallet' : 'the route failed; a refund goes back to your wallet'); }
  throw new Error('still routing; it will update in your zends');
}

// an ascii envelope that rides a dotted line from you to them while a zend moves
function mkMail(targets) {
  const N = 30, els = targets.filter(Boolean).map(t => { const pre = document.createElement('pre'); pre.className = 'mail'; t.appendChild(pre); return pre; });
  let stage = 'sign', p = 0, goal = 0, tick = 0;
  const draw = () => { tick++; p += (goal - p) * .12; const x = Math.round(p * (N - 5)), sealed = stage !== 'sign', blink = tick % 8 < 4;
    const env = sealed ? ['+---+', '|\\<b>Z</b>/|', '+---+'] : ['+\\ /+', blink ? '| <b>·</b> |' : '|   |', '+---+'];
    const track = Array.from({ length: N }, (_, i) => i % 2 ? ' ' : (i < x ? '<b>=</b>' : '-'));
    const row = (k, base) => { const a = base.slice(0, x), b = base.slice(x + 5); return a.join('') + env[k] + b.join(''); };
    const blank = Array(N).fill(' '), end = stage === 'done' ? ' <i>✓ them</i>' : stage === 'fail' ? ' <span class="bad">✕ refunded</span>' : ' them';
    const html = '     ' + row(0, blank) + '\n' + 'you  ' + row(1, track) + end + '\n' + '     ' + row(2, blank);
    els.forEach(e => e.innerHTML = html); };
  const iv = setInterval(() => { if (stage === 'route' && goal < .86) goal += .006; draw(); if (stage === 'done' && Math.abs(goal - p) < .002) { draw(); clearInterval(iv); } }, 70);
  draw();
  return { set(s, g) { stage = s; if (g != null) goal = g; if (s === 'done') goal = 1; if (s === 'fail') clearInterval(iv), draw(); } };
}

// =================================================================== jobs: zends in flight, shown in the side pane and the console header
const jobs = (() => { const J = new Map(); let n = 0;
  const render = () => { const el = $('#pJobs'), run = [...J.values()].filter(j => !j.end);
    if (el) el.innerHTML = J.size ? [...J.values()].slice(-5).reverse().map(j => `<div><b>${esc(j.label)}</b><span class="${j.end ? (j.ok ? 'ok' : 'bad') : 'vi'}">${esc(j.st)}</span></div>`).join('') : '<div><span>idle</span></div>';
    const d = $('#dJobs'); if (d) d.textContent = run.length ? `${run.length} running` : ''; };
  return { add(label) { const id = ++n; J.set(id, { label, st: 'starting', end: false }); render(); return id; }, set(id, st) { const j = J.get(id); if (j) { j.st = st; render(); } }, done(id, ok, st) { const j = J.get(id); if (j) { j.end = true; j.ok = ok; j.st = st || (ok ? 'done' : 'failed'); render(); setTimeout(() => { J.delete(id); render(); }, 60000); } } };
})();

// =================================================================== history (this device only)
const hist = (() => {
  const KEY = 'zend:h', load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
  const save = l => { try { localStorage.setItem(KEY, JSON.stringify(l.slice(0, 80))); } catch (e) {} };
  const add = it => { const l = load(); l.unshift(it); save(l); render(); return it; };
  const upd = (id, p) => { const l = load(), i = l.findIndex(x => x.id === id); if (i >= 0) { Object.assign(l[i], p); save(l); render(); } };
  const linkUrl = it => location.origin + '/#c=' + it.seed + (it.dep ? '&d=' + it.dep : '');
  const tag = it => ({ done: '<i class="pill ok">delivered</i>', claimed: '<i class="pill ok">claimed</i>', failed: '<i class="pill no">refunded</i>', unclaimed: '<i class="pill wait">unclaimed</i>' }[it.status] || '<i class="pill wait">on its way</i>');
  function render() { const el = $('#hist'), l = load();
    if (!l.length) { el.innerHTML = '<div class="empty">no zends yet. they show up here with their links and receipts, on this device only.</div>'; return; }
    el.innerHTML = l.map(it => { const acts = [it.mode === 'link' && it.status !== 'claimed' && it.status !== 'failed' ? `<button class="btn g sm" data-copy="${it.id}">copy link</button>` : '', it.mode === 'link' && it.status === 'unclaimed' ? `<button class="btn g sm" data-back="${it.id}">take back</button>` : '', it.out ? `<a class="btn g sm" target="_blank" rel="noopener" href="${tx$(it.out)}">receipt</a>` : it.sig ? `<a class="btn g sm" target="_blank" rel="noopener" href="${tx$(it.sig)}">your tx</a>` : ''].join('');
      return `<div class="hi"><div class="ic ${it.sealed ? 's' : ''}">${it.sealed ? 'SEAL' : it.mode === 'link' ? 'LINK' : 'OPEN'}</div><div><div class="t">${fmt(it.amount)} ${it.token.toUpperCase()} ${tag(it)}</div><div class="m">${it.mode === 'link' ? 'as a link' : 'to ' + short(it.to)} · ${new Date(it.t).toLocaleString()}</div></div><div class="a">${acts}</div></div>`; }).join('');
    $$('[data-copy]', el).forEach(b => b.onclick = () => { navigator.clipboard.writeText(linkUrl(load().find(x => x.id === b.dataset.copy))); toast('link copied. anyone with it can claim it'); });
    $$('[data-back]', el).forEach(b => b.onclick = async () => { const it = load().find(x => x.id === b.dataset.back); if (!WAL.pk) return openSheet(); b.disabled = true; b.textContent = 'taking back…';
      try { const sig = await claim.sweep(unb64u(it.seed), WAL.pk); upd(it.id, { status: 'claimed', out: sig }); toast('taken back to your wallet'); } catch (e) { toast(errText(e)); b.disabled = false; b.textContent = 'take back'; } }); }
  async function poll() { for (const it of load()) {
    if (it.sealed && it.dep && !['done', 'failed', 'claimed', 'unclaimed'].includes(it.status)) { try { const s = await api('status', null, '&dep=' + it.dep); if (s.status === 'SUCCESS') upd(it.id, { status: it.mode === 'link' ? 'unclaimed' : 'done', out: s.out[0] || it.out }); else if (/REFUND|FAIL/.test(s.status)) upd(it.id, { status: 'failed' }); } catch (e) {} }
    if (it.mode === 'link' && it.status === 'unclaimed') { try { const b = await conn.getBalance(W3.Keypair.fromSeed(unb64u(it.seed)).publicKey); if (b === 0) upd(it.id, { status: 'claimed' }); } catch (e) {} } } }
  return { add, upd, render, poll, linkUrl, load };
})();

// =================================================================== contacts (this device only) + qr
const contacts = (() => {
  const KEY = 'zend:c', load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } }, save = o => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} };
  const norm = n => String(n || '').trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 20);
  const resolve = v => { v = String(v || '').trim(); if (v.startsWith('@')) { const a = load()[norm(v)]; return a || v; } return v; };
  function add(name, addr) { const n = norm(name); if (!n) throw new Error('give the contact a name'); if (!isAddr(addr)) throw new Error('that is not a Solana address'); const o = load(); o[n] = addr; save(o); render(); return n; }
  function render() { const el = $('#kList'); if (!el) return; const o = load(), ks = Object.keys(o).sort();
    el.innerHTML = ks.length ? ks.map(k => `<div class="hi"><div class="ic">@</div><div><div class="t">@${esc(k)}</div><div class="m">${o[k]}</div></div><div class="a"><button class="btn g sm" data-z="${esc(k)}">zend</button><button class="btn g sm" data-x="${esc(k)}">remove</button></div></div>`).join('') : '<div class="empty">no contacts yet. save one, then send with <b>send 0.1 sol to @name</b>.</div>';
    $$('[data-z]', el).forEach(b => b.onclick = () => { $('#sTo').value = '@' + b.dataset.z; $('#sTo').dispatchEvent(new Event('input')); show('send'); $('#sAmt').focus({ preventScroll: true }); });
    $$('[data-x]', el).forEach(b => b.onclick = () => { const o2 = load(); delete o2[b.dataset.x]; save(o2); render(); }); }
  $('#kAdd').onclick = () => { try { const n = add($('#kName').value, $('#kAddr').value.trim()); $('#kName').value = ''; $('#kAddr').value = ''; toast('saved @' + n); } catch (e) { toast(e.message); } };
  return { load, resolve, add, render };
})();
function qrTo(cv, text) { try { const q = qrcode(0, 'M'); q.addData(text); q.make(); const n = q.getModuleCount(), sz = 4, pad = 3, w = (n + pad * 2) * sz; cv.width = w; cv.height = w; const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, w); x.fillStyle = '#151513';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) x.fillRect((c + pad) * sz, (r + pad) * sz, sz, sz); } catch (e) {} }
const qrBlock = (url, note) => `<div class="qr"><canvas data-qr="${esc(url)}"></canvas><div class="qt">${note}</div></div>`;
const paintQr = root => $$('canvas[data-qr]', root).forEach(c => { if (!c._qr) { c._qr = 1; qrTo(c, c.dataset.qr); } });

// =================================================================== 01 send
const send = (() => {
  const st = { token: 'sol', sealed: true, q: null, qid: 0, dummy: W3.Keypair.generate().publicKey.toBase58(), busy: false };
  const amt = $('#sAmt'), to = $('#sTo'), go = $('#sGo'), qEl = $('#sQuote'), out = $('#sOut');
  const amount = () => { const v = parseFloat(String(amt.value).replace(',', '.')); return isFinite(v) && v > 0 ? v : 0; };
  function paint() {
    $$('#sTok button').forEach(b => b.classList.toggle('on', b.dataset.t === st.token));
    $('#sSeal').classList.toggle('on', st.sealed); $('#sSeal').setAttribute('aria-checked', st.sealed); $('#sSealT').textContent = st.sealed ? 'solvers pay them, not your wallet' : 'a plain transfer from your wallet';
    const a = amount(), r = contacts.resolve(to.value.trim()); let label, ok = false;
    if (st.busy) label = 'zending…'; else if (!WAL.pk) { label = 'connect a wallet'; ok = true; } else if (!a) label = 'enter an amount'; else if (!isAddr(r)) label = 'add their address'; else if (r === WAL.pk) label = "that's your own wallet"; else if (st.sealed && st.q && st.q.err) label = 'no route for that amount'; else { label = `zend ${fmt(a)} ${st.token.toUpperCase()}${st.sealed ? ' sealed' : ''}`; ok = true; }
    go.textContent = label; go.disabled = !ok;
  }
  let qt; function requote() { clearTimeout(qt); st.q = null; paint(); const a = amount(); const px = st.token === 'sol' ? NET.sol : 1;
    if (!a) { qEl.innerHTML = ''; return; }
    const head = `<div><span>value</span><b>${px ? '≈ ' + usd(a * px) : '—'}</b></div>`;
    if (!st.sealed) { qEl.innerHTML = head + `<div><span>they get</span><b>${fmt(a)} ${st.token.toUpperCase()}</b></div><div><span>arrives</span><b>in seconds</b></div><div><span>network fee</span><b>~0.000005 SOL${st.token === 'usdc' ? ' (+0.002 if new account)' : ''}</b></div>`; return; }
    qEl.innerHTML = head + '<div><span class="dim">asking the solvers…</span></div>';
    qt = setTimeout(async () => { const id = ++st.qid; try { const r = contacts.resolve(to.value.trim()), q = await api('quote', { from: st.token, to: st.token, amount: a, recipient: isAddr(r) ? r : st.dummy, refundTo: WAL.pk || st.dummy, dry: true }); if (id !== st.qid) return; st.q = q;
      const fee = Math.max(0, (1 - (+q.amountOut) / a) * 100);
      qEl.innerHTML = head + `<div><span>they get</span><b>${fmt(+q.amountOut, 6)} ${st.token.toUpperCase()}</b></div><div><span>arrives</span><b>~${q.timeEstimate || 20} s</b></div><div><span>route fee</span><b>${fee.toFixed(2)}%${st.token === 'usdc' ? ' + 0.002 SOL account rent' : ''}</b></div>`;
    } catch (e) { if (id !== st.qid) return; st.q = { err: true }; qEl.innerHTML = head + `<div class="bad">${esc(errText(e))}</div>`; } paint(); }, 450); }
  $$('#sTok button').forEach(b => b.onclick = () => { st.token = b.dataset.t; requote(); });
  const tog = () => { st.sealed = !st.sealed; requote(); }; $('#sSeal').onclick = tog; $('#sSeal').onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tog(); } };
  amt.addEventListener('input', () => { amt.value = amt.value.replace(/[^0-9.,]/g, ''); requote(); }); to.addEventListener('input', requote);
  $('#sPaste').onclick = async () => { try { to.value = (await navigator.clipboard.readText()).trim(); requote(); } catch (e) { to.focus(); toast('paste the address into the field'); } };
  go.onclick = () => { if (!WAL.pk) return openSheet(); run(); };
  async function run(mirror) {
    if (st.busy) return; const a = amount(), r = contacts.resolve(to.value.trim()), token = st.token, sealed = st.sealed; out.dataset.fresh = '0'; const log = logger(out, mirror);
    if (!WAL.pk) { log('connect a wallet first: type <b>connect</b> or use the button at the top', 'warn'); return openSheet(); }
    if (!a || !isAddr(r)) { log(String(to.value).trim().startsWith('@') ? 'no contact by that name' : 'need an amount and a Solana address', 'bad'); return; }
    if (!(await balanceOk(token, a))) { log('not enough SOL in your wallet for that plus fees', 'bad'); return; }
    st.busy = true; paint(); log(`<span class="vi">zend</span> ${fmt(a)} ${token.toUpperCase()} → ${short(r)} ${sealed ? '<span class="vi">[sealed]</span>' : '[open]'}`); const mail = mkMail([out, mirror]); const job = jobs.add(`${fmt(a)} ${token.toUpperCase()} → ${short(r)}`);
    const it = { id: Date.now().toString(36), t: Date.now(), mode: 'wallet', sealed, token, amount: a, to: r, status: 'moving' };
    try {
      if (sealed) { const res = await sealedRoute({ token, amount: a, recipient: r, log, mail, job, onDone: ({ sig, dep }) => hist.add(Object.assign(it, { sig, dep })) }); hist.upd(it.id, { status: 'done', out: res.out }); }
      else { log(`<span class="dim">></span> sign in your wallet…`, 'warn'); const sig = await walletSend(await buildPay(r, token, units(a, token))); mail.set('route', .6); hist.add(Object.assign(it, { sig })); log(`<span class="dim">></span> sent <a target="_blank" rel="noopener" href="${tx$(sig)}">${short(sig)}</a>, confirming…`); await confirmed(sig); mail.set('done'); hist.upd(it.id, { status: 'done', out: sig }); log(`<span class="ok">✓</span> confirmed on Solana`, 'ok'); }
      fly($('#sendForm')); jobs.done(job, true, 'delivered');
    } catch (e) { jobs.done(job, false, /cancel/i.test(errText(e)) ? 'cancelled' : 'failed'); mail.set('fail'); log(`<span class="bad">✕ ${esc(errText(e))}</span>`); if (it.dep) hist.upd(it.id, { status: /refund/i.test(e.message) ? 'failed' : it.status }); }
    st.busy = false; paint();
  }
  onWallet.push(requote);
  return { set: (a, tok, addr, sealed) => { amt.value = String(a); st.token = tok; to.value = addr; st.sealed = sealed; requote(); }, run, requote };
})();

// =================================================================== 02 link
const link = (() => {
  const st = { sealed: false, q: null, qid: 0, dummy: W3.Keypair.generate().publicKey.toBase58(), busy: false };
  const amt = $('#lAmt'), go = $('#lGo'), qEl = $('#lQuote'), out = $('#lOut');
  const amount = () => { const v = parseFloat(String(amt.value).replace(',', '.')); return isFinite(v) && v > 0 ? v : 0; };
  function paint() { $('#lSeal').classList.toggle('on', st.sealed); $('#lSeal').setAttribute('aria-checked', st.sealed); $('#lSealT').textContent = st.sealed ? 'the link is funded by solvers, not by you' : 'you fund the link from your wallet';
    const a = amount(); let label, ok = false;
    if (st.busy) label = 'making the link…'; else if (!WAL.pk) { label = 'connect a wallet'; ok = true; } else if (!a) label = 'enter an amount'; else if (a < LINK_MIN) label = `links start at ${LINK_MIN} SOL`; else if (st.sealed && st.q && st.q.err) label = 'no route for that amount'; else { label = `make a ${fmt(a)} SOL link`; ok = true; }
    go.textContent = label; go.disabled = !ok; }
  let qt; function requote() { clearTimeout(qt); st.q = null; paint(); const a = amount(); if (!a) { qEl.innerHTML = ''; return; }
    const head = `<div><span>value</span><b>${NET.sol ? '≈ ' + usd(a * NET.sol) : '—'}</b></div>`;
    if (!st.sealed) { qEl.innerHTML = head + `<div><span>link holds</span><b>${fmt(a)} SOL</b></div><div><span>claimer gets</span><b>${fmt(a - FEE / 1e9, 6)} SOL</b></div>`; return; }
    qEl.innerHTML = head + '<div><span class="dim">asking the solvers…</span></div>';
    qt = setTimeout(async () => { const id = ++st.qid; try { const q = await api('quote', { from: 'sol', to: 'sol', amount: a, recipient: st.dummy, refundTo: WAL.pk || st.dummy, dry: true }); if (id !== st.qid) return; st.q = q;
      qEl.innerHTML = head + `<div><span>link holds</span><b>${fmt(+q.amountOut, 6)} SOL</b></div><div><span>ready in</span><b>~${q.timeEstimate || 20} s</b></div><div><span>route fee</span><b>${Math.max(0, (1 - (+q.amountOut) / a) * 100).toFixed(2)}%</b></div>`;
    } catch (e) { if (id !== st.qid) return; st.q = { err: true }; qEl.innerHTML = head + `<div class="bad">${esc(errText(e))}</div>`; } paint(); }, 450); }
  const tog = () => { st.sealed = !st.sealed; requote(); }; $('#lSeal').onclick = tog; $('#lSeal').onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tog(); } };
  amt.addEventListener('input', () => { amt.value = amt.value.replace(/[^0-9.,]/g, ''); requote(); });
  go.onclick = () => { if (!WAL.pk) return openSheet(); run(); };
  async function run(mirror) {
    if (st.busy) return; const a = amount(), sealed = st.sealed; out.dataset.fresh = '0'; const log = logger(out, mirror);
    if (!WAL.pk) { log('connect a wallet first', 'warn'); return openSheet(); }
    if (!(a >= LINK_MIN)) { log(`links start at ${LINK_MIN} SOL`, 'bad'); return; }
    if (!(await balanceOk('sol', a))) { log('not enough SOL in your wallet for that plus fees', 'bad'); return; }
    st.busy = true; paint();
    const kp = W3.Keypair.generate(), seed = b64u(kp.secretKey.slice(0, 32)), pub = kp.publicKey.toBase58();
    log(`<span class="vi">zend link</span> ${fmt(a)} SOL ${sealed ? '<span class="vi">[sealed]</span>' : '[open]'}`); const mail = mkMail([out, mirror]); const job = jobs.add(`link ${fmt(a)} SOL`); log(`<span class="dim">></span> new link key made in your browser · ${short(pub)}`);
    const it = { id: Date.now().toString(36), t: Date.now(), mode: 'link', sealed, token: 'sol', amount: a, seed, status: 'moving' };
    try {
      if (sealed) { const res = await sealedRoute({ token: 'sol', amount: a, recipient: pub, log, mail, job, onDone: ({ sig, dep }) => hist.add(Object.assign(it, { sig, dep })) }); hist.upd(it.id, { status: 'unclaimed', out: res.out }); }
      else { log(`<span class="dim">></span> sign in your wallet…`, 'warn'); const sig = await walletSend(await buildPay(pub, 'sol', units(a, 'sol'))); hist.add(Object.assign(it, { sig })); log(`<span class="dim">></span> funding <a target="_blank" rel="noopener" href="${tx$(sig)}">${short(sig)}</a>…`); mail.set('route', .6); await confirmed(sig); mail.set('done'); hist.upd(it.id, { status: 'unclaimed', out: sig }); log(`<span class="ok">✓</span> the link is funded`, 'ok'); }
      const url = hist.linkUrl({ seed }); fly($('#link .panel')); jobs.done(job, true, 'funded');
      log(`<div class="linkbox"><code>${url}</code><button class="btn v sm" data-cp>copy</button></div>`); log(qrBlock(url, 'scan to claim. anyone with this link or code can claim it, so share it like cash. take it back any time from your zends.')); [out, mirror].filter(Boolean).forEach(paintQr);
      [out, mirror].filter(Boolean).forEach(t => { const bs = t.querySelectorAll('[data-cp]'), b = bs[bs.length - 1]; if (b) b.onclick = () => { navigator.clipboard.writeText(url); toast('link copied'); }; });
    } catch (e) { jobs.done(job, false, 'failed'); mail.set('fail'); log(`<span class="bad">✕ ${esc(errText(e))}</span>`); }
    st.busy = false; paint();
  }
  onWallet.push(requote);
  return { set: (a, sealed) => { amt.value = String(a); st.sealed = sealed; requote(); }, run, requote };
})();

// =================================================================== 03 claim
const claim = (() => {
  async function sweep(seed, dest) {
    const kp = W3.Keypair.fromSeed(seed), bal = await conn.getBalance(kp.publicKey); if (bal <= FEE) throw new Error('this link is empty');
    const db = await conn.getBalance(new W3.PublicKey(dest)).catch(() => 1); if (db === 0 && bal - FEE < 890880) throw new Error('too small to open a new wallet; claim to a wallet that already has SOL');
    const tx = new W3.Transaction().add(W3.SystemProgram.transfer({ fromPubkey: kp.publicKey, toPubkey: new W3.PublicKey(dest), lamports: bal - FEE }));
    const { blockhash } = await conn.getLatestBlockhash(); tx.recentBlockhash = blockhash; tx.feePayer = kp.publicKey; tx.sign(kp);
    const sig = await conn.sendRawTransaction(tx.serialize()); await confirmed(sig); return sig;
  }
  const inp = $('#cLink'), to = $('#cTo'), go = $('#cGo'), info = $('#cInfo'), out = $('#cOut'); let cur = null, bal = 0, chk = 0;
  const parse = s => { const m = String(s).match(/[#&]c=([A-Za-z0-9_-]{43})/), d = String(s).match(/[&]d=([1-9A-HJ-NP-Za-km-z]{32,44})/); if (!m) return null; try { return { seed: unb64u(m[1]), dep: d ? d[1] : null }; } catch (e) { return null; } };
  const paint = () => { go.disabled = !(cur && bal > FEE && isAddr(to.value.trim())); };
  async function inspect() { const id = ++chk; cur = parse(inp.value.trim()); bal = 0; paint();
    if (!inp.value.trim()) { info.innerHTML = ''; return; } if (!cur) { info.innerHTML = '<div class="bad">that is not a zend link</div>'; return; }
    const pk = W3.Keypair.fromSeed(cur.seed).publicKey; info.innerHTML = `<div><span>link</span><b>${short(pk.toBase58())}</b></div><div><span class="dim">checking…</span></div>`;
    try { bal = await conn.getBalance(pk); } catch (e) { if (id === chk) info.innerHTML = '<div class="bad">could not read the link right now</div>'; return; } if (id !== chk) return;
    let state = bal > FEE ? `<div><span>holds</span><b>${fmt((bal - FEE) / 1e9, 6)} SOL${NET.sol ? ' · ' + usd((bal - FEE) / 1e9 * NET.sol) : ''}</b></div>` : '<div><span>holds</span><b>0 SOL</b></div>';
    if (bal <= FEE && cur.dep) { try { const s = await api('status', null, '&dep=' + cur.dep); if (!/SUCCESS|REFUND|FAIL/.test(s.status)) { state += '<div class="warn">still on its way through the solvers. checking again…</div>'; setTimeout(() => id === chk && inspect(), 5000); } else state += '<div class="dim">already claimed or taken back</div>'; } catch (e) {} }
    else if (bal <= FEE) state += '<div class="dim">already claimed or taken back</div>';
    info.innerHTML = `<div><span>link</span><b>${short(pk.toBase58())}</b></div>` + state; paint(); }
  inp.addEventListener('input', inspect); to.addEventListener('input', paint);
  $('#cPaste').onclick = async () => { try { inp.value = (await navigator.clipboard.readText()).trim(); inspect(); } catch (e) { inp.focus(); toast('paste the link into the field'); } };
  $('#cMe').onclick = () => { if (WAL.pk) { to.value = WAL.pk; paint(); } else openSheet(); };
  async function run(mirror) { out.dataset.fresh = '0'; const log = logger(out, mirror);
    if (!cur) { log('paste a zend link first', 'bad'); return; } const dest = to.value.trim(); if (!isAddr(dest)) { log('add the Solana address to claim to', 'bad'); return; }
    go.disabled = true; go.textContent = 'claiming…'; log(`<span class="vi">zend claim</span> → ${short(dest)}`); log(`<span class="dim">></span> the link signs its own transfer and pays the fee…`);
    try { const sig = await sweep(cur.seed, dest); log(`<span class="ok">✓</span> claimed · <a target="_blank" rel="noopener" href="${tx$(sig)}">${short(sig)}</a>`, 'ok'); toast("claimed. it's yours"); go.textContent = 'claimed'; inspect(); }
    catch (e) { log(`<span class="bad">✕ ${esc(errText(e))}</span>`); go.textContent = 'claim'; paint(); } }
  go.onclick = () => run();
  onWallet.push(() => { if (WAL.pk && !to.value) { to.value = WAL.pk; paint(); } });
  // opened from a link: fill it in and bring the claim section up first
  if (/[#&]c=/.test(location.hash)) { inp.value = location.origin + '/' + location.hash; $('#cH').innerHTML = 'someone zent you <span class="vi">something.</span>'; inspect(); show('claim', { keepHash: true }); }
  return { sweep, run, set: s => { inp.value = s; inspect(); } };
})();

// =================================================================== 05 live
const scr = (el, text) => { if (!el || el.textContent === text) return; if (RM) { el.textContent = text; return; } const G = '0123456789', T0 = performance.now();
  const f = now => { const k = clamp((now - T0) / 520, 0, 1); el.textContent = text.split('').map((ch, i) => /\d/.test(ch) && i / text.length > k ? G[Math.random() * 10 | 0] : ch).join(''); if (k < 1) requestAnimationFrame(f); else el.textContent = text; }; requestAnimationFrame(f); };
const spark = (el, arr) => { if (!el || arr.length < 2) return; const B = '▁▂▃▄▅▆▇█', mn = Math.min(...arr), mx = Math.max(...arr); el.textContent = arr.slice(-28).map(v => B[mx > mn ? Math.round((v - mn) / (mx - mn) * 7) : 3]).join(''); };
const live = (() => {
  let last = null; const H = { tps: [], sol: [] };
  async function load() { try { const n = await api('net'); last = n; if (n.sol) NET.sol = n.sol;
    if (n.tps) { H.tps.push(n.tps); spark($('#spTps'), H.tps); } if (n.q.sol) { H.sol.push(n.q.sol.out); spark($('#spSol'), H.sol); }
    if (n.q.sol) { scr($('#nSol'), fmt(n.q.sol.out, 5) + ' SOL'); $('#nSolD').textContent = `they get · ~${n.q.sol.t || 20} s · ${((1 - n.q.sol.out) * 100).toFixed(2)}%`; }
    if (n.q.usdc) { scr($('#nUsdc'), fmt(n.q.usdc.out, 3) + ' USDC'); $('#nUsdcD').textContent = `they get · ~${n.q.usdc.t || 20} s · ${((1 - n.q.usdc.out / 100) * 100).toFixed(2)}%`; }
    scr($('#nTps'), n.tps ? fmt(n.tps, 0) : '—'); scr($('#nPx'), n.sol ? usd(n.sol) : '—'); $('#nFee').textContent = n.prio != null ? `priority fee ${fmt(n.prio, 0)} µlamports` : 'priority fee —';
    $('#nAt').textContent = `updated ${new Date(n.at).toLocaleTimeString()} · solvers via NEAR Intents 1Click · Solana mainnet`; send.requote(); link.requote(); try { side.net(n); } catch (e) {}
  } catch (e) { $('#nAt').textContent = 'live data is offline right now'; } return last; }
  return { load, get: () => last };
})();

// =================================================================== 02 request
const request = (() => {
  const st = { token: 'sol' }, amt = $('#rAmt'), to = $('#rTo'), memo = $('#rFor'), go = $('#rGo'), out = $('#rOut');
  const amount = () => { const v = parseFloat(String(amt.value).replace(',', '.')); return isFinite(v) && v > 0 ? v : 0; };
  const paint = () => { $$('#rTok button').forEach(b => b.classList.toggle('on', b.dataset.t === st.token)); go.disabled = !(amount() && isAddr(contacts.resolve(to.value.trim()))); };
  $$('#rTok button').forEach(b => b.onclick = () => { st.token = b.dataset.t; paint(); });
  [amt, to, memo].forEach(e => e.addEventListener('input', () => { if (e === amt) amt.value = amt.value.replace(/[^0-9.,]/g, ''); paint(); }));
  $('#rMe').onclick = () => { if (WAL.pk) { to.value = WAL.pk; paint(); } else openSheet(); };
  const make = (a, tok, addr, m) => location.origin + '/#r=' + addr + '&a=' + a + '&t=' + tok + (m ? '&m=' + encodeURIComponent(m.slice(0, 60)) : '');
  function run(mirror) { const a = amount(), addr = contacts.resolve(to.value.trim()); out.dataset.fresh = '0'; const log = logger(out, mirror);
    if (!a || !isAddr(addr)) { log('need an amount and the address to be paid', 'bad'); return; }
    const url = make(a, st.token, addr, memo.value.trim()); log(`<span class="vi">zend request</span> ${fmt(a)} ${st.token.toUpperCase()} → ${short(addr)}${memo.value.trim() ? ' · for ' + esc(memo.value.trim()) : ''}`);
    log(`<div class="linkbox"><code>${esc(url)}</code><button class="btn v sm" data-cp>copy</button></div>`); log(qrBlock(url, 'scan to pay. they pay sealed by default, so their wallet never touches yours.'));
    [out, mirror].filter(Boolean).forEach(t => { paintQr(t); const bs = t.querySelectorAll('[data-cp]'), b = bs[bs.length - 1]; if (b) b.onclick = () => { navigator.clipboard.writeText(url); toast('request link copied'); }; }); fly($('#rMake')); }
  go.onclick = () => run();
  onWallet.push(() => { if (WAL.pk && !to.value) { to.value = WAL.pk; paint(); } });
  // opened from a request link: switch to paying it
  const h = location.hash, m = h.match(/[#&]r=([1-9A-HJ-NP-Za-km-z]{32,44})/);
  if (m) { const a = parseFloat((h.match(/[&]a=([\d.]+)/) || [])[1]), tok = ((h.match(/[&]t=(sol|usdc)/i) || [])[1] || 'sol').toLowerCase(); let why = ''; try { why = decodeURIComponent((h.match(/[&]m=([^&]*)/) || [])[1] || '').slice(0, 60); } catch (e) {}
    if (a > 0 && isAddr(m[1])) { let sealed = true; $('#rMake').hidden = true; $('#rPay').hidden = false; $('#rH').innerHTML = `${short(m[1])} asks for <span class="vi">${fmt(a)} ${tok.toUpperCase()}.</span>`; $('#rSub').textContent = 'Pay it in one tap. Sealed by default, so your wallet never touches theirs on-chain.';
      $('#rInfo').innerHTML = `<div><span>pay to</span><b><a target="_blank" rel="noopener" href="${ac$(m[1])}">${short(m[1])}</a></b></div><div><span>amount</span><b>${fmt(a)} ${tok.toUpperCase()}</b></div>${why ? `<div><span>for</span><b>${esc(why)}</b></div>` : ''}`;
      const btn = $('#rPayGo'), sw = $('#rSeal'), pp = () => { sw.classList.toggle('on', sealed); sw.setAttribute('aria-checked', sealed); btn.textContent = WAL.pk ? `pay ${fmt(a)} ${tok.toUpperCase()}${sealed ? ' sealed' : ''}` : 'connect a wallet'; };
      sw.onclick = () => { sealed = !sealed; pp(); }; sw.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); sealed = !sealed; pp(); } };
      btn.onclick = async () => { if (!WAL.pk) return openSheet(); send.set(a, tok, m[1], sealed); out.dataset.fresh = '0'; out.innerHTML = ''; await send.run(out); };
      onWallet.push(pp); pp(); out.innerHTML = '<div class="dim"># payment output appears here</div>'; show('request', { keepHash: true }); } }
  return { run, set: (a, tok, addr, m) => { amt.value = String(a); st.token = tok; if (addr) to.value = addr; memo.value = m || ''; paint(); } };
})();

// =================================================================== 05 trace: who a wallet is linked to by plain transfers
const trace = (() => {
  const inp = $('#tAddr'), go = $('#tGo'), out = $('#tOut'); let busy = false;
  const paint = () => { go.disabled = busy || !isAddr(contacts.resolve(inp.value.trim())); go.textContent = busy ? 'tracing…' : 'trace it'; };
  inp.addEventListener('input', paint); $('#tMe').onclick = () => { if (WAL.pk) { inp.value = WAL.pk; paint(); } else openSheet(); };
  onWallet.push(() => { if (WAL.pk && !inp.value) { inp.value = WAL.pk; paint(); } });
  function graph(addr, nodes) { // an ascii star: the wallet in the middle, linked addresses around it
    const Wd = 64, Hd = 19, cx = Wd / 2, cy = (Hd - 1) / 2, g = Array.from({ length: Hd }, () => Array(Wd).fill(' ')), put = (r, c, s) => { for (let i = 0; i < s.length; i++) if (g[r] && c + i >= 0 && c + i < Wd) g[r][c + i] = s[i]; };
    const n = nodes.length; nodes.forEach((nd, i) => { const an = -Math.PI / 2 + i / n * Math.PI * 2, nx = cx + Math.cos(an) * (Wd * .38), ny = cy + Math.sin(an) * (Hd * .4);
      for (let t = .16; t < .84; t += .02) { const px = Math.round(cx + (nx - cx) * t), py = Math.round(cy + (ny - cy) * t); if (g[py][px] === ' ') g[py][px] = '\u0001'; }
      put(Math.round(ny), Math.round(nx) - 4, short(nd.a).padEnd(9, ' ')); });
    put(Math.round(cy), Math.round(cx) - 5, '[ ' + short(addr).slice(0, 6) + ' ]');
    return g.map(r => r.join('').replace(/\u0001/g, '<i>·</i>').replace(/\[ (.{6}) \]/, '<b>[ $1 ]</b>')).join('\n'); }
  async function run(mirror) {
    const addr = contacts.resolve(inp.value.trim()); out.dataset.fresh = '0'; const log = logger(out, mirror); if (!isAddr(addr)) { log('that is not a Solana address', 'bad'); return; }
    busy = true; paint(); log(`<span class="vi">zend trace</span> ${short(addr)}`); log(`<span class="dim">></span> reading its last 40 transactions…`);
    try { const sigs = await conn.getSignaturesForAddress(new W3.PublicKey(addr), { limit: 40 }); if (!sigs.length) { log('no history on this address', 'dim'); return; }
      const txs = []; for (let i = 0; i < sigs.length; i += 10) { const part = await conn.getParsedTransactions(sigs.slice(i, i + 10).map(s => s.signature), { maxSupportedTransactionVersion: 0 }); txs.push(...part); }
      const M = new Map(), bump = (a, dir, sol, sig) => { if (!a || a === addr) return; const o = M.get(a) || { a, n: 0, inn: 0, out: 0, tok: 0, sig }; o.n++; if (sol != null) dir === 'in' ? o.inn += sol : o.out += sol; else o.tok++; M.set(a, o); };
      let nt = 0;
      for (const tx of txs) { if (!tx || !tx.meta || tx.meta.err) continue; const keys = tx.transaction.message.accountKeys.map(k => (k.pubkey || k).toString()), owners = {};
        [...(tx.meta.preTokenBalances || []), ...(tx.meta.postTokenBalances || [])].forEach(b => { if (b.owner) owners[keys[b.accountIndex]] = b.owner; });
        const ixs = [...tx.transaction.message.instructions, ...((tx.meta.innerInstructions || []).flatMap(i => i.instructions))], sig = tx.transaction.signatures[0];
        for (const ix of ixs) { const pz = ix.parsed; if (!pz || typeof pz !== 'object') continue; const inf = pz.info || {};
          if (ix.program === 'system' && pz.type === 'transfer') { if (inf.source === addr) { bump(inf.destination, 'out', inf.lamports / 1e9, sig); nt++; } else if (inf.destination === addr) { bump(inf.source, 'in', inf.lamports / 1e9, sig); nt++; } }
          else if (/spl-token/.test(ix.program || '') && /^transfer/.test(pz.type)) { const src = owners[inf.source] || inf.authority, dst = owners[inf.destination]; if ((src === addr || inf.authority === addr) && dst) { bump(dst, 'out', null, sig); nt++; } else if (dst === addr && src) { bump(src, 'in', null, sig); nt++; } } } }
      const list = [...M.values()].sort((a, b) => b.n - a.n);
      if (!list.length) { log(`<span class="ok">✓</span> no direct transfers in its last ${txs.length} transactions`, 'ok'); return; }
      log(`<span class="warn">!</span> linked to <b>${list.length}</b> address${list.length === 1 ? '' : 'es'} by <b>${nt}</b> direct transfer${nt === 1 ? '' : 's'} in its last ${txs.length} transactions`);
      log(`<pre class="graph">${graph(addr, list.slice(0, 8))}</pre>`);
      list.slice(0, 12).forEach(o => log(`<div class="tr"><span>${o.n}×</span><a target="_blank" rel="noopener" href="${ac$(o.a)}">${o.a}</a><span class="dim">${o.inn ? '+' + fmt(o.inn, 3) + ' SOL ' : ''}${o.out ? '−' + fmt(o.out, 3) + ' SOL ' : ''}${o.tok ? o.tok + ' token' : ''}</span></div>`));
      log(`<span class="dim">every line above is public forever. sealed zends never draw one.</span>`);
    } catch (e) { log(`<span class="bad">✕ ${esc(errText(e))}</span>`); }
    finally { busy = false; paint(); }
  }
  go.onclick = () => run();
  return { run, set: a => { inp.value = a; paint(); } };
})();

// =================================================================== the command line
const cli = (() => {
  const inp = $('#cli'), log = logger(heroLog); let histI = -1; const past = [];
  const out = (h, c) => log(h, c), cmdEcho = s => log(`<span class="vi">zend:~$</span> ${esc(s)}`);
  const go = id => show(id.replace('#', ''));
  const HELP = [['send 0.1 sol to &lt;address|@name&gt;', 'sealed send (add --open for a plain transfer)'], ['wallet [address]', 'holdings, priced live'], ['tx &lt;signature&gt;', 'decode any transaction'], ['status &lt;deposit address&gt;', 'follow a sealed route'], ['rates', 'sealed rate curve at 8 sizes'], ['batch', 'pay many in one go'], ['request 0.5 sol [for dinner]', 'make a request link with a QR'], ['trace [address]', 'see who a wallet is linked to'], ['add @name &lt;address&gt;', 'save a contact · contacts to list'], ['send 25 usdc to &lt;address&gt;', 'USDC works too'], ['link 0.05', 'make a payment link (add --sealed)'], ['claim &lt;link&gt;', 'claim a link to your wallet'], ['quote 1 sol', 'live sealed quote'], ['live', 'solvers, SOL price, Solana TPS'], ['zends', 'your recent zends'], ['connect · disconnect · whoami', 'wallet'], ['route · man · vs', 'jump to a section'], ['clear', 'clear the screen']];
  async function exec(raw) {
    const s = raw.trim(); if (!s) return; dockSet(false); cmdEcho(s); past.unshift(s); histI = -1; const a = s.split(/\s+/), c = a[0].toLowerCase();
    try {
      if (c === 'help' || c === '?') { HELP.forEach(([k, v]) => out(`  <span class="vi">${k.padEnd(34, ' ')}</span><span class="dim">${v}</span>`)); return; }
      if (c === 'clear') { heroLog.innerHTML = ''; heroLog.dataset.fresh = '1'; return; }
      if (c === 'connect') { if (WAL.pk) return out(`already connected · ${WAL.pk}`); openSheet(); return; }
      if (c === 'disconnect') { if (!WAL.pk) return out('no wallet connected', 'dim'); try { await WAL.prov.disconnect(); } catch (e) {} setWallet(null); out('disconnected'); return; }
      if (c === 'whoami') { out(WAL.pk ? `${WAL.pk} <span class="dim">(${WAL.id})</span>` : 'not connected · type <b>connect</b>'); return; }
      if (c === 'quote') { const n = parseFloat(a[1]), t = (a[2] || 'sol').toLowerCase(); if (!(n > 0) || !/^(sol|usdc)$/.test(t)) return out('usage: quote 1 sol', 'bad');
        out('<span class="dim">></span> asking the solvers…'); const q = await api('quote', { from: t, to: t, amount: n, recipient: W3.Keypair.generate().publicKey.toBase58(), refundTo: WAL.pk || W3.Keypair.generate().publicKey.toBase58(), dry: true });
        out(`  sealed ${fmt(n)} ${t.toUpperCase()} → they get <b>${fmt(+q.amountOut, 6)} ${t.toUpperCase()}</b> · ~${q.timeEstimate || 20} s · fee ${Math.max(0, (1 - (+q.amountOut) / n) * 100).toFixed(2)}%`, 'ok'); return; }
      if (c === 'request' && a.length > 1) { const m = s.match(/^request\s+([\d.,]+)\s*(sol|usdc)?(?:\s+for\s+(.+))?$/i); if (!m) return out('usage: request 0.5 sol [for dinner]', 'bad'); if (!WAL.pk && !$('#rTo').value) return out('connect a wallet first, so the request pays you', 'warn'), openSheet(); request.set(m[1].replace(',', '.'), (m[2] || 'sol').toLowerCase(), WAL.pk || null, m[3] || ''); request.run(heroLog); return; }
      if (c === 'wallet' || c === 'portfolio' || c === 'balance') { const t = a[1] ? contacts.resolve(a[1]) : WAL.pk; if (!t) return out('usage: wallet &lt;address&gt; (or connect a wallet)', 'bad'); wallet.set(t); show('wallet'); await wallet.run(heroLog); return; }
      if (c === 'tx') { if (!a[1]) return out('usage: tx &lt;signature&gt;', 'bad'); inspect.set(a[1]); show('inspect'); await inspect.run(heroLog); return; }
      if (c === 'status') { if (!a[1] || !isAddr(a[1])) return out('usage: status &lt;deposit address&gt;', 'bad'); const st = await api('status', null, '&dep=' + a[1]); out(`  ${st.status.toLowerCase().replace(/_/g, ' ')}${st.out[0] ? ` · receipt <a target="_blank" rel="noopener" href="${tx$(st.out[0])}">${short(st.out[0])}</a>` : ''}`, st.status === 'SUCCESS' ? 'ok' : ''); return; }
      if (c === 'rates') { show('live'); out('<span class="dim">></span> rate curve loading in the live module'); curve.load(); return; }
      if (c === 'jobs') { const t = $('#pJobs').innerText.trim(); out(t || 'idle'); return; }
      if (c === 'trace') { const t = a[1] || WAL.pk; if (!t) return out('usage: trace &lt;address&gt; (or connect a wallet)', 'bad'); trace.set(t); await trace.run(heroLog); return; }
      if (c === 'add') { const m = s.match(/^add\s+@?([\w.-]{1,20})\s+([1-9A-HJ-NP-Za-km-z]{32,44})$/i); if (!m) return out('usage: add @name &lt;address&gt;', 'bad'); out(`<span class="ok">✓</span> saved @${contacts.add(m[1], m[2])}`); return; }
      if (c === 'contacts') { const o = contacts.load(), ks = Object.keys(o); if (!ks.length) return out('no contacts yet · add @name &lt;address&gt;', 'dim'); ks.forEach(k => out(`  @${esc(k).padEnd(14, ' ')} ${o[k]}`)); return; }
      if (c === 'send' && a.length > 1) { const m = s.match(/^send\s+([\d.,]+)\s*(sol|usdc)?\s+(?:to\s+)?(@[\w.-]{1,20}|[1-9A-HJ-NP-Za-km-z]{32,44})(\s+--open)?\s*$/i);
        if (!m) return out('usage: send 0.1 sol to &lt;address&gt; [--open]', 'bad'); send.set(m[1].replace(',', '.'), (m[2] || 'sol').toLowerCase(), m[3], !m[4]); await send.run(heroLog); return; }
      if (c === 'link' && a.length > 1) { const n = parseFloat((a[1] || '').replace(',', '.')); if (!(n > 0)) return out('usage: link 0.05 [--sealed]', 'bad'); link.set(n, /--sealed/.test(s)); await link.run(heroLog); return; }
      if (c === 'claim' && a.length > 1) { claim.set(a[1]); out('<span class="dim">></span> link loaded in the claim panel'); go('#claim'); return; }
      if (c === 'live') { out('<span class="dim">></span> reading…'); const n = await live.load(); if (!n) return out('live data is offline', 'bad');
        out(`  sealed 1 SOL   → ${n.q.sol ? fmt(n.q.sol.out, 5) + ' SOL · ~' + (n.q.sol.t || 20) + ' s' : '—'}`); out(`  sealed 100 USDC → ${n.q.usdc ? fmt(n.q.usdc.out, 3) + ' USDC · ~' + (n.q.usdc.t || 20) + ' s' : '—'}`);
        out(`  SOL ${n.sol ? usd(n.sol) : '—'} · solana ${n.tps ? fmt(n.tps, 0) + ' tps' : '—'}`); return; }
      if (c === 'zends' || c === 'history') { const l = hist.load().slice(0, 6); if (!l.length) out('no zends yet', 'dim'); l.forEach(it => out(`  ${new Date(it.t).toLocaleDateString()}  ${(fmt(it.amount) + ' ' + it.token.toUpperCase()).padEnd(14, ' ')} ${it.mode === 'link' ? 'link' : '→ ' + short(it.to)}  <span class="dim">${it.sealed ? 'sealed' : 'open'} · ${it.status}</span>`)); if (a[1] !== '-q') go('#zends'); return; }
      const sec = { home: '#home', batch: '#batch', send: '#send', request: '#request', link: '#link', claim: '#claim', trace: '#trace', route: '#route', how: '#route', live: '#live', man: '#man', vs: '#vs', zelle: '#vs', faq: '#man' }[c]; if (sec) { go(sec); return; }
      out(`command not found: ${esc(c)} · type <b>help</b>`, 'bad');
    } catch (e) { out(`✕ ${esc(errText(e))}`, 'bad'); }
  }
  try { past.push(...JSON.parse(localStorage.getItem('zend:cli') || '[]')); } catch (e) {}
  const remember = () => { try { localStorage.setItem('zend:cli', JSON.stringify(past.slice(0, 50))); } catch (e) {} };
  const CMDS = ['help', 'send', 'request', 'batch', 'link', 'claim', 'trace', 'wallet', 'tx', 'status', 'quote', 'rates', 'live', 'zends', 'jobs', 'contacts', 'add', 'connect', 'disconnect', 'whoami', 'route', 'man', 'vs', 'home', 'clear'];
  function complete() { const v = inp.value, parts = v.split(' '), last = parts[parts.length - 1];
    let pool = parts.length === 1 ? CMDS : last.startsWith('@') ? Object.keys(contacts.load()).map(k => '@' + k) : /^(s|u)/i.test(last) && parts.length > 2 ? ['sol', 'usdc'] : [];
    const hits = pool.filter(x => x.startsWith(last.toLowerCase())); if (hits.length === 1) { parts[parts.length - 1] = hits[0]; inp.value = parts.join(' ') + ' '; } else if (hits.length > 1) out('<span class="dim">' + hits.join('  ') + '</span>'); }
  inp.addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); complete(); return; } if (e.key === 'Enter') { const v = inp.value; inp.value = ''; exec(v); remember(); }
    else if (e.key === 'ArrowUp') { if (histI < past.length - 1) { histI++; inp.value = past[histI]; e.preventDefault(); } }
    else if (e.key === 'ArrowDown') { if (histI > 0) { histI--; inp.value = past[histI]; } else { histI = -1; inp.value = ''; } } });
  $$('#hints button').forEach(b => b.onclick = () => { const c = b.dataset.c; if (c === 'send') { inp.value = 'send 0.1 sol to '; inp.focus(); return; } exec(c); });
  addEventListener('keydown', e => { if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); dockSet(false); inp.focus(); } });
  $('#dockT').onclick = () => { dockUser = true; dockSet(!$('#dock').classList.contains('min')); };
  async function boot() { heroLog.dataset.fresh = '1'; await live.load(); }
  return { exec, boot };
})();

// =================================================================== the little envelope that flies off on success
function fly(from) { if (RM || !from) return; const r = from.getBoundingClientRect(), e = document.createElement('pre'); e.textContent = '+------+\n|\\(Z)/|\n+------+';
  e.style.cssText = `position:fixed;z-index:70;left:${r.left + r.width / 2 - 40}px;top:${r.top + r.height / 2}px;margin:0;font:800 14px/1.1 'JetBrains Mono',monospace;color:#b49bff;pointer-events:none;transition:transform 1.1s cubic-bezier(.5,0,.2,1),opacity 1.1s`;
  document.body.appendChild(e); requestAnimationFrame(() => { e.style.transform = `translate(${innerWidth}px,-${r.top + 200}px) rotate(-14deg)`; e.style.opacity = '0'; }); setTimeout(() => e.remove(), 1300); }

// =================================================================== route animation, reveals, nav, faq, config
(() => {
  const ns = $$('#pipe .n'), pl = $('#pline'); let on = false, t0 = 0;
  const loop = now => { if (!on) return; const T = ((now - t0) / 4200) % 1, i = Math.min(3, Math.floor(T * 4.6)); ns.forEach((n, k) => n.classList.toggle('on', k === i));
    if (pl) { const N = Math.max(30, Math.floor(pl.clientWidth / 7.3) - 2), x = Math.round(Math.min(1, T * 1.15) * (N - 5));
      const parts = []; let k = 0; for (let c = 0; c < N; c++) { if (c === x) { parts.push('[<b>Z</b>]'); c += 2; continue; } parts.push(c < x ? (c % 2 ? ' ' : '<b>=</b>') : (c % 2 ? ' ' : '-')); } pl.innerHTML = parts.join(''); }
    requestAnimationFrame(loop); };
  new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting && !RM; if (on && !was) { t0 = performance.now(); requestAnimationFrame(loop); } }).observe($('#pipe'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); if (e.target.classList.contains('h2')) decode(e.target); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
  $$('.rv').forEach(el => io.observe(el)); setTimeout(() => $$('.rv').forEach(el => el.classList.add('vis')), 5000);
  $$('.q button').forEach(b => b.onclick = () => { const q = b.parentElement, open = q.classList.contains('open'); $$('.q.open').forEach(o => o.classList.remove('open')); if (!open) q.classList.add('open'); });
})();
(async () => { try { const c = await api('cfg'); if (c.sol && !NET.sol) NET.sol = c.sol;
  if (c.ca) { $('#caSlot').innerHTML = `<span class="dim">$ZEND</span><code>${esc(c.ca)}</code><button class="btn g sm" id="caCp">copy</button><a class="btn g sm" target="_blank" rel="noopener" href="https://pump.fun/coin/${c.ca}">buy</a><a class="btn g sm" target="_blank" rel="noopener" href="https://dexscreener.com/solana/${c.ca}">chart</a>${c.x ? `<a class="btn g sm" target="_blank" rel="noopener" href="${esc(c.x)}">𝕏</a>` : ''}`; $('#caCp').onclick = () => { navigator.clipboard.writeText(c.ca); toast('address copied'); }; }
} catch (e) {} })();

// =================================================================== motion: scroll bar, wordmark, headings, the live world behind the hero
function decode(el) { if (RM || el._dec) return; el._dec = 1; const nodes = []; const walk = n => n.childNodes.forEach(c => c.nodeType === 3 ? nodes.push([c, c.textContent]) : walk(c)); walk(el);
  const total = nodes.reduce((a, [, t]) => a + t.length, 0), G = 'abcdefghijklmnopqrstuvwxyz#%/=+', T0 = performance.now();
  const f = now => { const k = clamp((now - T0) / 700, 0, 1); let seen = 0; nodes.forEach(([n, t]) => { n.textContent = t.split('').map((ch, i) => { const at = (seen + i) / total; return ch === ' ' || at < k ? ch : at < k + .25 ? G[Math.random() * G.length | 0] : ' '; }).join(''); seen += t.length; }); if (k < 1) requestAnimationFrame(f); else nodes.forEach(([n, t]) => n.textContent = t); };
  requestAnimationFrame(f); }
const wordmark = (() => { const el = $('.logo'), html = el.innerHTML, txt = el.textContent, G = '░▒▓█#%';
  const run = () => { if (RM) return; const cols = Math.max(...txt.split('\n').map(l => l.length)), T0 = performance.now(), st = []; let col = 0; for (let i = 0; i < txt.length; i++) { st.push(col / cols * 700 + Math.random() * 260); col = txt[i] === '\n' ? 0 : col + 1; }
    const f = now => { const t = now - T0; let done = true; el.textContent = txt.split('').map((ch, i) => { if (ch === ' ' || ch === '\n') return ch; if (t < st[i]) { done = false; return t < st[i] - 220 ? ' ' : G[Math.random() * 6 | 0]; } return ch; }).join(''); if (!done) requestAnimationFrame(f); else el.innerHTML = html; }; requestAnimationFrame(f); };
  const glitch = () => { if (RM || document.hidden) return; const idx = []; for (let i = 0; i < txt.length; i++) if (txt[i] === '█') idx.push(i); const pick = new Set(Array.from({ length: 9 }, () => idx[Math.random() * idx.length | 0]));
    el.textContent = txt.split('').map((ch, i) => pick.has(i) ? '▒░▓'[Math.random() * 3 | 0] : ch).join(''); setTimeout(() => { el.innerHTML = html; }, 110); };
  setInterval(glitch, 6500); return { run }; })();
(() => { // home background: a privacy server in ascii. public transfers stream in from the left, get shredded inside the sealed layer, leave as sealed packets for the solver racks, and the racks pay the recipient out the other side.
  const cv = $('#heroBg'), wrap = cv.parentElement, x = cv.getContext('2d');
  let W, H, dpr, F, cw, ch, COLS, ROWS, sm, base = null, vis = true, last = 0, mx = .5, my = .5, hole = null;
  let LX = 0, HW = 5, WL = 0, WR = 0, RK = 0, rw = 16, payW = 20, T0 = 1, T1 = 2, racks = [], lanes = [], pk = [], bits = [], pays = [], rip = [], heat = [], ports = {}, leds = {};
  const B58c = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz', rid = n => Array.from({ length: n }, () => B58c[Math.random() * 58 | 0]).join(''), HEX = '0123456789abcdef';
  const inHole = (c, r) => hole && c >= hole[0] && c <= hole[2] && r >= hole[1] && r <= hole[3];
  const fit = () => { dpr = Math.min(2, devicePixelRatio || 1); W = wrap.clientWidth; H = wrap.clientHeight; if (W < 20 || H < 20) { base = null; return; }
    cv.width = W * dpr; cv.height = H * dpr; sm = W < 700; F = sm ? 10 : 12; cw = F * .6; ch = F * 1.25; COLS = Math.ceil(W / cw); ROWS = Math.ceil(H / ch);
    // keep the words readable: measure the text itself (not the full-width boxes) and leave it clear
    const wb = wrap.getBoundingClientRect(), rs = [];
    for (const e of $$('.homeIn > *', wrap)) { if (!e.offsetHeight) continue; let rr; if (e.classList.contains('quick')) rr = [...e.children].map(k => k.getBoundingClientRect()); else { const g = document.createRange(); g.selectNodeContents(e); rr = [...g.getClientRects()]; } rr.forEach(r => r.width > 0 && rs.push(r)); }
    hole = rs.length ? [Math.floor((Math.min(...rs.map(r => r.left)) - wb.left - 16) / cw), Math.floor((Math.min(...rs.map(r => r.top)) - wb.top - 12) / ch), Math.ceil((Math.max(...rs.map(r => r.right)) - wb.left + 16) / cw), Math.ceil((Math.max(...rs.map(r => r.bottom)) - wb.top + 12) / ch)] : null;
    if (hole && hole[0] < 7) hole[0] = -1;
    // the tower sits right of the words when there is room, racks and the payout lane after it
    HW = sm ? 3 : 5; rw = sm ? 10 : 15; payW = sm ? 11 : 20;
    const want = sm ? Math.round(COLS * .5) : Math.max(Math.round(COLS * .5), hole && hole[2] < COLS * .7 ? hole[2] + HW + 3 : 0);
    LX = Math.min(want, COLS - payW - rw - 7 - HW); WL = LX - HW - 1; WR = LX + HW + 1; RK = Math.max(WR + 6, Math.min(WR + (sm ? 7 : 14), COLS - payW - rw - 1));
    payW = COLS - RK - rw - 1; T0 = 1; T1 = ROWS - 2;
    racks = []; for (let r0 = 2, j = 0; r0 + 6 < ROWS - 1; r0 += 8, j++) { if (hole && r0 + 6 >= hole[1] && r0 <= hole[3] && RK <= hole[2]) continue; racks.push({ r0, n: j + 1 }); }
    lanes = []; for (let r = 3; r < ROWS - 2; r += 3) lanes.push({ r, hid: !!(hole && r >= hole[1] && r <= hole[3] && hole[0] < 4) });
    heat = new Float32Array(ROWS);
    // static layer: dot grid, lane guides, rack frames
    base = document.createElement('canvas'); base.width = cv.width; base.height = cv.height; const b = base.getContext('2d'); b.setTransform(dpr, 0, 0, dpr, 0, 0); b.font = `700 ${F}px 'JetBrains Mono', monospace`; b.textBaseline = 'top';
    const put = (c, r, g, col) => { if (c < 0 || r < 0 || c >= COLS || r >= ROWS || inHole(c, r)) return; b.fillStyle = col; b.fillText(g, c * cw, r * ch); };
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (r % 3 === 1 && c % 8 === 4 && (c < WL - 1 || c > WR + 1)) put(c, r, '·', '#191723');
    for (const l of lanes) { for (let c = 1; c < WL; c += 3) put(c, l.r, '·', '#211f2d'); for (let c = WR + 2; c < RK - 1; c += 2) put(c, l.r, '·', '#211f2d'); }
    const L1 = '#3a3550', L2 = '#24212f';
    for (const k of racks) { const { r0 } = k, c0 = RK, w = rw, lab = sm ? ` s${String(k.n).padStart(2, '0')} ` : ` solver ${String(k.n).padStart(2, '0')} `;
      put(c0, r0, '┌', L1); put(c0 + w, r0, '┐', L1); put(c0, r0 + 6, '└', L1); put(c0 + w, r0 + 6, '┘', L1);
      for (let c = 1; c < w; c++) { put(c0 + c, r0, lab[c - 1] && c - 1 < lab.length && c < w - 1 ? lab[c - 1] : '─', c - 1 < lab.length && lab[c - 1] !== ' ' ? '#5e5878' : L1); put(c0 + c, r0 + 6, '─', L1); }
      for (let r = 1; r < 6; r++) { put(c0, r0 + r, '│', L1); put(c0 + w, r0 + r, '│', L1); if (r % 2 === 0) for (let c = 1; c < w; c++) put(c0 + c, r0 + r, '─', L2); }
      for (let c = 0; c < payW; c += 3) for (const r of [1, 3, 5]) put(RK + w + 2 + c, r0 + r, '·', '#1d1b28'); }
    const lab1 = sm ? 'public' : 'public transfers', lab2 = sm ? 'paid' : 'recipients paid';
    if (WL - 2 > lab1.length + 2) for (let i = 0; i < lab1.length; i++) put(2 + i, 1, lab1[i], '#55506b');
    if (payW >= lab2.length + 3) for (let i = 0; i < lab2.length; i++) put(RK + rw + 3 + i, 1, lab2[i], '#55506b');
    pk = []; bits = []; pays = [];
  };
  const nearestSlot = r => { let best = null, d = 1e9; for (const k of racks) for (const o of [1, 3, 5]) { const dd = Math.abs(k.r0 + o - r); if (dd < d) { d = dd; best = { k, ty: k.r0 + o }; } } return best; };
  const spawn = () => { if (!lanes.length) return; const l = lanes[Math.random() * lanes.length | 0]; if (l.hid && Math.random() < .6) return; const same = pk.filter(p => p.r0 === l.r); if (same.some(p => p.x - p.n < 6)) return; const cap = same.length ? Math.min(...same.map(p => p.v)) : 99;
    const sol = Math.random() > .38, amt = sol ? (Math.random() < .7 ? Math.random() * 3 + .05 : Math.random() * 40 + 3) : (Math.random() < .7 ? Math.random() * 180 + 5 : Math.random() * 2400 + 200), from = rid(4), to = rid(4);
    const a = amt < 10 ? amt.toFixed(2) : amt < 1000 ? amt.toFixed(1) : Math.round(amt) + '', tok = sol ? 'SOL' : 'USDC', txt = `${from}→${to} ${a} ${tok}`, s = nearestSlot(l.r);
    pk.push({ r0: l.r, r: l.r, x: -Math.random() * 6, v: Math.min(cap, (sm ? 7 : 10) + Math.random() * 8), txt, n: txt.length, cut: [4, 5, 9, 10 + a.length], sol, a, tok, to, slot: s, shred: 0, out: false, hit: false, hist: {}, lc: -1e9 }); };
  const ccol = (p, j) => j < 4 ? '#8a85a3' : j < 5 ? '#4f4a66' : j < 9 ? '#8a85a3' : j < 10 ? '' : j < p.cut[3] ? '#efedf7' : j === p.cut[3] ? '' : p.sol ? '#b49bff' : '#7cc0ff';
  const draw = now => { if (!base) return; const dt = Math.min(.1, Math.max(0, (now - last) / 1000)); last = now; const t = now / 1000;
    const ox = (mx - .5) * -10, oy = (my - .5) * -6; x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, cv.width, cv.height); x.drawImage(base, ox * dpr, oy * dpr);
    x.setTransform(dpr, 0, 0, dpr, ox * dpr, oy * dpr); x.font = `700 ${F}px 'JetBrains Mono', monospace`; x.textBaseline = 'top';
    const put = (c, r, g, col, a = 1) => { c = Math.round(c); r = Math.round(r); if (!g || g === ' ' || c < 0 || r < 0 || c >= COLS || r >= ROWS || inHole(c, r) || a <= 0) return; x.globalAlpha = Math.min(1, a); x.fillStyle = col; x.fillText(g, c * cw, r * ch); };
    const ops = [], occ = new Set(), q = (c, r, g, col, a = 1) => { c = Math.round(c); r = Math.round(r); ops.push([c, r, g, col, a]); if (c > WL && c < WR) occ.add(c * 997 + r); };
    for (let r = 0; r < ROWS; r++) heat[r] *= Math.exp(-dt * 1.8);
    // packets: readable while public, shredded inside the layer, a sealed [Z] after it
    if (Math.random() < (sm ? .12 : Math.min(.3, lanes.length * .012))) spawn();
    pk = pk.filter(p => { p.x += p.v * dt; const head = p.x, n = p.n;
      const crossed = clamp(Math.floor(head - WL), 0, n); if (crossed && !p.shred) { rip.push({ r: p.r0, t0: t }); if (rip.length > 14) rip.shift(); }
      for (; p.shred < crossed; p.shred++) { const j = n - 1 - p.shred; heat[p.r0] = 1; ports['L' + p.r0] = now; if (p.txt[j] !== ' ') bits.push({ x: WL + 1, y: p.r0, vx: 3 + Math.random() * 8, vy: (Math.random() - .5) * 18, g: p.txt[j], a: 1 }); }
      if (head > WR && !p.out) { p.out = true; ports['R' + p.r0] = now; }
      if (head > WR) { const hc = Math.floor(head); for (let c = Math.max(p.lc + 1, WR + 1); c <= hc; c++) { if (p.slot && c > WR + 1) { const dr = p.slot.ty - p.r; if (dr) p.r += Math.sign(dr); } p.hist[c] = p.r; } p.lc = hc; }
      if (!p.hit && head >= RK) { p.hit = true; if (p.slot) { leds[p.slot.k.r0 + ':' + p.slot.ty] = now; const prev = pays.filter(o => o.r === p.slot.ty).pop(), sp = sm ? 6 : 9; pays.push({ t0: Math.max(now + 520, prev ? prev.t0 + (prev.txt.length + 3) / sp * 1000 : 0), r: p.slot.ty, txt: sm ? `✓ ${p.a}` : `✓ ${p.a} ${p.tok} → ${p.to}`, sol: p.sol }); } }
      for (let i = 0; i < n + 8; i++) { const c = Math.floor(head) - i; if (c < 0 || c >= RK) continue; const j = n - 1 - i;
        if (c <= WL) { if (j >= 0) q(c, p.r0, p.txt[j], ccol(p, j) || '#4f4a66', .97); }
        else if (c < WR) { if (j >= 0 && p.txt[j] !== ' ') q(c, p.r0, '█▓▒░#%&'[(i + (t * 24 | 0)) % 7], i < 2 ? '#ffffff' : '#e2d8ff', 1); }
        else { const rr = p.hist[c] ?? p.r; if (i < 3) q(c, rr, '[Z]'[2 - i], i === 1 ? '#ffffff' : '#a68bff'); else if (i % 2 === 1 && i < 12) q(c, rr, '·', '#7a62d8', 1 - i / 14); } }
      return Math.floor(head) - n - 12 < RK; });
    bits = bits.filter(s => { s.x += s.vx * dt; s.y += s.vy * dt; s.vy *= .96; s.a -= dt * 1.4; if (s.x >= WR - .5 || s.y < T0 + .6 || s.y > T1 - .6 || s.a <= 0) return false; q(s.x, s.y, s.g, '#f3efff', s.a + .15); return true; });
    // the tower: a sealed membrane that ripples when it eats a transfer, falling hash behind it, a scan line through it
    const iw = WR - WL - 1, lab = sm ? 'zend' : 'sealed', ls = WL + 1 + Math.floor((iw - lab.length) / 2), core = HW * .62;
    for (let c = WL; c <= WR; c++) { const on = c >= ls && c < ls + lab.length; put(c, T0, c === WL ? '╔' : c === WR ? '╗' : on ? lab[c - ls] : '═', on ? '#d9cbff' : '#5a47a0'); put(c, T1, c === WL ? '╚' : c === WR ? '╝' : '═', '#5a47a0'); }
    for (let r = T0 + 1; r < T1; r++) { const lp = ports['L' + r], rp = ports['R' + r], lane = r % 3 === 0, la = lp && now - lp < 160, ra = rp && now - rp < 260;
      put(WL, r, la ? '►' : lane ? '╟' : '║', la ? '#ffffff' : '#5a47a0'); put(WR, r, ra ? '►' : lane ? '╢' : '║', ra ? '#c9b8ff' : '#5a47a0'); }
    rip = rip.filter(o => t - o.t0 < 2.6);
    const scan = (t * 6) % (T1 - T0 + 30) - 15 + T0;
    for (let r = T0 + 1; r < T1; r++) {
      let off = Math.sin(r * .21 + t * 1.5) * HW * .17 + Math.sin(r * .063 - t * .6) * HW * .13, hit = 0;
      for (const o of rip) { const age = t - o.t0, d = Math.abs(r - o.r); if (d > age * 12) continue; const e = Math.exp(-age * 1.5) * Math.exp(-d / 8); off += HW * .55 * e * Math.sin(d * .75 - age * 10); hit = Math.max(hit, e * (d < age * 12 && d > age * 12 - 2.5 ? 1 : .35)); }
      const mc = LX + off, hv = Math.max(heat[r] || 0, (heat[r - 1] || 0) * .6, (heat[r + 1] || 0) * .6);
      for (let c = WL + 1; c < WR; c++) { if (occ.has(c * 997 + r)) continue;
        if (Math.abs(r - scan) < .6) { put(c, r, '━', '#d9cbff', .85); continue; }
        const d = Math.abs(c - mc) / core;
        if (d < .38) { put(c, r, hv > .5 ? '█' : '▓', hit > .5 || hv > .5 ? '#ffffff' : '#cdbdff', 1); continue; }
        if (d < .78) { put(c, r, '▒', hit > .4 ? '#d9cbff' : '#8b5cff', .95); continue; }
        if (d < 1.12) { put(c, r, '░', hit > .4 ? '#a68bff' : '#5a47a0', .9); continue; }
        const sp = 4 + hash(c, 11) * 8, hd = (t * sp + hash(c, 23) * 90) % (ROWS + 16) - 8, k = hd - r;
        if (k >= 0 && k < 7) put(c, r, HEX[hash(c * 7 + r, Math.floor(t * 8)) * 16 | 0], k < 1 ? '#bfaaff' : '#4b3a86', (1 - k / 8) * (.7 + hv * .3));
        else if ((c + r) % 2 === 0) put(c, r, '·', '#2a2342', 1); } }
    for (const o of ops) put(...o);
    // racks: drive bays fill when a sealed packet lands, lights blink, then the rack pays out
    for (const k of racks) for (const o of [1, 3, 5]) { const r = k.r0 + o, key = k.r0 + ':' + r, h = leds[key], age = h ? now - h : 1e9, prog = clamp(age / 480, 0, 1);
      for (let c = 2; c < rw - 4; c++) { const lit = age < 900 && (c - 2) / (rw - 6) <= prog; put(RK + c, r, c % 2 ? '▪' : '▫', lit ? (age < 600 ? '#c9b8ff' : '#7a62d8') : '#2f2a45', lit ? 1 - Math.max(0, age - 600) / 300 * .6 : 1); }
      const idle = hash(k.r0 * 3 + o, Math.floor(t * 2.2 + o)) > .55; put(RK + rw - 3, r, '•', age < 700 ? '#ffffff' : idle ? '#3ddc84' : '#1f5c3a'); put(RK + rw - 2, r, '•', age < 1100 && age > 300 ? '#3ddc84' : '#2b2740'); }
    pays = pays.filter(q2 => { if (now < q2.t0) return true; const c0 = RK + rw, span = Math.max(q2.txt.length + 2, payW), tr = (now - q2.t0) / 1000 * (sm ? 6 : 9), fade = 1 - clamp((tr - span * .7) / (span * .5), 0, 1), arr = q2.txt.indexOf('→');
      for (let i = 0; i < q2.txt.length; i++) { const c = c0 + tr - (q2.txt.length - 1) + i; if (c <= c0 + .5) continue; const g = q2.txt[i]; put(c, q2.r, g, i === 0 ? '#3ddc84' : arr > 0 && i >= arr ? (i === arr ? '#4f4a66' : '#8a85a3') : /[\d.]/.test(g) ? '#c9f7dc' : q2.sol ? '#9d8ce0' : '#7cc0ff', fade); }
      return fade > 0 && c0 + tr - q2.txt.length < COLS + 2; });
    x.globalAlpha = 1; };
  const frame = now => { requestAnimationFrame(frame); if (!vis || document.hidden || now - last < 33) return; if (wrap.clientWidth !== W || wrap.clientHeight !== H) fit(); draw(now); };
  const go = () => { fit(); if (RM) { for (let i = 0; i < 40; i++) spawn(); pk.forEach(p => p.x = Math.random() * (RK + 8)); last = performance.now(); draw(last); return; } last = performance.now(); requestAnimationFrame(frame); };
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(go); let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { fit(); if (RM) draw(performance.now()); }, 200); });
  new IntersectionObserver(([e]) => { vis = e.isIntersecting; if (vis) { fit(); if (RM) draw(performance.now()); } }).observe(wrap);
  wrap.addEventListener('pointermove', e => { const b = wrap.getBoundingClientRect(); mx = (e.clientX - b.left) / b.width; my = (e.clientY - b.top) / b.height; });
})();

// =================================================================== 03 batch: many sealed payments, one after another
const batch = (() => {
  const st = { token: 'sol', sealed: true, busy: false }, ta = $('#bRows'), go = $('#bGo'), out = $('#bOut');
  const parse = () => ta.value.split('\n').map(l => l.trim()).filter(Boolean).map((l, i) => { const m = l.match(/^(@[\w.-]{1,20}|[1-9A-HJ-NP-Za-km-z]{32,44})[\s,;]+([\d.,]+)$/); if (!m) return { i, raw: l, bad: 'write it as: address amount' };
    const to = contacts.resolve(m[1]), a = parseFloat(m[2].replace(',', '.')); if (!isAddr(to)) return { i, raw: l, bad: 'unknown address or contact' }; if (!(a > 0)) return { i, raw: l, bad: 'bad amount' }; return { i, raw: l, who: m[1], to, a }; });
  const paint = () => { const rows = parse(), ok = rows.filter(r => !r.bad), bad = rows.length - ok.length, sum = ok.reduce((x, r) => x + r.a, 0);
    $$('#bTok button').forEach(b => b.classList.toggle('on', b.dataset.t === st.token)); $('#bSeal').classList.toggle('on', st.sealed); $('#bSeal').setAttribute('aria-checked', st.sealed);
    $('#bSum').textContent = `${ok.length} payment${ok.length === 1 ? '' : 's'} · ${fmt(sum)} ${st.token.toUpperCase()}${bad ? ` · ${bad} to fix` : ''}`;
    go.disabled = st.busy || (!!WAL.pk && (!ok.length || bad > 0)); go.textContent = st.busy ? 'paying…' : !WAL.pk ? 'connect a wallet' : ok.length ? `zend ${ok.length} payment${ok.length === 1 ? '' : 's'}${st.sealed ? ' sealed' : ''}` : 'add payments'; };
  ta.addEventListener('input', paint); $$('#bTok button').forEach(b => b.onclick = () => { st.token = b.dataset.t; paint(); });
  const tog = () => { st.sealed = !st.sealed; paint(); }; $('#bSeal').onclick = tog; $('#bSeal').onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tog(); } };
  function table(rows) { out.dataset.fresh = '1'; out.innerHTML = `<table class="tbl2"><tr><th>#</th><th>to</th><th class="r">amount</th><th>status</th></tr>${rows.map(r => `<tr><td class="dim">${r.i + 1}</td><td>${esc(r.who && r.who.startsWith('@') ? r.who : short(r.to || r.raw))}</td><td class="r">${r.a ? fmt(r.a) + ' ' + st.token.toUpperCase() : '—'}</td><td class="${r.cls || 'dim'}">${r.st || 'queued'}${r.out ? ` · <a target="_blank" rel="noopener" href="${tx$(r.out)}">receipt</a>` : ''}</td></tr>`).join('')}</table>`; }
  async function run() {
    if (!WAL.pk) return openSheet(); const rows = parse(); if (!rows.length || rows.some(r => r.bad)) { table(rows.map(r => r.bad ? { ...r, st: r.bad, cls: 'bad' } : r)); return; }
    const total = rows.reduce((x, r) => x + r.a, 0); if (st.token === 'sol' && !(await balanceOk('sol', total))) { table(rows.map(r => ({ ...r, st: 'not enough SOL for the whole batch', cls: 'bad' }))); return; }
    st.busy = true; paint(); table(rows); const job = jobs.add(`batch ${rows.length} × ${st.token.toUpperCase()}`);
    for (let k = 0; k < rows.length; k++) { const r = rows[k]; r.st = 'sign in your wallet'; r.cls = 'warn'; table(rows); jobs.set(job, `${k + 1}/${rows.length}`);
      const it = { id: Date.now().toString(36) + k, t: Date.now(), mode: 'wallet', sealed: st.sealed, token: st.token, amount: r.a, to: r.to, status: 'moving' };
      try {
        if (st.sealed) { const res = await sealedRoute({ token: st.token, amount: r.a, recipient: r.to, log: () => {}, onDone: ({ sig, dep }) => { hist.add(Object.assign(it, { sig, dep })); r.st = 'routing'; r.cls = 'vi'; table(rows); } }); r.out = res.out; hist.upd(it.id, { status: 'done', out: res.out }); }
        else { const sig = await walletSend(await buildPay(r.to, st.token, units(r.a, st.token))); hist.add(Object.assign(it, { sig })); r.st = 'confirming'; table(rows); await confirmed(sig); r.out = sig; hist.upd(it.id, { status: 'done', out: sig }); }
        r.st = 'delivered'; r.cls = 'ok'; table(rows);
      } catch (e) { r.st = errText(e); r.cls = 'bad'; rows.slice(k + 1).forEach(x => { x.st = 'not sent'; x.cls = 'dim'; }); table(rows); jobs.done(job, false, `stopped at ${k + 1}`); st.busy = false; paint(); return; } }
    jobs.done(job, true, `${rows.length}/${rows.length} delivered`); fly($('#batch .panel')); st.busy = false; paint(); }
  go.onclick = run; onWallet.push(paint); paint();
  return { run };
})();

// =================================================================== 07 wallet: holdings, priced
const TOKEN22 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb', SOLM = 'So11111111111111111111111111111111111111112';
const wallet = (() => {
  const inp = $('#wAddr'), go = $('#wGo'), out = $('#wOut'); let busy = false;
  const paint = () => { go.disabled = busy || !isAddr(contacts.resolve(inp.value.trim())); go.textContent = busy ? 'reading…' : 'read it'; };
  inp.addEventListener('input', paint); $('#wMe').onclick = () => { if (WAL.pk) { inp.value = WAL.pk; paint(); } else openSheet(); };
  onWallet.push(() => { if (WAL.pk && !inp.value) { inp.value = WAL.pk; paint(); } });
  async function run(mirror) { const addr = contacts.resolve(inp.value.trim()); out.dataset.fresh = '0'; const log = logger(out, mirror); if (!isAddr(addr)) { log('that is not a Solana address', 'bad'); return; }
    busy = true; paint(); log(`<span class="vi">zend wallet</span> ${short(addr)}`);
    try { const pk = new W3.PublicKey(addr), [lam, a, b] = await Promise.all([conn.getBalance(pk), conn.getParsedTokenAccountsByOwner(pk, { programId: new W3.PublicKey(TOKEN_PROG) }), conn.getParsedTokenAccountsByOwner(pk, { programId: new W3.PublicKey(TOKEN22) }).catch(() => ({ value: [] }))]);
      const accts = [...a.value, ...b.value], M = {}; accts.forEach(x => { const inf = x.account.data.parsed.info, amt = +inf.tokenAmount.uiAmount || 0; if (amt > 0) M[inf.mint] = (M[inf.mint] || 0) + amt; });
      const mints = Object.keys(M).slice(0, 59), px = await api('px', null, '&ids=' + [SOLM, ...mints].join(',')).catch(() => ({}));
      const rows = [{ m: SOLM, sym: 'SOL', icon: (px[SOLM] || {}).icon, amt: lam / 1e9, p: (px[SOLM] || {}).price, ch: (px[SOLM] || {}).ch }, ...mints.map(m => ({ m, sym: (px[m] || {}).symbol || short(m), icon: (px[m] || {}).icon, amt: M[m], p: (px[m] || {}).price, ch: (px[m] || {}).ch }))].map(r => ({ ...r, v: r.p ? r.amt * r.p : null })).sort((x, y) => (y.v || 0) - (x.v || 0));
      const total = rows.reduce((x, r) => x + (r.v || 0), 0), empty = accts.length - Object.keys(M).length;
      log(`<b>${usd(total)}</b> <span class="dim">across ${rows.length} asset${rows.length === 1 ? '' : 's'} · ${accts.length} token account${accts.length === 1 ? '' : 's'}${empty ? ` · ${empty} empty, holding ~${fmt(empty * .00204, 3)} SOL of rent` : ''}</span>`);
      log(`<table class="tbl2"><tr><th>asset</th><th class="r">amount</th><th class="r">price</th><th class="r">value</th><th class="r">24h</th></tr>${rows.slice(0, 40).map(r => `<tr><td>${r.icon ? `<img src="${esc(r.icon)}" alt="" loading="lazy" onerror="this.remove()">` : ''}<a target="_blank" rel="noopener" href="https://solscan.io/token/${r.m}">${esc(r.sym)}</a></td><td class="r">${fmt(r.amt, r.amt < 1 ? 6 : 2)}</td><td class="r">${r.p ? (r.p < .01 ? '$' + r.p.toPrecision(3) : usd(r.p)) : '—'}</td><td class="r">${r.v != null ? usd(r.v) : '—'}</td><td class="r ${r.ch > 0 ? 'ok' : r.ch < 0 ? 'bad' : 'dim'}">${r.ch != null ? (r.ch > 0 ? '+' : '') + r.ch.toFixed(1) + '%' : '—'}</td></tr>`).join('')}</table>`);
    } catch (e) { log(`<span class="bad">✕ ${esc(errText(e))}</span>`); }
    busy = false; paint(); }
  go.onclick = () => run(); return { run, set: a => { inp.value = a; paint(); } };
})();

// =================================================================== 08 tx: decode any transaction
const PROGS = { '11111111111111111111111111111111': 'System', TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA: 'Token', TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb: 'Token-2022', ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: 'Associated Token', ComputeBudget111111111111111111111111111111: 'Compute Budget', JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: 'Jupiter', '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P': 'pump.fun', pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA: 'PumpSwap', '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8': 'Raydium AMM', CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: 'Raydium CLMM', whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: 'Orca', LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo: 'Meteora DLMM', MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: 'Memo', Stake11111111111111111111111111111111111111: 'Stake', Vote111111111111111111111111111111111111111: 'Vote' };
const inspect = (() => {
  const inp = $('#xSig'), go = $('#xGo'), out = $('#xOut'), ok = v => /^[1-9A-HJ-NP-Za-km-z]{60,100}$/.test(v);
  const paint = () => { go.disabled = !ok(inp.value.trim()); }; inp.addEventListener('input', paint);
  $('#xPaste').onclick = async () => { try { inp.value = (await navigator.clipboard.readText()).trim(); paint(); } catch (e) { inp.focus(); } };
  async function run(mirror) { const sig = inp.value.trim(); out.dataset.fresh = '0'; const log = logger(out, mirror); if (!ok(sig)) { log('that is not a transaction signature', 'bad'); return; }
    log(`<span class="vi">zend tx</span> ${short(sig)}`);
    try { const tx = await conn.getParsedTransaction(sig, { maxSupportedTransactionVersion: 0 }); if (!tx) { log('not found yet. it may still be confirming, or it is older than this RPC keeps.', 'warn'); return; }
      const keys = tx.transaction.message.accountKeys.map(k => ({ a: (k.pubkey || k).toString(), s: !!k.signer })), meta = tx.meta || {};
      log(`${meta.err ? '<span class="bad">✕ failed</span>' : '<span class="ok">✓ success</span>'} · slot ${fmt(tx.slot, 0)} · ${tx.blockTime ? new Date(tx.blockTime * 1000).toLocaleString() : '—'} · fee ${fmt((meta.fee || 0) / 1e9, 6)} SOL · <a target="_blank" rel="noopener" href="${tx$(sig)}">solscan</a>`);
      log(`<span class="dim">signed by</span> ${keys.filter(k => k.s).map(k => `<a target="_blank" rel="noopener" href="${ac$(k.a)}">${short(k.a)}</a>`).join(', ')}`);
      const ixs = [...tx.transaction.message.instructions, ...((meta.innerInstructions || []).flatMap(i => i.instructions))], progs = [...new Set(ixs.map(i => (i.programId || '').toString()))];
      log(`<span class="dim">programs</span> ${progs.map(p => PROGS[p] || short(p)).join(' · ')}`);
      const moves = []; ixs.forEach(ix => { const pz = ix.parsed; if (!pz || typeof pz !== 'object') return; const inf = pz.info || {};
        if (ix.program === 'system' && pz.type === 'transfer') moves.push(`${short(inf.source)} → ${short(inf.destination)} <b>${fmt(inf.lamports / 1e9, 6)} SOL</b>`);
        else if (/spl-token/.test(ix.program || '') && /^transfer/.test(pz.type)) moves.push(`${short(inf.authority || inf.source)} → ${short(inf.destination)} <b>${inf.tokenAmount ? fmt(inf.tokenAmount.uiAmount, 6) : inf.amount}</b> <span class="dim">${inf.mint ? short(inf.mint) : 'token'}</span>`); });
      if (moves.length) { log('<span class="dim">transfers</span>'); moves.slice(0, 14).forEach(m => log('  ' + m)); }
      const sol = keys.map((k, i) => ({ a: k.a, d: ((meta.postBalances || [])[i] - (meta.preBalances || [])[i]) / 1e9 })).filter(r => Math.abs(r.d) > 1e-9);
      const tb = {}; (meta.preTokenBalances || []).forEach(b => { tb[b.accountIndex + b.mint] = { o: b.owner, m: b.mint, pre: +b.uiTokenAmount.uiAmount || 0, post: 0 }; }); (meta.postTokenBalances || []).forEach(b => { const k = b.accountIndex + b.mint; tb[k] = Object.assign(tb[k] || { o: b.owner, m: b.mint, pre: 0 }, { post: +b.uiTokenAmount.uiAmount || 0 }); });
      const tch = Object.values(tb).map(r => ({ ...r, d: r.post - r.pre })).filter(r => Math.abs(r.d) > 0);
      const mints = [...new Set(tch.map(r => r.m))], px = mints.length ? await api('px', null, '&ids=' + mints.slice(0, 40).join(',')).catch(() => ({})) : {};
      log(`<table class="tbl2"><tr><th>account</th><th>asset</th><th class="r">change</th></tr>${sol.map(r => `<tr><td><a target="_blank" rel="noopener" href="${ac$(r.a)}">${short(r.a)}</a></td><td>SOL</td><td class="r ${r.d > 0 ? 'ok' : 'bad'}">${r.d > 0 ? '+' : ''}${fmt(r.d, 6)}</td></tr>`).join('')}${tch.map(r => `<tr><td><a target="_blank" rel="noopener" href="${ac$(r.o || '')}">${short(r.o || '')}</a></td><td>${esc((px[r.m] || {}).symbol || short(r.m))}</td><td class="r ${r.d > 0 ? 'ok' : 'bad'}">${r.d > 0 ? '+' : ''}${fmt(r.d, 6)}</td></tr>`).join('')}</table>`);
      if (meta.err) log(`<span class="bad">error: ${esc(JSON.stringify(meta.err)).slice(0, 160)}</span>`);
    } catch (e) { log(`<span class="bad">✕ ${esc(errText(e))}</span>`); } }
  go.onclick = () => run(); return { run, set: v => { inp.value = v; paint(); } };
})();

// =================================================================== rate curve in live
const curve = (() => { let busy = false, done = false;
  const S = [['sol', .05], ['sol', .5], ['sol', 5], ['sol', 50], ['usdc', 5], ['usdc', 50], ['usdc', 500], ['usdc', 5000]];
  async function load() { if (busy) return; busy = true; const el = $('#curve'); el.innerHTML = '<div class="dim">asking the solvers at 8 sizes…</div>'; const dummy = W3.Keypair.generate().publicKey.toBase58();
    const res = await Promise.all(S.map(([t, a]) => api('quote', { from: t, to: t, amount: a, recipient: dummy, refundTo: dummy, dry: true }).then(q => ({ t, a, out: +q.amountOut, s: q.timeEstimate })).catch(e => ({ t, a, err: errText(e) }))));
    el.innerHTML = res.map(r => { const pc = r.out ? r.out / r.a * 100 : 0; return `<div class="cr"><span>${fmt(r.a)} ${r.t.toUpperCase()}</span><div class="bar"><b style="width:${r.out ? clamp((pc - 97) / 3 * 100, 4, 100) : 0}%"></b></div><span>${r.out ? fmt(r.out, r.t === 'sol' ? 5 : 3) + ' · ' + (100 - pc).toFixed(2) + '%' : '<span class="bad">' + esc(r.err || 'no route') + '</span>'}</span><span class="dim">${r.s ? '~' + r.s + ' s' : ''}</span></div>`; }).join('');
    busy = false; done = true; }
  $('#curveGo').onclick = load; return { load, auto: () => { if (!done) load(); } };
})();

// =================================================================== command palette (⌘K / ctrl K)
const palette = (() => {
  const box = $('#pal'), inp = $('#palIn'), list = $('#palList'); let items = [], sel = 0;
  const ALL = () => [...MODS.map(m => ({ k: 'open ' + (m === 'inspect' ? 'tx' : m), hint: 'module', run: () => show(m, { focus: true }) })),
    ...['help', 'quote 1 sol', 'quote 100 usdc', 'live', 'rates', 'zends', 'contacts', 'whoami', 'connect', 'disconnect', 'clear'].map(c => ({ k: c, hint: 'command', run: () => cli.exec(c) }))];
  const render = () => { const q = inp.value.trim().toLowerCase(); items = ALL().filter(i => !q || i.k.includes(q)); if (q && !items.length) items = [{ k: q, hint: 'run in console', run: () => cli.exec(q) }]; sel = Math.min(sel, items.length - 1);
    list.innerHTML = items.slice(0, 12).map((i, n) => `<button class="${n === sel ? 'on' : ''}" data-i="${n}">${esc(i.k)}<span>${i.hint}</span></button>`).join(''); };
  const open = () => { box.classList.add('on'); inp.value = ''; sel = 0; render(); setTimeout(() => inp.focus(), 10); }, close = () => box.classList.remove('on');
  inp.addEventListener('input', () => { sel = 0; render(); });
  inp.addEventListener('keydown', e => { if (e.key === 'ArrowDown') { sel = Math.min(items.length - 1, sel + 1); render(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); render(); e.preventDefault(); } else if (e.key === 'Enter') { const it = items[sel]; close(); it && it.run(); } else if (e.key === 'Escape') close(); });
  list.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { const it = items[+b.dataset.i]; close(); it && it.run(); } });
  box.addEventListener('click', e => { if (e.target === box) close(); });
  addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); box.classList.contains('on') ? close() : open(); } });
  return { open, close };
})();
// keys: 1–0 open modules, h home, ? help
addEventListener('keydown', e => { const a = document.activeElement; if (e.metaKey || e.ctrlKey || e.altKey || (a && /INPUT|TEXTAREA/.test(a.tagName)) || $('#pal').classList.contains('on')) return;
  const map = { 1: 'send', 2: 'request', 3: 'batch', 4: 'link', 5: 'claim', 6: 'trace', 7: 'wallet', 8: 'inspect', 9: 'route', 0: 'live', h: 'home' }; if (map[e.key]) { e.preventDefault(); show(map[e.key]); } else if (e.key === '?') { e.preventDefault(); cli.exec('help'); } });

// =================================================================== the side pane and the ticker: live chain data
const side = (() => {
  const set = (id, v) => { const e = $('#' + id); if (e && e.textContent !== String(v)) { e.textContent = v; e.classList.remove('flash'); void e.offsetWidth; e.classList.add('flash'); } };
  const T = { tps: [] };
  async function slot() { try { const sl = await conn.getSlot(); set('tSlot', fmt(sl, 0)); set('pSlot', fmt(sl, 0)); } catch (e) {} }
  async function epoch() { try { const ep = await conn.getEpochInfo(); const pc = ep.slotIndex / ep.slotsInEpoch * 100; set('tEpoch', `${ep.epoch} · ${pc.toFixed(1)}%`); set('pEpoch', `${ep.epoch} · ${pc.toFixed(1)}%`); $('#pEpBar').style.width = pc + '%'; } catch (e) {} }
  function net(n) { if (!n) return; if (n.tps) { set('tTps', fmt(n.tps, 0)); set('pTps', fmt(n.tps, 0)); T.tps.push(n.tps); spark($('#pSpark'), T.tps); } set('pPrio', n.prio != null ? fmt(n.prio, 0) + ' µL' : '—');
    if (n.sol) { set('tPx', usd(n.sol)); set('pPx', usd(n.sol)); } if (n.q.sol) { set('tRate', fmt(n.q.sol.out, 5)); set('pR1', fmt(n.q.sol.out, 5) + ' SOL'); set('pRt', '~' + (n.q.sol.t || 20) + ' s'); } if (n.q.usdc) set('pR2', fmt(n.q.usdc.out, 3) + ' USDC'); }
  async function you() { const el = $('#pYou'); if (!WAL.pk) { el.innerHTML = '<div><span class="dim">connect a wallet to see balances</span></div>'; return; }
    let sol = null, u = null; try { sol = (await conn.getBalance(new W3.PublicKey(WAL.pk))) / 1e9; } catch (e) {}
    try { const r = await conn.getTokenAccountsByOwner(new W3.PublicKey(WAL.pk), { mint: new W3.PublicKey(USDC) }); u = 0; for (const a of r.value) { const d = a.account.data; u += Number(new DataView(d.buffer, d.byteOffset + 64, 8).getBigUint64(0, true)) / 1e6; } } catch (e) {}
    el.innerHTML = `<div><span>wallet</span><b><a target="_blank" rel="noopener" href="${ac$(WAL.pk)}">${short(WAL.pk)}</a></b></div><div><span>SOL</span><b>${sol == null ? '—' : fmt(sol, 4)}</b></div><div><span>USDC</span><b>${u == null ? '—' : fmt(u, 2)}</b></div>${sol != null && NET.sol ? `<div><span>value</span><b>${usd(sol * NET.sol + (u || 0))}</b></div>` : ''}`; }
  function recent() { const l = hist.load().slice(0, 5); $('#pRecent').innerHTML = l.length ? l.map(it => `<div><b>${fmt(it.amount)} ${it.token.toUpperCase()}</b><span>${it.mode === 'link' ? 'link' : short(it.to)} · ${it.status === 'done' ? 'delivered' : it.status}</span></div>`).join('') : '<div><span>none yet</span></div>'; }
  slot(); epoch(); setInterval(() => !document.hidden && slot(), 2500); setInterval(() => !document.hidden && epoch(), 60000); setInterval(recent, 4000); recent();
  onWallet.push(you); setInterval(() => !document.hidden && WAL.pk && you(), 30000);
  return { net, you, recent };
})();

hist.render(); contacts.render(); hist.poll(); setInterval(() => hist.poll(), 20000); silent(); setInterval(() => live.load(), 30000);
{ const m = (location.hash.match(/^#([a-z]+)$/) || [])[1]; if (m && MODS.includes(m)) show(m, { keepHash: true }); else dockSet(!$('#log').children.length); }
intro.done.then(() => { wordmark.run(); cli.boot(); });
})();
