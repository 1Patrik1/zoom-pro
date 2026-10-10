#!/usr/bin/env node
// Stabilita / zátěž — spusť: BASE=http://localhost:5000 node scripts/audit-stability.mjs [počet] [paralelně]
const BASE = process.env.BASE || 'http://localhost:5000';
const BACKEND_URL_CHECK = process.env.BASE_URL || '';
async function assertBackendUp() {
  try { const h = await fetch(`${BASE}/health`); if (h.ok) return; } catch {}
  console.error(`\n❌ BACKEND_DOWN: backend neběží na ${BASE} — spusť npm run dev (nebo bash scripts/audit-all.sh, který ho spustí sám).`);
  process.exit(2);
}
const TOTAL = Number(process.argv[2] || 200);
const CONCURRENCY = Number(process.argv[3] || 20);

console.log(`Zátěžový test: ${TOTAL} požadavků na ${BASE}/health, paralelně ${CONCURRENCY}\n`);

const lat = [];
let ok = 0, fail = 0;
const started = Date.now();

async function worker(queue) {
  while (queue.length) {
    queue.pop();
    const t0 = performance.now();
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) ok += 1; else fail += 1;
    } catch { fail += 1; }
    lat.push(performance.now() - t0);
  }
}

const queue = Array.from({ length: TOTAL }, (_, i) => i);
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(queue)));

const totalMs = Date.now() - started;
lat.sort((a, b) => a - b);
const p = (q) => lat[Math.floor(lat.length * q)]?.toFixed(1);

console.log('=== STABILITA ===');
console.log(`  Úspěšných: ${ok}/${TOTAL} (${((ok / TOTAL) * 100).toFixed(1)} %)`);
console.log(`  Chyb: ${fail}`);
console.log(`  Celkový čas: ${totalMs} ms (${(TOTAL / (totalMs / 1000)).toFixed(0)} req/s)`);
console.log(`  Latence p50: ${p(0.5)} ms · p95: ${p(0.95)} ms · p99: ${p(0.99)} ms · max: ${lat[lat.length - 1]?.toFixed(1)} ms`);

if (fail / TOTAL > 0.01) { console.log('\n❌ Míra chyb > 1 % — nestabilní'); process.exit(1); }
if (Number(p(0.95)) > 1000) { console.log('\n⚠️  p95 > 1000 ms — pomalé'); }
console.log('\n✅ Stabilita OK');
