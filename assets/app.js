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
function logger(el, mirror) { return (html, cls = '') => { for (const t of [el, mirror].filter(Boolean)) { if (t.dataset.fresh !== '1') { t.innerHTML = ''; t.dataset.fresh = '1'; } const d = document.createElement('div'); d.className = cls; d.innerHTML = html; t.appendChild(d); t.scrollTop = t.scrollHeight; } }; }
const heroLog = $('#log');

// =================================================================== intro
const intro = (() => {
  const root = document.documentElement; if (!root.classList.contains('intro')) return { done: Promise.resolve() };
  let finish; const done = new Promise(r => finish = r);
  const cv = $('#introC'), x = cv.getContext('2d'); let W, H, dpr, F, cw, ch, COLS, ROWS, land = null, T0 = 0, ended = false, snap = null;
  const INK = '#151513', VIO = '#7a3cff';
  const fit = () => { dpr = Math.min(2, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); F = W < 700 ? 8 : 11; cw = F * .6; ch = F * 1.18; COLS = Math.ceil(W / cw); ROWS = Math.ceil(H / ch); };
  fit();
  const img = new Image(); img.src = '/assets/land.png';
  // map projection that fits the whole world into the viewport (equirectangular, cropped poles)
  const mapBox = () => { const mw = Math.max(W, H * 2.4), mh = mw / 3; return { mw, mh, ox: (W - mw) / 2, oy: (H - mh) / 2 }; };
  const P = (lon, lat) => { const b = mapBox(); return [b.ox + (lon + 180) / 360 * b.mw, b.oy + (583 / 1000) * b.mh - lat / 360 * b.mw]; };
  let L = null;
  const build = () => { const b = mapBox(), c = document.createElement('canvas'); c.width = COLS; c.height = ROWS; const cx = c.getContext('2d'); cx.fillStyle = '#000'; cx.fillRect(0, 0, COLS, ROWS); cx.drawImage(img, b.ox / cw, b.oy / ch, b.mw / cw, b.mh / ch); L = cx.getImageData(0, 0, COLS, ROWS).data; };
  const R = [[-74, 40.7, 72.9, 19.1, .24], [-80.2, 25.8, -46.6, -23.5, .3], [-74, 40.7, 3.4, 6.5, .22], [72.9, 19.1, 121, 14.6, .3], [-0.1, 51.5, 36.8, -1.3, .26]];
  const qp = (a, b, k, t) => { const [x1, y1] = a, [x2, y2] = b, d = Math.hypot(x2 - x1, y2 - y1), cx = (x1 + x2) / 2, cy = (y1 + y2) / 2 - d * k; return [(1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * cx + t * t * x2, (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * cy + t * t * y2]; };
  const ENV = ['+-----------------+', '|\\               /|', '| \\             / |', '|  \\    ___    /  |', '|   \\  ( Z )  /   |', '|    \\  ‾‾‾  /    |', '|     \\_____/     |', '+-----------------+'];
  const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function scene(t) {
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.font = `700 ${F}px 'JetBrains Mono', monospace`; x.textBaseline = 'top';
    // 1. the map types itself in, row by row
    const rows = clamp(t / 1.5, 0, 1) * ROWS;
    for (let r = 0; r < rows; r++) { const fresh = rows - r < 3; for (let c = 0; c < COLS; c++) { const l = L ? L[(r * COLS + c) * 4] : 0; if (l < 120) { if ((r % 4 === 0) && (c % 6 === 0)) { x.fillStyle = '#ece9f2'; x.fillText('+', c * cw, r * ch); } continue; }
      const h = hash(c, r); x.fillStyle = fresh ? VIO : h > .85 ? '#b9b3cc' : '#aaa4bd'; x.fillText(fresh ? '#%@&*'[(c + r + (t * 30 | 0)) % 5] : h > .86 ? '%' : '#', c * cw, r * ch); } }
    // 2. routes draw across borders, an envelope on each head
    R.forEach(([lo1, la1, lo2, la2, k], i) => { const p = clamp((t - 1.2 - i * .18) / 1.6, 0, 1); if (p <= 0) return; const a = P(lo1, la1), b = P(lo2, la2);
      x.fillStyle = INK; x.fillText('[@]', a[0] - cw, a[1] - ch / 2); if (p > .98) { x.fillStyle = VIO; x.fillText('[@]', b[0] - cw, b[1] - ch / 2); }
      const n = 120; for (let j = 0; j <= n * p; j++) { const tt = j / n, [px, py] = qp(a, b, k, tt), kk = tt / p; x.fillStyle = kk > .6 ? VIO : '#b49bff'; x.fillText(kk > .6 ? '=' : '-', Math.round(px / cw) * cw, Math.round(py / ch) * ch); }
      if (p < 1) { const [hx, hy] = qp(a, b, k, p); x.fillStyle = '#fff'; x.fillRect(hx - cw * 3.5, hy - ch * 1.2, cw * 7, ch * 2.6); x.fillStyle = INK; x.fillText('+-----+', hx - cw * 3.5, hy - ch); x.fillText('|\\(', hx - cw * 3.5, hy); x.fillStyle = VIO; x.fillText('Z', hx - cw * .5, hy); x.fillStyle = INK; x.fillText(')/|', hx + cw * .5, hy); x.fillText('+-----+', hx - cw * 3.5, hy + ch); } });
    // 3. the sealed envelope lands in the middle and the seal stamps
    const e = clamp((t - 3.3) / .7, 0, 1);
    if (e > 0) { const s = (W < 700 ? 1.25 : 2.1) * (1 + (1 - ease(e)) * .25), fs = F * s, ew = ENV[0].length * fs * .6, eh = ENV.length * fs * 1.18, ex = W / 2 - ew / 2, ey = H / 2 - eh / 2;
      x.globalAlpha = ease(e); x.fillStyle = '#fff'; x.fillRect(ex - fs, ey - fs * .6, ew + fs * 2, eh + fs * 1.2); x.font = `800 ${fs}px 'JetBrains Mono', monospace`;
      ENV.forEach((l, k) => { x.fillStyle = INK; x.fillText(l, ex, ey + k * fs * 1.18); });
      const st = clamp((t - 3.9) / .35, 0, 1); if (st > 0) { const ss = 1 + (1 - st) * 1.4, sx = W / 2, sy = ey + 4 * fs * 1.18 + fs * .55; x.save(); x.translate(sx, sy); x.scale(ss, ss); x.fillStyle = VIO; x.beginPath(); x.arc(0, 0, fs * 1.55, 0, 7); x.fill(); x.fillStyle = '#fff'; x.font = `800 ${fs * 1.6}px 'JetBrains Mono', monospace`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('Z', 0, fs * .05); x.restore(); x.textAlign = 'left'; x.textBaseline = 'top'; }
      x.globalAlpha = 1; return { sx: W / 2, sy: ey + 4 * fs * 1.18 + fs * .55 }; }
    return null;
  }
  function frame(now) {
    if (ended) return; const t = (now - T0) / 1000;
    if (t < 4.6) { scene(t); requestAnimationFrame(frame); return; }
    // 4. dive into the seal; the terminal is inside
    if (!snap) { snap = document.createElement('canvas'); snap.width = cv.width; snap.height = cv.height; const s = scene(4.6); snap.getContext('2d').drawImage(cv, 0, 0); snap.c = s; }
    const z = clamp((t - 4.6) / 1.1, 0, 1), k = Math.pow(z, 2.4), sc = 1 + k * 60, c = snap.c || { sx: W / 2, sy: H / 2 };
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#7a3cff'; x.fillRect(0, 0, cv.width, cv.height);
    x.setTransform(dpr * sc, 0, 0, dpr * sc, dpr * (c.sx - c.sx * sc), dpr * (c.sy - c.sy * sc)); x.drawImage(snap, 0, 0, W, H); x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.globalAlpha = clamp((z - .55) / .45, 0, 1); x.fillStyle = '#0d0c12'; x.fillRect(0, 0, W, H); x.globalAlpha = 1;
    if (z < 1) requestAnimationFrame(frame); else end();
  }
  function end() { if (ended) return; ended = true; try { sessionStorage.setItem('zend:intro', '1'); } catch (e) {} const v = $('#introV'); v.style.transition = 'opacity .35s'; v.style.opacity = '0'; setTimeout(() => { root.classList.remove('intro'); v.remove(); }, 360); finish(); }
  $('#skip').onclick = end; $('#introV').addEventListener('pointerdown', e => { if (e.target.id !== 'skip') end(); });
  addEventListener('keydown', e => { if (!ended && (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ')) end(); });
  const go = () => { build(); T0 = performance.now(); requestAnimationFrame(frame); };
  (img.complete ? Promise.resolve() : img.decode().catch(() => {})).then(() => document.fonts && document.fonts.ready).then(go, go);
  setTimeout(end, 9000);   // backstop
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
async function sealedRoute({ token, amount, recipient, log, onDone }) {
  log(`<span class="dim">></span> asking the solvers for a route…`);
  const q = await api('quote', { from: token, to: token, amount, recipient, refundTo: WAL.pk });
  log(`<span class="dim">></span> one-time address <a target="_blank" rel="noopener" href="${ac$(q.depositAddress)}">${short(q.depositAddress)}</a> · they get <b>${fmt(+q.amountOut, 6)} ${token.toUpperCase()}</b> · ~${q.timeEstimate || 20} s`);
  log(`<span class="dim">></span> sign the deposit in your wallet…`, 'warn');
  const sig = await walletSend(await buildPay(q.depositAddress, token, q.units));
  log(`<span class="ok">✓</span> deposit sent <a target="_blank" rel="noopener" href="${tx$(sig)}">${short(sig)}</a>`);
  api('submit', { txHash: sig, depositAddress: q.depositAddress }).catch(() => {});
  const it = onDone ? onDone({ sig, dep: q.depositAddress }) : null; let last = '';
  for (let i = 0; i < 150; i++) { await sleep(3000); let s; try { s = await api('status', null, '&dep=' + q.depositAddress); } catch (e) { continue; }
    const lab = { PENDING_DEPOSIT: 'waiting for the deposit to land', KNOWN_DEPOSIT_TX: 'deposit seen', PROCESSING: 'solvers are routing it' }[s.status];
    if (lab && lab !== last) { last = lab; log(`<span class="dim">></span> ${lab}…`); }
    if (s.status === 'SUCCESS') { log(`<span class="ok">✓</span> delivered${s.out[0] ? ` · receipt <a target="_blank" rel="noopener" href="${tx$(s.out[0])}">${short(s.out[0])}</a> (paid by the solvers)` : ''}`, 'ok'); return { sig, dep: q.depositAddress, out: s.out[0] || null, it }; }
    if (/REFUND|FAIL|INCOMPLETE/.test(s.status)) throw new Error(s.status === 'REFUNDED' ? 'the solvers could not fill it; refunded to your wallet' : 'the route failed; a refund goes back to your wallet'); }
  throw new Error('still routing; it will update in your zends');
}

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

// =================================================================== 01 send
const send = (() => {
  const st = { token: 'sol', sealed: true, q: null, qid: 0, dummy: W3.Keypair.generate().publicKey.toBase58(), busy: false };
  const amt = $('#sAmt'), to = $('#sTo'), go = $('#sGo'), qEl = $('#sQuote'), out = $('#sOut');
  const amount = () => { const v = parseFloat(String(amt.value).replace(',', '.')); return isFinite(v) && v > 0 ? v : 0; };
  function paint() {
    $$('#sTok button').forEach(b => b.classList.toggle('on', b.dataset.t === st.token));
    $('#sSeal').classList.toggle('on', st.sealed); $('#sSeal').setAttribute('aria-checked', st.sealed); $('#sSealT').textContent = st.sealed ? 'solvers pay them, not your wallet' : 'a plain transfer from your wallet';
    const a = amount(), r = to.value.trim(); let label, ok = false;
    if (st.busy) label = 'zending…'; else if (!WAL.pk) { label = 'connect a wallet'; ok = true; } else if (!a) label = 'enter an amount'; else if (!isAddr(r)) label = 'add their address'; else if (r === WAL.pk) label = "that's your own wallet"; else if (st.sealed && st.q && st.q.err) label = 'no route for that amount'; else { label = `zend ${fmt(a)} ${st.token.toUpperCase()}${st.sealed ? ' sealed' : ''}`; ok = true; }
    go.textContent = label; go.disabled = !ok;
  }
  let qt; function requote() { clearTimeout(qt); st.q = null; paint(); const a = amount(); const px = st.token === 'sol' ? NET.sol : 1;
    if (!a) { qEl.innerHTML = ''; return; }
    const head = `<div><span>value</span><b>${px ? '≈ ' + usd(a * px) : '—'}</b></div>`;
    if (!st.sealed) { qEl.innerHTML = head + `<div><span>they get</span><b>${fmt(a)} ${st.token.toUpperCase()}</b></div><div><span>arrives</span><b>in seconds</b></div><div><span>network fee</span><b>~0.000005 SOL${st.token === 'usdc' ? ' (+0.002 if new account)' : ''}</b></div>`; return; }
    qEl.innerHTML = head + '<div><span class="dim">asking the solvers…</span></div>';
    qt = setTimeout(async () => { const id = ++st.qid; try { const r = to.value.trim(), q = await api('quote', { from: st.token, to: st.token, amount: a, recipient: isAddr(r) ? r : st.dummy, refundTo: WAL.pk || st.dummy, dry: true }); if (id !== st.qid) return; st.q = q;
      const fee = Math.max(0, (1 - (+q.amountOut) / a) * 100);
      qEl.innerHTML = head + `<div><span>they get</span><b>${fmt(+q.amountOut, 6)} ${st.token.toUpperCase()}</b></div><div><span>arrives</span><b>~${q.timeEstimate || 20} s</b></div><div><span>route fee</span><b>${fee.toFixed(2)}%${st.token === 'usdc' ? ' + 0.002 SOL account rent' : ''}</b></div>`;
    } catch (e) { if (id !== st.qid) return; st.q = { err: true }; qEl.innerHTML = head + `<div class="bad">${esc(errText(e))}</div>`; } paint(); }, 450); }
  $$('#sTok button').forEach(b => b.onclick = () => { st.token = b.dataset.t; requote(); });
  const tog = () => { st.sealed = !st.sealed; requote(); }; $('#sSeal').onclick = tog; $('#sSeal').onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); tog(); } };
  amt.addEventListener('input', () => { amt.value = amt.value.replace(/[^0-9.,]/g, ''); requote(); }); to.addEventListener('input', requote);
  $('#sPaste').onclick = async () => { try { to.value = (await navigator.clipboard.readText()).trim(); requote(); } catch (e) { to.focus(); toast('paste the address into the field'); } };
  go.onclick = () => { if (!WAL.pk) return openSheet(); run(); };
  async function run(mirror) {
    if (st.busy) return; const a = amount(), r = to.value.trim(), token = st.token, sealed = st.sealed; out.dataset.fresh = '0'; const log = logger(out, mirror);
    if (!WAL.pk) { log('connect a wallet first: type <b>connect</b> or use the button at the top', 'warn'); return openSheet(); }
    if (!a || !isAddr(r)) { log('need an amount and a Solana address', 'bad'); return; }
    if (!(await balanceOk(token, a))) { log('not enough SOL in your wallet for that plus fees', 'bad'); return; }
    st.busy = true; paint(); log(`<span class="vi">zend</span> ${fmt(a)} ${token.toUpperCase()} → ${short(r)} ${sealed ? '<span class="vi">[sealed]</span>' : '[open]'}`);
    const it = { id: Date.now().toString(36), t: Date.now(), mode: 'wallet', sealed, token, amount: a, to: r, status: 'moving' };
    try {
      if (sealed) { const res = await sealedRoute({ token, amount: a, recipient: r, log, onDone: ({ sig, dep }) => hist.add(Object.assign(it, { sig, dep })) }); hist.upd(it.id, { status: 'done', out: res.out }); }
      else { log(`<span class="dim">></span> sign in your wallet…`, 'warn'); const sig = await walletSend(await buildPay(r, token, units(a, token))); hist.add(Object.assign(it, { sig })); log(`<span class="dim">></span> sent <a target="_blank" rel="noopener" href="${tx$(sig)}">${short(sig)}</a>, confirming…`); await confirmed(sig); hist.upd(it.id, { status: 'done', out: sig }); log(`<span class="ok">✓</span> confirmed on Solana`, 'ok'); }
      fly($('#sendForm'));
    } catch (e) { log(`<span class="bad">✕ ${esc(errText(e))}</span>`); if (it.dep) hist.upd(it.id, { status: /refund/i.test(e.message) ? 'failed' : it.status }); }
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
    log(`<span class="vi">zend link</span> ${fmt(a)} SOL ${sealed ? '<span class="vi">[sealed]</span>' : '[open]'}`); log(`<span class="dim">></span> new link key made in your browser · ${short(pub)}`);
    const it = { id: Date.now().toString(36), t: Date.now(), mode: 'link', sealed, token: 'sol', amount: a, seed, status: 'moving' };
    try {
      if (sealed) { const res = await sealedRoute({ token: 'sol', amount: a, recipient: pub, log, onDone: ({ sig, dep }) => hist.add(Object.assign(it, { sig, dep })) }); hist.upd(it.id, { status: 'unclaimed', out: res.out }); }
      else { log(`<span class="dim">></span> sign in your wallet…`, 'warn'); const sig = await walletSend(await buildPay(pub, 'sol', units(a, 'sol'))); hist.add(Object.assign(it, { sig })); log(`<span class="dim">></span> funding <a target="_blank" rel="noopener" href="${tx$(sig)}">${short(sig)}</a>…`); await confirmed(sig); hist.upd(it.id, { status: 'unclaimed', out: sig }); log(`<span class="ok">✓</span> the link is funded`, 'ok'); }
      const url = hist.linkUrl({ seed }); fly($('#link .panel'));
      log(`<div class="linkbox"><code>${url}</code><button class="btn v sm" data-cp>copy</button></div>`); log(`<span class="dim">anyone with this link can claim it. send it like cash. take it back any time from your zends.</span>`);
      [out, mirror].filter(Boolean).forEach(t => { const bs = t.querySelectorAll('[data-cp]'), b = bs[bs.length - 1]; if (b) b.onclick = () => { navigator.clipboard.writeText(url); toast('link copied'); }; });
    } catch (e) { log(`<span class="bad">✕ ${esc(errText(e))}</span>`); }
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
  if (/[#&]c=/.test(location.hash)) { inp.value = location.origin + '/' + location.hash; $('#cH').innerHTML = 'someone zent you <span class="vi">something.</span>'; inspect(); setTimeout(() => $('#claim').scrollIntoView({ behavior: 'instant', block: 'start' }), 60); }
  return { sweep, run, set: s => { inp.value = s; inspect(); } };
})();

// =================================================================== 05 live
const live = (() => {
  let last = null;
  async function load() { try { const n = await api('net'); last = n; if (n.sol) NET.sol = n.sol;
    if (n.q.sol) { $('#nSol').textContent = fmt(n.q.sol.out, 5) + ' SOL'; $('#nSolD').textContent = `they get · ~${n.q.sol.t || 20} s · ${((1 - n.q.sol.out) * 100).toFixed(2)}%`; }
    if (n.q.usdc) { $('#nUsdc').textContent = fmt(n.q.usdc.out, 3) + ' USDC'; $('#nUsdcD').textContent = `they get · ~${n.q.usdc.t || 20} s · ${((1 - n.q.usdc.out / 100) * 100).toFixed(2)}%`; }
    $('#nTps').textContent = n.tps ? fmt(n.tps, 0) : '—'; $('#nPx').textContent = n.sol ? usd(n.sol) : '—'; $('#nFee').textContent = n.prio != null ? `priority fee ${fmt(n.prio, 0)} µlamports` : 'priority fee —';
    $('#nAt').textContent = `updated ${new Date(n.at).toLocaleTimeString()} · solvers via NEAR Intents 1Click · Solana mainnet`; send.requote(); link.requote();
  } catch (e) { $('#nAt').textContent = 'live data is offline right now'; } return last; }
  return { load, get: () => last };
})();

// =================================================================== the command line
const cli = (() => {
  const inp = $('#cli'), log = logger(heroLog); let histI = -1; const past = [];
  const out = (h, c) => log(h, c), cmdEcho = s => log(`<span class="vi">zend:~$</span> ${esc(s)}`);
  const go = id => $(id).scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
  const HELP = [['send 0.1 sol to &lt;address&gt;', 'sealed send (add --open for a plain transfer)'], ['send 25 usdc to &lt;address&gt;', 'USDC works too'], ['link 0.05', 'make a payment link (add --sealed)'], ['claim &lt;link&gt;', 'claim a link to your wallet'], ['quote 1 sol', 'live sealed quote'], ['live', 'solvers, SOL price, Solana TPS'], ['zends', 'your recent zends'], ['connect · disconnect · whoami', 'wallet'], ['route · man · vs', 'jump to a section'], ['clear', 'clear the screen']];
  async function exec(raw) {
    const s = raw.trim(); if (!s) return; cmdEcho(s); past.unshift(s); histI = -1; const a = s.split(/\s+/), c = a[0].toLowerCase();
    try {
      if (c === 'help' || c === '?') { HELP.forEach(([k, v]) => out(`  <span class="vi">${k.padEnd(34, ' ')}</span><span class="dim">${v}</span>`)); return; }
      if (c === 'clear') { heroLog.innerHTML = ''; heroLog.dataset.fresh = '1'; return; }
      if (c === 'connect') { if (WAL.pk) return out(`already connected · ${WAL.pk}`); openSheet(); return; }
      if (c === 'disconnect') { if (!WAL.pk) return out('no wallet connected', 'dim'); try { await WAL.prov.disconnect(); } catch (e) {} setWallet(null); out('disconnected'); return; }
      if (c === 'whoami') { out(WAL.pk ? `${WAL.pk} <span class="dim">(${WAL.id})</span>` : 'not connected · type <b>connect</b>'); return; }
      if (c === 'quote') { const n = parseFloat(a[1]), t = (a[2] || 'sol').toLowerCase(); if (!(n > 0) || !/^(sol|usdc)$/.test(t)) return out('usage: quote 1 sol', 'bad');
        out('<span class="dim">></span> asking the solvers…'); const q = await api('quote', { from: t, to: t, amount: n, recipient: W3.Keypair.generate().publicKey.toBase58(), refundTo: WAL.pk || W3.Keypair.generate().publicKey.toBase58(), dry: true });
        out(`  sealed ${fmt(n)} ${t.toUpperCase()} → they get <b>${fmt(+q.amountOut, 6)} ${t.toUpperCase()}</b> · ~${q.timeEstimate || 20} s · fee ${Math.max(0, (1 - (+q.amountOut) / n) * 100).toFixed(2)}%`, 'ok'); return; }
      if (c === 'send' && a.length > 1) { const m = s.match(/^send\s+([\d.,]+)\s*(sol|usdc)?\s+(?:to\s+)?([1-9A-HJ-NP-Za-km-z]{32,44})(\s+--open)?\s*$/i);
        if (!m) return out('usage: send 0.1 sol to &lt;address&gt; [--open]', 'bad'); send.set(m[1].replace(',', '.'), (m[2] || 'sol').toLowerCase(), m[3], !m[4]); await send.run(heroLog); return; }
      if (c === 'link' && a.length > 1) { const n = parseFloat((a[1] || '').replace(',', '.')); if (!(n > 0)) return out('usage: link 0.05 [--sealed]', 'bad'); link.set(n, /--sealed/.test(s)); await link.run(heroLog); return; }
      if (c === 'claim' && a.length > 1) { claim.set(a[1]); out('<span class="dim">></span> link loaded in the claim panel'); go('#claim'); return; }
      if (c === 'live') { out('<span class="dim">></span> reading…'); const n = await live.load(); if (!n) return out('live data is offline', 'bad');
        out(`  sealed 1 SOL   → ${n.q.sol ? fmt(n.q.sol.out, 5) + ' SOL · ~' + (n.q.sol.t || 20) + ' s' : '—'}`); out(`  sealed 100 USDC → ${n.q.usdc ? fmt(n.q.usdc.out, 3) + ' USDC · ~' + (n.q.usdc.t || 20) + ' s' : '—'}`);
        out(`  SOL ${n.sol ? usd(n.sol) : '—'} · solana ${n.tps ? fmt(n.tps, 0) + ' tps' : '—'}`); return; }
      if (c === 'zends' || c === 'history') { const l = hist.load().slice(0, 6); if (!l.length) out('no zends yet', 'dim'); l.forEach(it => out(`  ${new Date(it.t).toLocaleDateString()}  ${(fmt(it.amount) + ' ' + it.token.toUpperCase()).padEnd(14, ' ')} ${it.mode === 'link' ? 'link' : '→ ' + short(it.to)}  <span class="dim">${it.sealed ? 'sealed' : 'open'} · ${it.status}</span>`)); if (a[1] !== '-q') go('#zends'); return; }
      const sec = { send: '#send', link: '#link', claim: '#claim', route: '#route', man: '#man', vs: '#vs', zelle: '#vs', faq: '#man' }[c]; if (sec) { go(sec); return; }
      out(`command not found: ${esc(c)} · type <b>help</b>`, 'bad');
    } catch (e) { out(`✕ ${esc(errText(e))}`, 'bad'); }
  }
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { const v = inp.value; inp.value = ''; exec(v); }
    else if (e.key === 'ArrowUp') { if (histI < past.length - 1) { histI++; inp.value = past[histI]; e.preventDefault(); } }
    else if (e.key === 'ArrowDown') { if (histI > 0) { histI--; inp.value = past[histI]; } else { histI = -1; inp.value = ''; } } });
  $$('#hints button').forEach(b => b.onclick = () => { const c = b.dataset.c; if (c === 'send') { inp.value = 'send 0.1 sol to '; inp.focus(); return; } exec(c); });
  addEventListener('keydown', e => { if (e.key === '/' && document.activeElement.tagName !== 'INPUT') { e.preventDefault(); inp.focus(); inp.scrollIntoView({ block: 'center' }); } });
  async function boot() { heroLog.dataset.fresh = '1'; const lines = ['<span class="dim">connecting to NEAR Intents solvers…</span>', '<span class="dim">reading Solana mainnet…</span>'];
    for (const l of lines) { out(l); await sleep(RM ? 0 : 260); }
    const n = await live.load(); out(n ? `<span class="ok">✓</span> sealed routes up · 1 SOL → ${n.q.sol ? fmt(n.q.sol.out, 5) : '—'} SOL · solana ${n.tps ? fmt(n.tps, 0) + ' tps' : 'online'}` : '<span class="warn">live data is offline right now; sends still work</span>');
    out('type <b>help</b>, or <b>send 0.1 sol to &lt;address&gt;</b>'); }
  return { exec, boot };
})();

// =================================================================== the little envelope that flies off on success
function fly(from) { if (RM || !from) return; const r = from.getBoundingClientRect(), e = document.createElement('pre'); e.textContent = '+------+\n|\\(Z)/|\n+------+';
  e.style.cssText = `position:fixed;z-index:70;left:${r.left + r.width / 2 - 40}px;top:${r.top + r.height / 2}px;margin:0;font:800 14px/1.1 'JetBrains Mono',monospace;color:#b49bff;pointer-events:none;transition:transform 1.1s cubic-bezier(.5,0,.2,1),opacity 1.1s`;
  document.body.appendChild(e); requestAnimationFrame(() => { e.style.transform = `translate(${innerWidth}px,-${r.top + 200}px) rotate(-14deg)`; e.style.opacity = '0'; }); setTimeout(() => e.remove(), 1300); }

// =================================================================== route animation, reveals, nav, faq, config
(() => {
  const ns = $$('#pipe .n'); let on = false, t0 = 0; const loop = now => { if (!on) return; const i = Math.floor(((now - t0) / 900) % 5); ns.forEach((n, k) => n.classList.toggle('on', k === i)); requestAnimationFrame(loop); };
  new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting && !RM; if (on && !was) { t0 = performance.now(); requestAnimationFrame(loop); } }).observe($('#pipe'));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -6% 0px' });
  $$('.rv').forEach(el => io.observe(el)); setTimeout(() => $$('.rv').forEach(el => el.classList.add('vis')), 5000);
  const links = $$('#nav a'); const so = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-45% 0px -50% 0px' });
  ['send', 'link', 'claim', 'route', 'live', 'zends', 'man'].forEach(id => so.observe($('#' + id)));
  $$('.q button').forEach(b => b.onclick = () => { const q = b.parentElement, open = q.classList.contains('open'); $$('.q.open').forEach(o => o.classList.remove('open')); if (!open) q.classList.add('open'); });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const t = $(a.getAttribute('href')); if (t) { e.preventDefault(); t.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); } }));
})();
(async () => { try { const c = await api('cfg'); if (c.sol && !NET.sol) NET.sol = c.sol;
  if (c.ca) { $('#caSlot').innerHTML = `<span class="dim">$ZEND</span><code>${esc(c.ca)}</code><button class="btn g sm" id="caCp">copy</button><a class="btn g sm" target="_blank" rel="noopener" href="https://pump.fun/coin/${c.ca}">buy</a><a class="btn g sm" target="_blank" rel="noopener" href="https://dexscreener.com/solana/${c.ca}">chart</a>${c.x ? `<a class="btn g sm" target="_blank" rel="noopener" href="${esc(c.x)}">𝕏</a>` : ''}`; $('#caCp').onclick = () => { navigator.clipboard.writeText(c.ca); toast('address copied'); }; }
} catch (e) {} })();

hist.render(); hist.poll(); setInterval(() => hist.poll(), 20000); silent(); setInterval(() => live.load(), 30000);
intro.done.then(() => cli.boot());
})();
