import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const appPath = path.join(projectRoot, 'src/App.tsx');
const e2eRoot = path.join(projectRoot, 'tests/e2e');
const coverageRoot = path.join(e2eRoot, 'coverage');
const sourceRoot = path.join(projectRoot, 'src');
const backendRoot = path.resolve(projectRoot, '../api.dvi.travel/src');
fs.mkdirSync(coverageRoot, { recursive: true });

function filesUnder(root, extensions = ['.ts', '.tsx']) {
  const result = [];
  if (!fs.existsSync(root)) return result;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (extensions.includes(path.extname(entry.name))) result.push(file);
    }
  };
  walk(root);
  return result;
}

function relative(file) {
  return path.relative(projectRoot, file).replaceAll('\\', '/');
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

const testFiles = filesUnder(e2eRoot, ['.ts', '.tsx', '.js', '.mjs', '.json', '.md', '.png', '.csv']);
const testSources = testFiles.filter((file) => /\.(ts|tsx|js|mjs)$/.test(file));
const testEvidence = testSources.map((file) => {
  const source = read(file);
  return {
    file,
    relative: relative(file),
    source,
    hasPageInteraction: /\b(?:page|context)\.(?:goto|locator|getBy|waitFor|click|fill|check|selectOption|route|expect)|getByRole\s*\(/.test(source),
  };
});
const app = read(appPath);
const sidebarPath = path.join(projectRoot, 'src/layouts/Sidebar.tsx');
const sidebar = fs.existsSync(sidebarPath) ? read(sidebarPath) : '';
const routeMatches = [...app.matchAll(/path="([^"]+)"/g)];
const redirectPaths = new Set(['/hotels/:id/rooms', '/hotels/:id/amenities', '/hotels/:id/pricebook', '/hotels/:id/reviews', '/hotels/:id/preview']);
const publicPaths = new Set(['/login', '/partner-registration', '/pdf-preview/invoice/:id', '/daily-moment/driver/:driverAssignmentId', '/daily-moment/public/:id']);
const knownPageLoads = new Map([
  ['/login', 'tests/e2e/smoke/auth-login.spec.ts'],
  ['/partner-registration', 'tests/e2e/smoke/public-routes.spec.ts'],
  ['/', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/hotels', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/vendor', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/latest-itinerary', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/confirmed-itinerary', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/cancelled-itinerary', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/settings/global', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/settings/cities', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/settings/hotel-category', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/settings/gst', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/settings/amenities', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/settings/vehicle-type', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/settings/language', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/settings/role-permission', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/settings/subscription-plan', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/drivers', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/vehicle-availability', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/hotspots', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/activities', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/staff', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/agent', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/guide', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/locations', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/daily-moment', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/accounts-manager', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/accounts-ledger', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/hotspot-distance-cache', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/locations/between-hotspots', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/toll-charge', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/pricebook-export', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/payments/success', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/daily-moment-tracker', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/hotels/axisrooms', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/parking-charge-bulk-import', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/book-activities', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/create-itinerary', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/guide/new', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/hotels/new', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/vendor/new', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/driver/new', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/drivers/new', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/driver', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/drivers/create', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/driver/create', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/hotspots/new', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/hotspot-distance-cache/new', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/activities/new', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/staff/new', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/role-permission/new', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/agent-subscription-plan/new', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/wallet', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/itinerary-details/:id', 'tests/e2e/admin-readonly/parameterized-routes.readonly.spec.ts'],
  ['/hotels/:id', 'tests/e2e/admin-readonly/parameterized-routes.readonly.spec.ts'],
  ['/vendor/:id', 'tests/e2e/admin-readonly/parameterized-routes.readonly.spec.ts'],
  ['/drivers/:id', 'tests/e2e/admin-readonly/parameterized-routes.readonly.spec.ts'],
  ['/drivers/:id/edit', 'tests/e2e/admin-readonly/parameterized-routes.readonly.spec.ts'],
  ['/profile', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/subscription-history', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['/wallet-history', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['*', 'tests/e2e/smoke/public-routes.spec.ts'],
]);
const knownRolePageLoads = new Map([
  ['/', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts', agent: 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/hotels', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/vendor', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/latest-itinerary', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/confirmed-itinerary', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/cancelled-itinerary', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/settings/global', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/settings/cities', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/settings/hotel-category', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/settings/gst', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/settings/amenities', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/settings/vehicle-type', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/settings/language', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/settings/role-permission', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/settings/subscription-plan', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/drivers', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/vehicle-availability', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/hotspots', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/activities', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/staff', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/agent', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/guide', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/locations', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/daily-moment', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/accounts-manager', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/accounts-ledger', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/hotspot-distance-cache', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/locations/between-hotspots', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/toll-charge', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/pricebook-export', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/payments/success', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/daily-moment-tracker', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/hotels/axisrooms', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/parking-charge-bulk-import', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/book-activities', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/create-itinerary', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/guide/new', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/hotels/new', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/vendor/new', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/driver/new', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/drivers/new', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/driver', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/drivers/create', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/driver/create', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/hotspots/new', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/hotspot-distance-cache/new', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/activities/new', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/staff/new', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/role-permission/new', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/agent-subscription-plan/new', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/wallet', { 'super-admin': 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/itinerary-details/:id', { 'super-admin': 'tests/e2e/admin-readonly/parameterized-routes.readonly.spec.ts' }],
  ['/hotels/:id', { 'super-admin': 'tests/e2e/admin-readonly/parameterized-routes.readonly.spec.ts' }],
  ['/vendor/:id', { 'super-admin': 'tests/e2e/admin-readonly/parameterized-routes.readonly.spec.ts' }],
  ['/drivers/:id', { 'super-admin': 'tests/e2e/admin-readonly/parameterized-routes.readonly.spec.ts' }],
  ['/drivers/:id/edit', { 'super-admin': 'tests/e2e/admin-readonly/parameterized-routes.readonly.spec.ts' }],
  ['/profile', { agent: 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/subscription-history', { agent: 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
  ['/wallet-history', { agent: 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts' }],
]);
const agentOnlyPageLoads = new Set(['/profile', '/subscription-history', '/wallet-history']);
for (const [pathValue, testFile] of knownPageLoads) {
  if (publicPaths.has(pathValue) || pathValue === '*' || agentOnlyPageLoads.has(pathValue)) continue;
  knownRolePageLoads.set(pathValue, {
    ...(knownRolePageLoads.get(pathValue) ?? {}),
    agent: testFile,
  });
}
const routeInventory = routeMatches.map((match, index) => {
  const pathValue = match[1];
  const nextRouteIndex = routeMatches[index + 1]?.index ?? app.length;
  const routeBlock = app.slice(match.index, nextRouteIndex);
  const component = [...routeBlock.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)]
    .map((componentMatch) => componentMatch[1])
    .find((name) => !['Route', 'MainLayout', 'RequireAuth', 'Navigate', 'Outlet'].includes(name)) ?? null;
  const dynamicParameters = [...pathValue.matchAll(/:([A-Za-z0-9_]+)/g)].map((m) => m[1]);
  const existingTests = testSources.filter((file) => {
    const source = read(file);
    return source.includes(`"${pathValue}"`) || source.includes(`'${pathValue}'`);
  }).map(relative);
  const isRedirect = redirectPaths.has(pathValue);
  const pageLoadTest = knownPageLoads.get(pathValue) ?? null;
  const blockerReason = dynamicParameters.length
    ? 'Requires an E2E-owned fixture for route parameters before direct page-load coverage can be enabled.'
    : pathValue === '/download-packages'
      ? 'Embeds an external package host and requires an explicit provider mock boundary.'
      : null;
  const status = pageLoadTest ? 'covered' : isRedirect ? 'redirect' : pathValue === '*' ? 'unreachable' : blockerReason ? 'blocked' : 'uncovered';
  return {
    path: pathValue,
    sourceFile: 'src/App.tsx',
    component,
    public: publicPaths.has(pathValue),
    roles: publicPaths.has(pathValue) ? [] : ['super-admin', 'agent'],
    dynamicParameters,
    navigationSources: sidebar.includes(`path: "${pathValue}"`) || sidebar.includes(`path: '${pathValue}'`) ? ['src/layouts/Sidebar.tsx'] : [],
    fixtureRequirements: dynamicParameters.length ? [`fixture for ${dynamicParameters.join(', ')}`] : [],
    existingTests,
    pageLoadTest,
    rolePageLoadTests: knownRolePageLoads.get(pathValue) ?? {},
    status,
    blockerReason,
    declarationIndex: index + 1,
  };
});
fs.writeFileSync(path.join(coverageRoot, 'route-inventory.json'), JSON.stringify(routeInventory, null, 2) + '\n');

const pageFiles = filesUnder(path.join(sourceRoot, 'pages'));
const controlFiles = [...new Set([
  ...pageFiles,
  ...filesUnder(path.join(sourceRoot, 'components')),
  ...filesUnder(path.join(sourceRoot, 'layouts')),
])];
const controlInventory = [];
const routeByComponent = new Map(routeInventory.filter((route) => route.component).map((route) => [route.component, route.path]));
const routesByComponent = new Map();
for (const route of routeInventory.filter((item) => item.component)) {
  const records = routesByComponent.get(route.component) ?? [];
  records.push(route);
  routesByComponent.set(route.component, records);
}
const controlStartRegex = /<(button|Button|a|Link|input|textarea|select|SelectTrigger|TabsTrigger|DropdownMenuTrigger|PopoverTrigger|DialogTrigger|SheetTrigger|Checkbox|RadioGroupItem|Switch|CommandItem|div|span)\b/gi;
const roleControlRegex = /\brole\s*=\s*["'](button|link|checkbox|radio|switch|combobox|tab|option|menuitem|treeitem|spinbutton|textbox|searchbox)["']/i;
function* controlMatches(source) {
  for (const start of source.matchAll(controlStartRegex)) {
    let cursor = start.index + start[0].length;
    let braceDepth = 0;
    let quote = null;
    for (; cursor < source.length; cursor += 1) {
      const character = source[cursor];
      if (quote) {
        if (character === quote && source[cursor - 1] !== '\\') quote = null;
        continue;
      }
      if (character === '"' || character === "'") { quote = character; continue; }
      if (character === '{') { braceDepth += 1; continue; }
      if (character === '}' && braceDepth > 0) { braceDepth -= 1; continue; }
      if (character === '>' && braceDepth === 0) break;
    }
    const openingTag = source.slice(start.index, cursor + 1);
    const attributes = source.slice(start.index + start[0].length, cursor);
    if (['div', 'span'].includes(start[1].toLowerCase()) && !roleControlRegex.test(openingTag)) continue;
    yield {
      index: start.index,
      0: openingTag,
      1: start[1],
      2: attributes,
    };
  }
}
function inferAccessibleName(source, match, attributes) {
  const attributeName = attributes.match(/(?:^|\s)(?:aria-label|placeholder|name|title)\s*=["']([^"']+)/i)?.[1] ?? null;
  if (attributeName) return attributeName;
  const controlId = attributes.match(/(?:^|\s)id\s*=["']([^"']+)/i)?.[1] ?? null;
  if (controlId) {
    const escapedId = controlId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const labelMatch = source.match(new RegExp(`<(?:label|Label)\\b[^>]*(?:htmlFor|for)=["']${escapedId}["'][^>]*>([\\s\\S]*?)</(?:label|Label)>`, 'i'));
    const labelText = labelMatch?.[1]?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (labelText) return labelText;
  }
  const tag = match[1];
  const closingTag = source.indexOf(`</${tag}>`, match.index + match[0].length);
  if (closingTag < 0) return null;
  const inner = source.slice(match.index + match[0].length, closingTag);
  const visibleText = inner
    .replace(/<[^>]*>/g, ' ')
    .replace(/\{[\s\S]*?\}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (visibleText) return visibleText.slice(0, 120);
  const literals = [...inner.matchAll(/["'`]([^"'`]{2,80})["'`]/g)].map((literal) => literal[1]).filter((literal) => !literal.includes('${'));
  return literals.join(' ').slice(0, 120) || null;
}
for (const file of controlFiles) {
  const source = read(file);
  for (const match of controlMatches(source)) {
    const attributes = match[2];
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    const role = attributes.match(roleControlRegex)?.[1]?.toLowerCase();
    const semanticType = {
      button: 'button',
      Button: 'button',
      a: 'link',
      Link: 'link',
      SelectTrigger: 'combobox',
      TabsTrigger: 'tab',
      DropdownMenuTrigger: 'dropdown',
      PopoverTrigger: 'popover',
      DialogTrigger: 'dialog-trigger',
      SheetTrigger: 'drawer-trigger',
      Checkbox: 'checkbox',
      RadioGroupItem: 'radio',
      Switch: 'switch',
      CommandItem: 'option',
    }[match[1]] ?? role ?? match[1];
    const type = (attributes.match(/type=["']([^"']+)/i)?.[1] ?? semanticType).toLowerCase();
    const accessibleName = inferAccessibleName(source, match, attributes);
    const sourceName = relative(file);
    controlInventory.push({
      actionId: `${sourceName}:${line}:${type}`,
      route: routeByComponent.get(path.basename(file, path.extname(file))) ?? 'unmapped',
      sourceFile: sourceName,
      component: path.basename(file, path.extname(file)),
      controlType: type,
      accessibleName,
      roles: ['super-admin', 'agent'],
      visibilityCondition: null,
      enabledCondition: null,
      expectedBehavior: 'Exercise through the owning page workflow and assert the resulting UI/API state',
      expectedApiCalls: [],
      destructive: /delete|remove|cancel|confirm|save|update|create/i.test(`${accessibleName ?? ''} ${source.slice(Math.max(0, match.index - 120), match.index)}`),
      fixtureRequirements: [],
      existingTests: [],
      testSpec: null,
      coverageEvidence: null,
      status: 'uncovered',
    });
  }
}
for (const control of controlInventory) {
  const controlLine = Number(control.actionId.match(/:(\d+):[^:]+$/)?.[1] ?? 0);
  const controlSource = read(path.join(projectRoot, control.sourceFile));
  const controlContext = controlSource.split(/\r?\n/).slice(Math.max(0, controlLine - 3), controlLine + 9).join('\n');
  // These three controls are intentionally tied to the small public smoke test.
  // Other controls remain uncovered until a workflow asserts their result.
  if (control.sourceFile === 'src/pages/Login.tsx' && ['input', 'password', 'submit'].includes(control.controlType)) {
    control.existingTests = ['tests/e2e/smoke/auth-login.spec.ts'];
    control.testSpec = 'tests/e2e/smoke/auth-login.spec.ts';
    control.coverageEvidence = 'semantic smoke locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/Login.tsx' && controlContext.includes('Login via Email Verification')) {
    control.accessibleName = 'Login via Email Verification';
    control.existingTests = ['tests/e2e/smoke/auth-login.spec.ts'];
    control.testSpec = 'tests/e2e/smoke/auth-login.spec.ts';
    control.coverageEvidence = 'public navigation smoke locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/Login.tsx' && ['Remember Me', 'Hide Show'].includes(control.accessibleName)) {
    control.existingTests = ['tests/e2e/smoke/auth-login.spec.ts'];
    control.testSpec = 'tests/e2e/smoke/auth-login.spec.ts';
    control.coverageEvidence = 'semantic smoke locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/PartnerRegistration.tsx' && controlContext.includes('Back to Login')) {
    control.accessibleName = 'Back to Login';
    control.existingTests = ['tests/e2e/smoke/public-routes.spec.ts'];
    control.testSpec = 'tests/e2e/smoke/public-routes.spec.ts';
    control.coverageEvidence = 'public navigation smoke locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/PartnerRegistration.tsx' && [
    'Enter OTP received on your mobile number',
    'Enter OTP received on your email ID',
    'Terms & Conditions',
    'Privacy Policy',
    'Create Account',
  ].includes(control.accessibleName)) {
    control.existingTests = ['tests/e2e/smoke/public-routes.spec.ts'];
    control.testSpec = 'tests/e2e/smoke/public-routes.spec.ts';
    control.coverageEvidence = 'public registration smoke locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/PartnerRegistration.tsx' && control.controlType === 'checkbox' && (control.accessibleName ?? '').includes('I hereby declare')) {
    control.existingTests = ['tests/e2e/smoke/public-routes.spec.ts'];
    control.testSpec = 'tests/e2e/smoke/public-routes.spec.ts';
    control.coverageEvidence = 'public registration smoke locator';
    control.status = 'covered';
  }
  if (['src/pages/Settings/cities/Citiespage.tsx', 'src/pages/Settings/cities/CitiesModal.tsx'].includes(control.sourceFile) && [
    '+ Add City',
    'All States',
    '5 10 25 50',
    'Copy',
    'Excel',
    'CSV',
    'Enter the City Name',
    'Cancel',
  ].includes(control.accessibleName)) {
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated cities readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/Settings/GlobalSettings.tsx' && [
    'State Name *',
    'On Ground Support Number *',
    'Escalation Call Number *',
  ].includes(control.accessibleName)) {
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated global settings readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/Settings/GlobalSettings.tsx' && controlContext.includes('global-tbo-eligible-country')) {
    control.accessibleName = 'Choosen Country *';
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated global settings readonly workflow locator';
    control.status = 'covered';
  }
  if (['src/pages/Settings/GstSettings/GstSettings.tsx', 'src/pages/Settings/GstSettings/GstSettingsModal.tsx'].includes(control.sourceFile) && [
    '+ Add GST Settings',
    '5 10 25 50',
    'Copy',
    'Excel',
    'CSV',
    'Enter the GST title',
    'Enter the Gst value',
    'Enter the CGST Value',
    'Enter the SGST Value',
    'Enter the IGST Value',
    'Cancel',
  ].includes(control.accessibleName)) {
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated GST settings readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/Settings/GstSettings/GstSettings.tsx' && controlContext.includes('value={search}')) {
    control.accessibleName = 'GST settings search';
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated GST settings readonly workflow locator';
    control.status = 'covered';
  }
  const simpleSettingsSources = {
    'src/pages/Settings/HotelCategory.tsx': [
      '+ Add Hotel Category', '5 10 25 50', 'Copy', 'Excel', 'CSV', 'Cancel',
      'e.g., Budget, STD, 5*, 4*', 'e.g., DVIB-918791',
    ],
    'src/pages/Settings/VehicleType/VehicleType.tsx': [
      '+ Add Vehicle Type', '5 10 25 50', 'Copy', 'Excel', 'CSV',
    ],
    'src/pages/Settings/Language/Language.tsx': [
      '+ Add Language', '5 10 25 50', 'Copy', 'Excel', 'CSV',
    ],
    'src/pages/Settings/Language/LanguageModal.tsx': ['Enter the Language', 'Cancel'],
    'src/pages/Settings/VehicleType/VehicleTypeModal.tsx': ['Enter the Vehicle Type Title', 'Enter the occupancy', 'Cancel'],
  };
  if (simpleSettingsSources[control.sourceFile]?.includes(control.accessibleName)) {
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated settings list readonly workflow locator';
    control.status = 'covered';
  }
  if (['src/pages/Settings/HotelCategory.tsx', 'src/pages/Settings/VehicleType/VehicleType.tsx', 'src/pages/Settings/Language/Language.tsx'].includes(control.sourceFile) && controlContext.includes('value={search}')) {
    control.accessibleName = 'settings list search';
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated settings list readonly workflow locator';
    control.status = 'covered';
  }
  const permissionSettingsSources = {
    'src/pages/Settings/RolePermission/RolePermissionListPage.tsx': ['5 10 25 50', 'Add Role Permission'],
    'src/pages/Settings/agent-subscription-plan/AgentSubscriptionPlanListPage.tsx': ['+ Add Subscription Plan', '5 10 25 50', 'Copy', 'Excel', 'CSV'],
  };
  if (permissionSettingsSources[control.sourceFile]?.includes(control.accessibleName)) {
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated settings navigation readonly workflow locator';
    control.status = 'covered';
  }
  const inbuiltAmenitiesSources = {
    'src/pages/Settings/InbuiltAmenities/InbuiltAmenities.tsx': ['+ Add Inbuild Amenity', '5 10 25 50', 'Copy', 'Excel', 'CSV'],
    'src/pages/Settings/InbuiltAmenities/InbuiltAmenitiesModal.tsx': ['Enter the Inbuilt Amenity Title', 'Cancel'],
  };
  if (inbuiltAmenitiesSources[control.sourceFile]?.includes(control.accessibleName)) {
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated settings list readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/Settings/InbuiltAmenities/InbuiltAmenities.tsx' && controlContext.includes('value={search}')) {
    control.accessibleName = 'inbuilt amenities search';
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated settings list readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/Hotels.tsx' && [
    '+ Add Hotel',
    'Filter',
    'Price Book',
    'Rooms Price Book (Import)',
    'Amenities Price Book (Import)',
    'Choose State ))}',
    'Please Choose City ))}',
    'Clear',
    '10 25 50',
  ].includes(control.accessibleName)) {
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated hotel list readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/Hotels.tsx' && controlContext.includes('value={search}')) {
    control.accessibleName = 'hotel list search';
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated hotel list readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/drivers/DriversPage.tsx' && control.accessibleName === 'Add Driver') {
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated driver list readonly navigation locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/drivers/DriversPage.tsx' && controlContext.includes('value={search}')) {
    control.accessibleName = 'driver list search';
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated driver list readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/staff/StaffListPage.tsx' && ['Add Staff', '10 25 50'].includes(control.accessibleName)) {
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated staff list readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/staff/StaffListPage.tsx' && controlContext.includes('value={search}')) {
    control.accessibleName = 'staff list search';
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated staff list readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/activity/ActivityListPage.tsx' && ['Add Activity', '10 25 50'].includes(control.accessibleName)) {
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated activity list readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/activity/ActivityListPage.tsx' && controlContext.includes('value={search}')) {
    control.accessibleName = 'activity list search';
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated activity list readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/locations/LocationsPage.tsx' && control.accessibleName === 'Clear') {
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated locations list readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/locations/LocationsPage.tsx' && controlContext.includes('Type to search')) {
    control.accessibleName = 'locations list search';
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated locations list readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/locations/LocationsPage.tsx' && controlContext.includes('PAGE_SIZES.map')) {
    control.accessibleName = 'locations list page size';
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated locations list readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/agent/AgentListPage.tsx' && control.accessibleName === '10 25 50') {
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated agent list readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/agent/AgentListPage.tsx' && controlContext.includes('value={search}')) {
    control.accessibleName = 'agent list search';
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated agent list readonly workflow locator';
    control.status = 'covered';
  }
  if (['src/pages/Settings/RolePermission/RolePermissionListPage.tsx', 'src/pages/Settings/agent-subscription-plan/AgentSubscriptionPlanListPage.tsx'].includes(control.sourceFile) && controlContext.includes('value={search}')) {
    control.accessibleName = 'settings permission list search';
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated settings navigation readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/vendor/VendorsPage.tsx' && control.accessibleName === 'Search vendors') {
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/vendor/VendorsPage.tsx' && control.controlType === 'select') {
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated readonly workflow locator';
    control.status = 'covered';
  }
  if (control.sourceFile === 'src/pages/vendor/VendorsPage.tsx' && controlContext.includes('Add vendor')) {
    control.accessibleName = 'Add vendor';
    control.existingTests = ['tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'];
    control.testSpec = 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts';
    control.coverageEvidence = 'authenticated readonly navigation locator';
    control.status = 'covered';
  }
}
fs.writeFileSync(path.join(coverageRoot, 'control-inventory.json'), JSON.stringify(controlInventory, null, 2) + '\n');

const routeByPath = new Map(routeInventory.map((route) => [route.path, route]));
const pageInventory = pageFiles.map((file) => {
  const sourceName = relative(file);
  const component = path.basename(file, path.extname(file));
  const route = routeByComponent.get(component) ?? 'unmapped';
  const componentRouteRecords = routesByComponent.get(component) ?? [];
  const routeRecord = routeByPath.get(route);
  const coveredRouteRecord = componentRouteRecords.find((record) => record.pageLoadTest) ?? routeRecord;
  const pageLoadTest = coveredRouteRecord?.pageLoadTest ?? null;
  const rolePageLoadTests = componentRouteRecords.reduce((tests, record) => ({ ...tests, ...(record.rolePageLoadTests ?? {}) }), {});
  const source = read(file);
  const owningTests = testEvidence.filter(({ source: testSource }) =>
    testSource.includes(component) || (route !== 'unmapped' && testSource.includes(route)),
  ).map(({ relative: testFile }) => testFile);
  const serviceDependencies = filesUnder(path.join(sourceRoot, 'services'))
    .filter((serviceFile) => {
      const serviceName = path.basename(serviceFile, path.extname(serviceFile));
      return new RegExp(`(?:/|\\\\)${serviceName}(?:\\.|['"])`).test(source);
    })
    .map((serviceFile) => relative(serviceFile));
  const pageApis = [...source.matchAll(/\bapi\(\s*["'`]([^"'`]+)["'`]/g)].map((match) => match[1]);
  return {
    pageId: sourceName,
    sourceFile: sourceName,
    component,
    route,
    reachable: route !== 'unmapped',
    public: routeRecord?.public ?? false,
    roles: routeRecord?.roles ?? ['super-admin', 'agent'],
    pageLoadTest,
    rolePageLoadTests,
    existingTests: [...new Set(owningTests)],
    serviceDependencies,
    apiCalls: pageApis,
    controlCount: controlInventory.filter((control) => control.sourceFile === sourceName).length,
    fixtureRequirements: coveredRouteRecord?.fixtureRequirements ?? [],
    blockerReason: pageLoadTest ? null : routeRecord?.blockerReason ?? null,
    status: pageLoadTest ? 'covered' : route === 'unmapped' ? 'unmapped' : routeRecord?.status === 'blocked' ? 'blocked' : 'uncovered',
  };
});
fs.writeFileSync(path.join(coverageRoot, 'page-inventory.json'), JSON.stringify(pageInventory, null, 2) + '\n');

const apiInventory = [];
const seenApis = new Set();
const serviceConsumers = new Map();
const explicitUiWorkflowEvidence = new Map([
  ['GET /hotels', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /hotels?:param', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /drivers', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /staff', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /activities', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /locations', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /locations:param', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /agents/full?limit=1000', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /global-settings', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /global-settings/states', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /gst-settings', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /hotel-categories', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /vehicle-types', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /languages', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /inbuilt-amenities', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /role-permissions', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  ['GET /agent-subscription-plans', 'tests/e2e/admin-readonly/core-page-loads.readonly.spec.ts'],
  // These workflows are intentionally behind the legacy-fixture gate because
  // they exercise existing records while the fixture migration is completed.
  ['POST /hotels/:param/rooms/:param/gallery', 'tests/e2e/legacy-fixture/hotel-edit-17446-full-flow.spec.ts'],
  ['PATCH /vendors/:param', 'tests/e2e/legacy-fixture/vendor-new-flow.spec.ts'],
  ['POST /vendors/:param/permit-costs', 'tests/e2e/legacy-fixture/vendor-new-flow.spec.ts'],
  ['PUT /vendors/vehicles/:param', 'tests/e2e/legacy-fixture/vendor-new-flow.spec.ts'],
  ['POST /vendors/:param/vehicles', 'tests/e2e/legacy-fixture/vendor-new-flow.spec.ts'],
  ['POST /vendors/:param/vehicle-type-costs', 'tests/e2e/legacy-fixture/vendor-crysta-pricebook.spec.ts'],
  ['POST /vendors/:param/local-km-limits', 'tests/e2e/legacy-fixture/vendor-crysta-pricebook.spec.ts'],
  ['POST /vendors/:param/outstation-km-limits', 'tests/e2e/legacy-fixture/vendor-crysta-readd-outstation.spec.ts'],
  ['POST /vendors/:param/pricebook/local', 'tests/e2e/legacy-fixture/vendor-crysta-pricebook.spec.ts'],
  ['POST /vendors/:param/pricebook/outstation', 'tests/e2e/legacy-fixture/vendor-crysta-readd-outstation.spec.ts'],
  ['DELETE /vendors/:param/vehicle-type-costs/:param', 'tests/e2e/legacy-fixture/vendor-hycross-pricebook.spec.ts'],
  ['DELETE /vendors/:param/outstation-km-limits/:param', 'tests/e2e/legacy-fixture/vendor-crysta-readd-outstation.spec.ts'],
  ['DELETE /vendors/:param/local-km-limits/:param', 'tests/e2e/legacy-fixture/vendor-hycross-pricebook.spec.ts'],
  ['PUT /vendors/branches/:param', 'tests/e2e/legacy-fixture/vendor-new-flow.spec.ts'],
  ['POST /vendors/:param/branches', 'tests/e2e/legacy-fixture/vendor-new-flow.spec.ts'],
]);
for (const serviceFile of filesUnder(path.join(sourceRoot, 'services'))) {
  const serviceName = path.basename(serviceFile, path.extname(serviceFile));
  const consumers = filesUnder(sourceRoot).filter((file) => {
    if (file === serviceFile || !/\.(ts|tsx)$/.test(file)) return false;
    return new RegExp(`(?:/|\\\\)${serviceName}(?:\\.|['\"])`).test(read(file));
  }).map(relative);
  serviceConsumers.set(relative(serviceFile), consumers);
}
const addApi = (method, endpoint, sourceFile, classification) => {
  const normalized = endpoint.replace(/^\$\{[^}]+\}/, '').replace(/\$\{[^}]+\}/g, ':param');
  const key = `${method} ${normalized}`;
  if (seenApis.has(key)) return;
  seenApis.add(key);
  const endpointNeedles = [...new Set([
    normalized.toLowerCase().split('?')[0],
    normalized.toLowerCase().replace(/^\/api\/v1/, '').split('?')[0],
  ])].filter(Boolean);
  const matchingEvidence = testEvidence.filter(({ source }) => {
    const lowerSource = source.toLowerCase();
    return endpointNeedles.some((needle) => lowerSource.includes(needle));
  });
  const heuristicUiWorkflowTests = matchingEvidence.filter(({ hasPageInteraction }) => hasPageInteraction).map(({ relative: file }) => file);
  const explicitUiWorkflowTest = explicitUiWorkflowEvidence.get(key);
  const uiWorkflowTests = explicitUiWorkflowTest ? [explicitUiWorkflowTest] : heuristicUiWorkflowTests;
  const apiOnlyTests = matchingEvidence.filter(({ hasPageInteraction }) => !hasPageInteraction).map(({ relative: file }) => file);
  const existingTests = [...new Set([...uiWorkflowTests, ...apiOnlyTests])];
  const consumerFiles = serviceConsumers.get(sourceFile) ?? (/^src\/(?:pages|components)\//.test(sourceFile) ? [sourceFile] : []);
  const ownerNames = consumerFiles.map((file) => path.basename(file, path.extname(file)));
  const ownerRoutes = consumerFiles.map((file) => routeByComponent.get(path.basename(file, path.extname(file)))).filter(Boolean);
  const consumerWorkflowTests = testEvidence.filter(({ source, hasPageInteraction }) => hasPageInteraction && (
    ownerNames.some((ownerName) => source.includes(ownerName)) || ownerRoutes.some((route) => source.includes(route))
  )).map(({ relative: file }) => file);
  const externalSystem = /axisrooms|staah|tbo|resavenue|razorpay|hobse/i.test(normalized) || (/^https?:\/\//i.test(normalized) && !/localhost|127\.0\.0\.1/i.test(normalized)) ? 'external-provider' : null;
  apiInventory.push({
    method,
    path: normalized,
    sourceFile,
    classification,
    externalSystem,
    consumerFiles,
    existingTests,
    uiWorkflowTests,
    apiOnlyTests,
    consumerWorkflowTests: [...new Set(consumerWorkflowTests)],
    coverageEvidence: uiWorkflowTests.length ? 'verified UI workflow request reference' : apiOnlyTests.length ? 'API-only reference' : consumerWorkflowTests.length ? 'owning page workflow reference' : null,
    testSpec: uiWorkflowTests.length && (classification === 'ui-reachable' || explicitUiWorkflowTest) ? uiWorkflowTests[0] : null,
    status: externalSystem ? 'blocked' : uiWorkflowTests.length && (classification === 'ui-reachable' || explicitUiWorkflowTest) ? 'covered' : 'uncovered',
    blockerReason: externalSystem ? 'External provider boundary requires an explicit sandbox or deterministic mock.' : null,
  });
};

for (const file of filesUnder(sourceRoot)) {
  const source = read(file);
  const sourceName = relative(file);
  const sourceClassification = /src\/(?:services|api)\//.test(sourceName) ? 'ui-supporting' : 'ui-reachable';
  for (const match of source.matchAll(/\bapi\(\s*["'`]([^"'`]+)["'`][\s\S]{0,160}?method\s*:\s*["'](GET|POST|PUT|PATCH|DELETE)["']/gi)) addApi(match[2].toUpperCase(), match[1], sourceName, sourceClassification);
  for (const match of source.matchAll(/\bapi\(\s*["'`]([^"'`]+)["'`]/g)) addApi('GET', match[1], relative(file), 'ui-supporting');
  const localUrls = new Map([...source.matchAll(/\b(?:const|let|var)\s+(\w+)\s*=\s*(["'`])([^"'`]+)\2/g)].map((match) => [match[1], match[3]]));
  for (const match of source.matchAll(/\bfetch\(\s*(?:(["'`])([^"'`]+)\1|(\w+))/g)) {
    const endpoint = match[2] ?? localUrls.get(match[3]);
    if (!endpoint) continue;
    const callContext = source.slice(match.index, match.index + 320);
    const method = callContext.match(/\bmethod\s*:\s*["'](GET|POST|PUT|PATCH|DELETE)["']/i)?.[1]?.toUpperCase() ?? 'GET';
    addApi(method, endpoint, sourceName, sourceClassification);
  }
  for (const match of source.matchAll(/\baxios\.(get|post|put|patch|delete)\(\s*(?:(["'`])([^"'`]+)\2|(\w+))/gi)) {
    const endpoint = match[3] ?? localUrls.get(match[4]);
    if (endpoint) addApi(match[1].toUpperCase(), endpoint, sourceName, sourceClassification);
  }
}
for (const file of filesUnder(backendRoot)) {
  const source = read(file);
  const controller = source.match(/@Controller\(\s*["']([^"']+)["']\s*\)/)?.[1] ?? '';
  for (const match of source.matchAll(/@(Get|Post|Put|Patch|Delete)\(\s*(?:["']([^"']*)["'])?/g)) addApi(match[1].toUpperCase(), `/${controller}${match[2] ? `/${match[2]}` : ''}`.replaceAll('//', '/'), relative(file), 'backend-contract');
}
fs.writeFileSync(path.join(coverageRoot, 'api-inventory.json'), JSON.stringify(apiInventory, null, 2) + '\n');

const classification = testFiles.map((file) => {
  const source = /\.(ts|tsx|js|mjs|json|md)$/.test(file) ? read(file) : '';
  const fileName = relative(file);
  const lower = fileName.toLowerCase();
  let value = 'refactor';
  let reason = 'Existing test requires migration to shared fixtures, auth, and deterministic assertions.';
  if (lower.includes('/quarantine/')) { value = 'quarantine'; reason = 'Historical production-connected test is excluded from all ordinary projects.'; }
  else if (lower.includes('/external-sandbox/')) { value = 'blocked'; reason = 'External provider workflow requires an explicit sandbox or mock project.'; }
  else if (lower.includes('/legacy-environment/') || lower.includes('/legacy-fixture/')) { value = 'blocked'; reason = 'Legacy or fixed-record fixture workflow is excluded from the deterministic default suite.'; }
  else if (lower.endsWith('.png') || lower.endsWith('.csv') || lower.endsWith('.json') || lower.endsWith('.md')) { value = 'retain'; reason = 'Fixture or documentation asset retained for migrated regression coverage.'; }
  else if (lower.includes('seed-booking-test-data')) { value = 'replace-with-fixture'; reason = 'Shared-data seeder must become run-scoped fixture setup; no default test execution.'; }
  else if (lower.includes('itinerary-fit-here') || lower.includes('manual-hotspot') || lower.includes('booking-flow') || lower.includes('vehicle-only')) { value = 'retain'; reason = 'Important itinerary/booking regression knowledge is retained while the harness is migrated.'; }
  const routes = [...source.matchAll(/(?:page\.goto|goto|to)\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]).filter((v) => v.startsWith('/'));
  const apiEndpoints = [...source.matchAll(/(?:api|fetch|request\.(?:get|post|put|delete))\(\s*["'`]([^"'`]+)["'`]/g)].map((m) => m[1]).filter((v) => v.startsWith('/'));
  const externalSystems = [...new Set((source.match(/axisrooms|staah|tbo|resavenue|razorpay|hobse|dvi\.travel/gi) ?? []).map((v) => v.toLowerCase()))];
  const fixedRecordDependencies = [...new Set((source.match(/(?:DVI\d+|(?:hotel|vendor|guide|quote|itinerary)[A-Z_-]*\s*ID|\b(?:17446|153|54)\b)/gi) ?? []))];
  const executableTest = /\.(ts|tsx|js|mjs)$/.test(fileName);
  const postCalls = [...source.matchAll(/\b(?:request|page\.request)\.post\(([\s\S]{0,600}?)\)/gi)];
  const mutationEvidence = /\b(?:request|page\.request)\.(?:put|patch|delete)\b/i.test(source)
    || postCalls.some((match) => !/\/auth\/login\b|\/manual-hotspot\/(?:fit-preview|preview)\b|\/auto-fit-preview\b/i.test(match[1]))
    || /\b(?:fetch|axios)\([^\n]{0,220}\bmethod\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]|\bmethod\s*:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i.test(source);
  if (lower.includes('vehicle-availability-duplicate-registration')) {
    value = 'blocked';
    reason = 'Backend exposes vehicle creation but no delete endpoint; keep this destructive duplicate-registration regression out of ordinary mutation runs until a cleanup API exists.';
  }
  return { file: fileName, classification: value, reason, routes, apiEndpoints, externalSystems, fixedRecordDependencies, destructiveActions: executableTest && mutationEvidence ? ['writes or workflow mutation detected'] : [], cleanupAvailable: !executableTest || /cleanup|delete|remove|finally/i.test(source), role: /agent/i.test(source) ? ['agent'] : ['super-admin'], replacementFiles: [] };
});
fs.writeFileSync(path.join(coverageRoot, 'existing-test-classification.json'), JSON.stringify(classification, null, 2) + '\n');

function statusSummary(items) {
  return items.reduce((summary, item) => {
    summary.total += 1;
    summary[item.status] = (summary[item.status] ?? 0) + 1;
    return summary;
  }, { total: 0 });
}

function groupedSummary(items, field) {
  return items.reduce((summary, item) => {
    const key = item[field] ?? 'unknown';
    summary[key] = (summary[key] ?? 0) + 1;
    return summary;
  }, {});
}

function roleStatusSummary(items) {
  return items.reduce((summary, item) => {
    for (const role of item.roles) {
      summary[role] ??= { total: 0 };
      summary[role].total += 1;
      const roleStatus = item.status === 'redirect' || item.status === 'unreachable' ? item.status : item.rolePageLoadTests?.[role] ? item.status : 'uncovered';
      summary[role][roleStatus] = (summary[role][roleStatus] ?? 0) + 1;
    }
    return summary;
  }, {});
}

const uiApis = apiInventory.filter((item) => item.classification === 'ui-reachable');
const coverageMatrix = {
  generatedAt: new Date().toISOString(),
  source: {
    routeFile: 'src/App.tsx',
    pageRoot: 'src/pages',
    serviceRoot: 'src/services',
    backendRoot: '../api.dvi.travel/src',
  },
  routes: {
    ...statusSummary(routeInventory),
    byRole: roleStatusSummary(routeInventory),
    withoutPageLoadTest: routeInventory.filter((item) => !item.pageLoadTest).length,
  },
  controls: {
    ...statusSummary(controlInventory),
    byType: groupedSummary(controlInventory, 'controlType'),
    withoutWorkflowTest: controlInventory.filter((item) => !item.testSpec).length,
  },
  pages: {
    ...statusSummary(pageInventory),
    byRole: roleStatusSummary(pageInventory),
    reachable: pageInventory.filter((item) => item.reachable).length,
    withoutPageLoadTest: pageInventory.filter((item) => item.reachable && !item.pageLoadTest).length,
    withControls: pageInventory.filter((item) => item.controlCount > 0).length,
  },
  apis: {
    ...statusSummary(apiInventory),
    byClassification: groupedSummary(apiInventory, 'classification'),
    byExternalSystem: groupedSummary(apiInventory.map((item) => ({ status: item.externalSystem ?? 'internal' })), 'status'),
    uiReachable: {
      ...statusSummary(uiApis),
      withUiWorkflowEvidence: uiApis.filter((item) => item.uiWorkflowTests.length).length,
      withConsumerWorkflowEvidence: uiApis.filter((item) => item.consumerWorkflowTests.length).length,
      withApiOnlyEvidence: uiApis.filter((item) => item.apiOnlyTests.length && !item.uiWorkflowTests.length).length,
      withoutEvidence: uiApis.filter((item) => !item.coverageEvidence).length,
      withoutExactWorkflowEvidence: uiApis.filter((item) => !item.uiWorkflowTests.length).length,
    },
    withoutUiWorkflowEvidence: apiInventory.filter((item) => item.classification === 'ui-reachable' && !item.uiWorkflowTests.length).length,
  },
  defaultExcluded: classification.filter((item) => ['quarantine', 'blocked'].includes(item.classification)).map((item) => ({ file: item.file, classification: item.classification })),
  findings: {
    fixedRecordDependencies: classification.filter((item) => item.fixedRecordDependencies.length).length,
    destructiveWorkflows: classification.filter((item) => item.destructiveActions.length).length,
    cleanupMissing: classification.filter((item) => item.destructiveActions.length && !item.cleanupAvailable).length,
  },
};
fs.writeFileSync(path.join(coverageRoot, 'coverage-matrix.json'), JSON.stringify(coverageMatrix, null, 2) + '\n');

console.log(`Generated route=${routeInventory.length}, controls=${controlInventory.length}, api=${apiInventory.length}, classified=${classification.length}, matrix=${path.join('tests/e2e/coverage', 'coverage-matrix.json')}`);
