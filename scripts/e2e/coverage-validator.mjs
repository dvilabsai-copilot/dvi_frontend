import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('tests/e2e/coverage');
const required = [
  'route-inventory.json',
  'page-inventory.json',
  'control-inventory.json',
  'api-inventory.json',
  'existing-test-classification.json',
  'coverage-matrix.json',
];
const errors = [];
for (const file of required) {
  const target = path.join(root, file);
  if (!fs.existsSync(target)) errors.push(`missing inventory: ${file}`);
}

function checkReferences(fileName, selector) {
  const target = path.join(root, fileName);
  if (!fs.existsSync(target)) return;
  const value = JSON.parse(fs.readFileSync(target, 'utf8'));
  for (const item of value) {
    if (item.status !== 'covered') continue;
    const references = selector(item);
    for (const reference of references) {
      if (!fs.existsSync(path.resolve(reference))) errors.push(`${fileName}: covered reference missing: ${reference}`);
    }
  }
}

function checkExistingReferences(fileName, selector) {
  const target = path.join(root, fileName);
  if (!fs.existsSync(target)) return;
  const value = JSON.parse(fs.readFileSync(target, 'utf8'));
  for (const item of value) {
    for (const reference of selector(item)) {
      if (!fs.existsSync(path.resolve(reference))) errors.push(`${fileName}: referenced test missing: ${reference}`);
    }
  }
}
checkReferences('route-inventory.json', (item) => item.pageLoadTest ? [item.pageLoadTest] : []);
checkExistingReferences('route-inventory.json', (item) => Object.values(item.rolePageLoadTests ?? {}));
checkReferences('page-inventory.json', (item) => item.pageLoadTest ? [item.pageLoadTest] : []);
checkExistingReferences('page-inventory.json', (item) => Object.values(item.rolePageLoadTests ?? {}));
checkReferences('control-inventory.json', (item) => item.testSpec ? [item.testSpec] : []);
checkReferences('api-inventory.json', (item) => item.testSpec ? [item.testSpec] : []);
checkExistingReferences('api-inventory.json', (item) => [...(item.uiWorkflowTests ?? []), ...(item.apiOnlyTests ?? []), ...(item.consumerWorkflowTests ?? [])]);

const routeInventoryPath = path.join(root, 'route-inventory.json');
if (fs.existsSync(routeInventoryPath)) {
  const routes = JSON.parse(fs.readFileSync(routeInventoryPath, 'utf8'));
  for (const route of routes) {
    if (route.dynamicParameters?.length && !route.fixtureRequirements?.length && !['redirect', 'unreachable'].includes(route.status)) {
      errors.push(`route-inventory.json: dynamic route lacks fixture requirements: ${route.path}`);
    }
  }
}

const apiInventoryPath = path.join(root, 'api-inventory.json');
if (fs.existsSync(apiInventoryPath)) {
  const apis = JSON.parse(fs.readFileSync(apiInventoryPath, 'utf8'));
  for (const api of apis) {
    if (api.status === 'covered' && api.classification === 'ui-reachable' && !(api.uiWorkflowTests ?? []).length) {
      errors.push(`api-inventory.json: UI-reachable API marked covered without UI workflow: ${api.method} ${api.path}`);
    }
  }
}

const matrixPath = path.join(root, 'coverage-matrix.json');
if (fs.existsSync(matrixPath)) {
  const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
  const inventories = {
    routes: 'route-inventory.json',
    pages: 'page-inventory.json',
    controls: 'control-inventory.json',
    apis: 'api-inventory.json',
  };
  for (const [key, fileName] of Object.entries(inventories)) {
    const target = path.join(root, fileName);
    if (!fs.existsSync(target)) continue;
    const inventory = JSON.parse(fs.readFileSync(target, 'utf8'));
    if (matrix[key]?.total !== inventory.length) errors.push(`coverage-matrix.json: ${key}.total does not match ${fileName}`);
  }
  if (matrix.apis?.uiReachable?.total !== undefined) {
    const apiInventory = JSON.parse(fs.readFileSync(path.join(root, 'api-inventory.json'), 'utf8'));
    const expected = apiInventory.filter((item) => item.classification === 'ui-reachable').length;
    if (matrix.apis.uiReachable.total !== expected) errors.push('coverage-matrix.json: apis.uiReachable.total is stale');
  }
}

const strict = process.env.E2E_COVERAGE_STRICT === 'true';
for (const fileName of ['route-inventory.json', 'page-inventory.json', 'control-inventory.json', 'api-inventory.json']) {
  const target = path.join(root, fileName);
  if (!fs.existsSync(target)) continue;
  const value = JSON.parse(fs.readFileSync(target, 'utf8'));
  const uncovered = value.filter((item) => ['uncovered', 'unknown', 'blocked'].includes(item.status));
  const blocked = value.filter((item) => item.status === 'blocked').length;
  if (strict && uncovered.length) errors.push(`${fileName}: ${uncovered.length} items are not covered (${blocked} blocked)`);
  for (const item of value) {
    if (item.status === 'blocked' && !item.blockerReason) {
      errors.push(`${fileName}: blocked item lacks blockerReason: ${item.path ?? item.actionId ?? item.pageId ?? item.method}`);
    }
  }
}
const classificationPath = path.join(root, 'existing-test-classification.json');
if (strict && fs.existsSync(classificationPath)) {
  const classifications = JSON.parse(fs.readFileSync(classificationPath, 'utf8'));
  const cleanupMissing = classifications.filter((item) => !['quarantine', 'blocked'].includes(item.classification) && item.destructiveActions?.length && !item.cleanupAvailable).length;
  if (cleanupMissing) errors.push(`existing-test-classification.json: ${cleanupMissing} destructive files lack cleanup evidence`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  const matrix = JSON.parse(fs.readFileSync(path.join(root, 'coverage-matrix.json'), 'utf8'));
  console.log(`E2E coverage inventory validation passed: routes=${matrix.routes.total}, pages=${matrix.pages.total}, controls=${matrix.controls.total}, api=${matrix.apis.total}`);
  console.log(`Verified coverage: routes=${matrix.routes.covered ?? 0}, pages=${matrix.pages.covered ?? 0}, controls=${matrix.controls.covered ?? 0}, api=${matrix.apis.covered ?? 0}`);
  console.log(`UI-reachable API workflow evidence: ${matrix.apis.uiReachable.withUiWorkflowEvidence}/${matrix.apis.uiReachable.total}`);
  console.log(`UI-reachable API owning-page evidence: ${matrix.apis.uiReachable.withConsumerWorkflowEvidence}/${matrix.apis.uiReachable.total}`);
}
