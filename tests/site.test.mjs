import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { build, renderMarkdown, readReport, reportForVersion, root } from '../scripts/build.mjs';

test('Markdown keeps code literal, disallows scripts and rewrites local documentation links', () => {
  const html = renderMarkdown('# Module\n\n# Module\n\n[Docs](../docs/modules.md#api-testing)\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n```bash\n<image> --config <path>\n```');
  assert.match(html, /id="module"/);
  assert.match(html, /id="module-1"/);
  assert.match(html, /href="\.\.\/docs\/modules.html#api-testing"/);
  assert.doesNotMatch(html, /<script>|href="javascript:/);
  assert.match(html, /&lt;image&gt;/);
});
test('Release report selection never substitutes another version', () => {
  const reports = [{ version: '0.6.1', run: '59' }, { version: '0.5.0', run: '43' }];
  assert.equal(reportForVersion(reports, '0.4.0'), undefined);
  assert.equal(reportForVersion(reports, '0.5.0').run, '43');
});
test('Allure/PDF provenance mismatch is rejected, stale publication metadata is ignored', () => {
  const folder = mkdtempSync(join(tmpdir(), 'playbot-portal-test-'));
  try {
    mkdirSync(join(folder, 'allure/widgets'), { recursive: true }); mkdirSync(join(folder, 'pdf'));
    writeFileSync(join(folder, 'publication.json'), JSON.stringify({ run_number: 43 }));
    writeFileSync(join(folder, 'pdf/results.json'), JSON.stringify({ version: '0.6.1', commit: 'abc', run_url: 'https://github.com/demo/actions/runs/59', generated_at: '2026-09-14' }));
    writeFileSync(join(folder, 'allure/widgets/summary.json'), JSON.stringify({ statistic: { total: 91, passed: 91 } }));
    const env = [{ name: 'Playbot.version', values: ['0.6.1'] }, { name: 'Customer.commit', values: ['abc'] }, { name: 'GitHub.run', values: ['59'] }];
    writeFileSync(join(folder, 'allure/widgets/environment.json'), JSON.stringify(env));
    assert.equal(readReport(folder).run, '59');
    env[0].values[0] = '0.5.0';
    writeFileSync(join(folder, 'allure/widgets/environment.json'), JSON.stringify(env));
    assert.throws(() => readReport(folder), /same run/);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});
test('Complete documentation builds with valid local links, images, anchors and version targets under a Pages subpath', () => {
  build();
  const dist = join(root, 'dist');
  const files = readdirSync(dist, { recursive: true }).filter(p => p.endsWith('.html'));
  const missing = [];
  for (const file of files) {
    const html = readFileSync(join(dist, file), 'utf8');
    const current = new URL(file.replaceAll('\\', '/'), 'https://example.org/playbot-portal/');
    for (const match of html.matchAll(/(?:href|src|value)="([^"<>]+)"/g)) {
      const target = match[1];
      if (/^(https?:|mailto:|data:)/.test(target)) continue;
      const url = new URL(target, current);
      if (!url.pathname.startsWith('/playbot-portal/')) { missing.push(`${file}: escapes project path: ${target}`); continue; }
      let path = join(dist, decodeURIComponent(url.pathname.slice('/playbot-portal/'.length)));
      if (existsSync(path) && statSync(path).isDirectory()) path = join(path, 'index.html');
      if (!existsSync(path)) missing.push(`${file}: missing ${target}`);
      else if (url.hash && path.endsWith('.html')) {
        const doc = readFileSync(path, 'utf8');
        if (!doc.includes(`id="${decodeURIComponent(url.hash.slice(1))}"`)) missing.push(`${file}: missing anchor ${target}`);
      }
    }
  }
  assert.ok(files.length >= 40);
  assert.deepEqual(missing, []);
  assert.match(readFileSync(join(dist, 'versions/0.4.0/reports.html'), 'utf8'), /kein zugeordneter Bericht/);
});
test('Build refuses to clear paths outside its generated directory', () => {
  assert.throws(() => build({ output: root }), /dist directory/);
});
