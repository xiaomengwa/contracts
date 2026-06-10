/**
 * Source-inspection test: verifies that the OpenAPI spec covers all
 * management API routes registered in main.go.
 *
 * Run: node scripts/check-paths.mjs
 */
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// 1. Extract paths from main.go
const mainGo = fs.readFileSync(path.join(root, '../manager/cmd/management/main.go'), 'utf-8');
const goRoutes = [...mainGo.matchAll(/mux\.HandleFunc\("(\w+) (\/api\/v1\/\S+)"/g)]
  .map(m => ({ method: m[1], path: m[2] }));

// 2. Extract paths from bundled.yaml
const bundled = yaml.load(fs.readFileSync(path.join(root, 'bundled.yaml'), 'utf-8'));
const specPaths = Object.keys(bundled.paths || {});

// 3. Check coverage
const missing = goRoutes.filter(r => !specPaths.includes(r.path));
const extra = specPaths.filter(p => !goRoutes.some(r => r.path === p));

if (missing.length > 0) {
  console.error('❌ Routes in main.go but NOT in OpenAPI spec:');
  for (const r of missing) {
    console.error(`   ${r.method} ${r.path}`);
  }
}

if (extra.length > 0) {
  console.warn('⚠️  Paths in OpenAPI spec but NOT in main.go:');
  for (const p of extra) {
    console.warn(`   ${p}`);
  }
}

if (missing.length === 0) {
  console.log(`✅ All ${goRoutes.length} management API routes are covered by the OpenAPI spec`);
} else {
  process.exit(1);
}
