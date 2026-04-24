/**
 * Node16/NodeNext resolution requires explicit extensions in relative imports inside .d.ts.
 * vite-plugin-dts emits extensionless paths; append `.js` (TS maps it to the sibling .d.ts).
 */
import fs from 'node:fs';
import path from 'node:path';

const dist = path.resolve('dist');

function fixSource(source) {
  return source.replace(/from\s+(['"])(\.\/[^'"]+)\1/g, (full, q, spec) => {
    if (spec.endsWith('.js')) return full;
    return `from ${q}${spec}.js${q}`;
  });
}

for (const name of fs.readdirSync(dist)) {
  if (!name.endsWith('.d.ts')) continue;
  const p = path.join(dist, name);
  const before = fs.readFileSync(p, 'utf8');
  const after = fixSource(before);
  if (after !== before) fs.writeFileSync(p, after);
}
