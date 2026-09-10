import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const roots = ['js', 'tools'];
const ignorar = new Set(['node_modules']);
const arquivos = [];

function visitar(dir) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ignorar.has(ent.name)) continue;
    const p = join(dir, ent.name);
    if (ent.isDirectory()) visitar(p);
    else if (/\.(?:js|mjs)$/.test(ent.name)) arquivos.push(p);
  }
}

for (const root of roots) visitar(root);
arquivos.sort();
for (const arquivo of arquivos) {
  const r = spawnSync(process.execPath, ['--check', arquivo], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
console.log(`Sintaxe OK: ${arquivos.length} arquivos JS/MJS.`);
