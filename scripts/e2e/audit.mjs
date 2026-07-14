import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve('tests/e2e');
const files = [];
const walk = (dir) => { for (const entry of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, entry.name); if (entry.isDirectory()) walk(file); else files.push(file); } };
walk(root);
const specs = files.filter((file) => file.endsWith('.spec.ts'));
const declarations = specs.reduce((count, file) => count + fs.readFileSync(file, 'utf8').split(/\r?\n/).filter((line) => /(^|\s)(?:test|it)\s*\(/.test(line)).length, 0);
const inventory = JSON.parse(fs.readFileSync(path.join(root, 'coverage/route-inventory.json'), 'utf8'));
const classification = JSON.parse(fs.readFileSync(path.join(root, 'coverage/existing-test-classification.json'), 'utf8'));
const status = execFileSync('git', ['status', '--short', '--branch'], { encoding: 'utf8' }).trim();
console.log(JSON.stringify({ files: files.length, specs: specs.length, testDeclarations: declarations, routes: inventory.length, uniqueRoutes: new Set(inventory.map((item) => item.path)).size, classifications: classification.length, status }, null, 2));
