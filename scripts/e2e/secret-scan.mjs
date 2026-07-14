import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve('tests/e2e');
const extensions = new Set(['.ts', '.tsx', '.js', '.mjs', '.json', '.md']);
const ignored = new Set(['.png', '.csv']);
const findings = [];
const patterns = [
  { name: 'credential fallback', re: /(?:admin@dvi\.co\.in|Keerthi@|process\.env\.(?:E2E_USER|E2E_PASSWORD|E2E_VENDOR_USER|E2E_VENDOR_PASSWORD|E2E_HOTSPOT_USER|E2E_HOTSPOT_PASSWORD|PROD_EMAIL|PROD_PASSWORD))/i },
  { name: 'production host', re: /https?:\/\/(?:www\.)?dvi\.travel/i },
  { name: 'authorization token logging', re: /console\.(?:log|info|debug|warn|error).*\b(?:token|password|secret|authorization)\b/i },
  { name: 'literal secret assignment', re: /(?:password|secret|apiKey|api_key)\s*[:=]\s*['"][^'"]{6,}['"]/i },
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (extensions.has(path.extname(entry.name)) && !ignored.has(path.extname(entry.name))) scan(file);
  }
}

function scan(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const pattern of patterns) {
      if (pattern.re.test(line)) {
        const relativeFile = path.relative(process.cwd(), file).replaceAll('\\', '/');
        findings.push({ file: relativeFile, line: index + 1, category: pattern.name, quarantined: relativeFile.includes('/quarantine/') || relativeFile.includes('/external-sandbox/') || relativeFile.includes('/legacy-environment/') });
        break;
      }
    }
  });
}

walk(root);
const blockingFindings = findings.filter((finding) => !finding.quarantined);
if (blockingFindings.length) {
  console.error(JSON.stringify({ passed: false, findings }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ passed: true, scannedRoot: 'tests/e2e', warnings: findings }, null, 2));
}
