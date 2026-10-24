/* global __dirname */
// Explicit source allowlist: never publish the workspace or its Git history.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = ['README.md', 'LICENSE', '.gitignore', 'AGENTS.md', 'app.json', 'App.tsx', 'index.ts', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json', 'eslint.config.js', 'eas.json', 'render.yaml', 'FOOD_DATA_SOURCES.md', 'BACKEND_SETUP.md'];
function walk(dir, allowed) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const file = `${dir}/${entry.name}`;
    if (entry.isDirectory()) { if (!['node_modules', 'data'].includes(entry.name)) walk(file, allowed); }
    else if (allowed(file)) files.push(file);
  }
}
walk('src', file => /\.(tsx?|json)$/.test(file));
walk('assets', file => /\.(png|svg)$/.test(file));
walk('server', file => /\.(mjs|json|yaml)$/.test(file) || file === 'server/.env.example');
walk('scripts', file => /\/(check-.*\.cjs|import-.*\.(cjs|py)|prepare-publication\.cjs)$/.test(file));
for (const file of files) {
  if (/\.(png)$/.test(file)) continue;
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  if (/(?:AIza[\w-]{30,}|gsk_[\w]{30,}|sk-(?:proj-)?[\w-]{30,}|-----BEGIN (?:RSA |OPENSSH )?PRIVATE KEY-----)/.test(content)) throw Error(`Potential secret: ${file}`);
}
const report = files.sort().map(file => ({ path: file, bytes: fs.statSync(path.join(root, file)).size, binary: file.endsWith('.png') }));
console.log(JSON.stringify(report));
