// ZEND API: a thin relay. It never holds keys or funds.
//   op=quote   POST {from,to,amount,recipient,refundTo,dry}  -> NEAR Intents 1Click quote (one-time deposit address)
//   op=status  ?dep=<deposit address>                         -> 1Click route status
//   op=submit  POST {txHash,depositAddress}                    -> tells 1Click the deposit is sent (faster pickup)
//   op=rpc     POST JSON-RPC (allow-listed reads + sendTransaction of an already-signed tx)
//   op=cfg                                                     -> { ca, x } and live SOL price
const ONECLICK = 'https://1click.chaindefuser.com/v0';
const RPCS = [process.env.RPC_URL, 'https://solana-rpc.publicnode.com', 'https://api.mainnet-beta.solana.com'].filter(Boolean);
const ASSET = { sol: { id: 'nep141:sol.omft.near', dec: 9 }, usdc: { id: 'nep141:sol-5ce3bf3a31af18be40ba30f721101b4341690186.omft.near', dec: 6 } };
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ALLOW = new Set(['getSlot', 'getEpochInfo', 'getSignaturesForAddress', 'getTransaction', 'getRecentPerformanceSamples', 'getRecentPrioritizationFees', 'getLatestBlockhash', 'getBalance', 'getAccountInfo', 'getTokenAccountsByOwner', 'getSignatureStatuses', 'getMinimumBalanceForRentExemption', 'sendTransaction', 'getFeeForMessage', 'getTokenAccountBalance']);
const err = (res, code, msg) => res.status(code).json({ error: msg });
const body = req => { if (req.body && typeof req.body === 'object') return req.body; try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; } };
async function rpc(payload) {
  let last; for (const u of RPCS) { try { const r = await fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(12000) });
    if (r.status === 429 || r.status >= 500) { last = new Error('rpc ' + r.status); continue; } return await r.json(); } catch (e) { last = e; } }
  throw last || new Error('rpc down');
}
module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  const op = (req.query && req.query.op) || '';
  try {
    if (op === 'cfg') {
      let sol = null; try { const j = await (await fetch('https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112', { signal: AbortSignal.timeout(6000) })).json(); sol = +(j.So11111111111111111111111111111111111111112 || {}).usdPrice || null; } catch (e) {}
      res.setHeader('cache-control', 's-maxage=30, stale-while-revalidate=120');
      return res.status(200).json({ ca: (process.env.ZEND_CA || '').trim() || null, x: (process.env.ZEND_X || '').trim() || null, sol });
    }
    if (op === 'net') { // live numbers for the terminal: sealed rates, SOL price, Solana TPS and fees
      const DUMMY = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
      const dq = async (from, amount) => { const t0 = Date.now(); const r = await fetch(ONECLICK + '/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(15000), body: JSON.stringify({ dry: true, swapType: 'EXACT_INPUT', slippageTolerance: 100, originAsset: ASSET[from].id, depositType: 'ORIGIN_CHAIN', destinationAsset: ASSET[from].id, amount: String(BigInt(Math.round(amount * 10 ** ASSET[from].dec))), refundTo: DUMMY, refundType: 'ORIGIN_CHAIN', recipient: DUMMY, recipientType: 'DESTINATION_CHAIN', deadline: new Date(Date.now() + 30 * 60000).toISOString(), referral: 'zend', quoteWaitingTimeMs: 3000 }) }); const j = await r.json(); return { in: amount, out: +j.quote.amountOutFormatted, t: j.quote.timeEstimate || null, ms: Date.now() - t0 }; };
      const [a, b, perf, fees, px] = await Promise.all([dq('sol', 1).catch(() => null), dq('usdc', 100).catch(() => null), rpc({ jsonrpc: '2.0', id: 1, method: 'getRecentPerformanceSamples', params: [6] }).catch(() => null), rpc({ jsonrpc: '2.0', id: 2, method: 'getRecentPrioritizationFees', params: [] }).catch(() => null),
        fetch('https://lite-api.jup.ag/price/v3?ids=So11111111111111111111111111111111111111112', { signal: AbortSignal.timeout(6000) }).then(r => r.json()).catch(() => null)]);
      const ps = (perf && perf.result) || [], tps = ps.length ? Math.round(ps.reduce((x, y) => x + y.numTransactions, 0) / ps.reduce((x, y) => x + y.samplePeriodSecs, 0)) : null;
      const fl = ((fees && fees.result) || []).map(f => f.prioritizationFee).sort((x, y) => x - y), med = fl.length ? fl[Math.floor(fl.length / 2)] : null;
      res.setHeader('cache-control', 's-maxage=20, stale-while-revalidate=60');
      return res.status(200).json({ at: new Date().toISOString(), sol: px ? +(px.So11111111111111111111111111111111111111112 || {}).usdPrice || null : null, tps, prio: med, q: { sol: a, usdc: b } });
    }
    if (op === 'quote') {
      if (req.method !== 'POST') return err(res, 405, 'POST only');
      const b = body(req), from = ASSET[b.from], to = ASSET[b.to || b.from];
      if (!from || !to) return err(res, 400, 'token must be sol or usdc');
      const amount = Number(b.amount); if (!(amount > 0)) return err(res, 400, 'enter an amount');
      if ((b.from === 'sol' ? amount * 250 : amount) > 100000) return err(res, 400, 'that is too large for one zend');
      const recipient = String(b.recipient || '').trim(), refundTo = String(b.refundTo || '').trim();
      if (!B58.test(recipient)) return err(res, 400, 'that is not a Solana address');
      if (!B58.test(refundTo)) return err(res, 400, 'connect a wallet first');
      const units = BigInt(Math.round(amount * 10 ** Math.min(from.dec, 9)));
      const r = await fetch(ONECLICK + '/quote', { method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(25000), body: JSON.stringify({
        dry: !!b.dry, swapType: 'EXACT_INPUT', slippageTolerance: 100, originAsset: from.id, depositType: 'ORIGIN_CHAIN', destinationAsset: to.id,
        amount: units.toString(), refundTo, refundType: 'ORIGIN_CHAIN', recipient, recipientType: 'DESTINATION_CHAIN', deadline: new Date(Date.now() + 45 * 60000).toISOString(), referral: 'zend', quoteWaitingTimeMs: 3000 }) });
      const j = await r.json().catch(() => null);
      if (!r.ok || !j || !j.quote) return err(res, r.status === 400 ? 400 : 502, String((j && (j.message || j.error)) || 'the solvers did not return a quote').slice(0, 160));
      const q = j.quote; if (!b.dry && !q.depositAddress) return err(res, 502, 'no deposit address came back');
      return res.status(200).json({ depositAddress: q.depositAddress || null, amountIn: q.amountInFormatted, amountInUsd: q.amountInUsd, amountOut: q.amountOutFormatted, amountOutUsd: q.amountOutUsd, units: units.toString(), timeEstimate: q.timeEstimate || null, deadline: q.deadline || null });
    }
    if (op === 'status') {
      const dep = String((req.query && req.query.dep) || ''); if (!B58.test(dep)) return err(res, 400, 'bad deposit address');
      const r = await fetch(ONECLICK + '/status?depositAddress=' + encodeURIComponent(dep), { signal: AbortSignal.timeout(12000) });
      const j = await r.json().catch(() => null), sd = (j && j.swapDetails) || {};
      const out = (sd.destinationChainTxHashes || []).map(t => t.hash).filter(Boolean), inn = (sd.originChainTxHashes || []).map(t => t.hash).filter(Boolean);
      return res.status(200).json({ status: (j && j.status) || 'UNKNOWN', out, in: inn, amountOut: sd.amountOutFormatted || null });
    }
    if (op === 'submit') {
      if (req.method !== 'POST') return err(res, 405, 'POST only');
      const b = body(req); if (!B58.test(String(b.depositAddress || '')) || !/^[1-9A-HJ-NP-Za-km-z]{60,100}$/.test(String(b.txHash || ''))) return err(res, 400, 'bad submit');
      const r = await fetch(ONECLICK + '/deposit/submit', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ txHash: b.txHash, depositAddress: b.depositAddress }), signal: AbortSignal.timeout(12000) });
      return res.status(200).json({ ok: r.ok });
    }
    if (op === 'rpc') {
      if (req.method !== 'POST') return err(res, 405, 'POST only');
      const b = body(req), list = Array.isArray(b) ? b : [b];
      if (!list.length || list.length > 20 || list.some(x => !x || !ALLOW.has(x.method))) return err(res, 400, 'method not allowed');
      if (Array.isArray(b)) return res.status(200).json(await Promise.all(list.map(x => rpc(x).catch(e => ({ jsonrpc: '2.0', id: x.id, error: { code: -32000, message: String(e.message || e) } })))));   // fan a batch out: some public RPCs refuse batches
      return res.status(200).json(await rpc(b));
    }
    return err(res, 404, 'unknown op');
  } catch (e) { return err(res, 502, String(e.message || e).slice(0, 160)); }
};
