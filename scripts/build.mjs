import MarkdownIt from 'markdown-it';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, rmSync, lstatSync } from 'node:fs';
import { resolve, join, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const slug = value => value.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-');
export function renderMarkdown(source) {
  const md = new MarkdownIt({ html: false, linkify: false, typographer: false });
  const used = new Map();
  md.renderer.rules.heading_open = (tokens, i, options, env, self) => {
    const id = slug(tokens[i + 1].content);
    const count = used.get(id) || 0; used.set(id, count + 1);
    tokens[i].attrSet('id', id + (count ? `-${count}` : ''));
    return self.renderToken(tokens, i, options);
  };
  const defaultLink = md.renderer.rules.link_open || ((tokens, i, options, env, self) => self.renderToken(tokens, i, options));
  md.renderer.rules.link_open = (tokens, i, options, env, self) => {
    const href = tokens[i].attrGet('href');
    if (href && !/^[a-z]+:/i.test(href)) tokens[i].attrSet('href', href.replace(/README\.md(?=#|$)/, 'index.html').replace(/\.md(?=#|$)/, '.html'));
    return defaultLink(tokens, i, options, env, self);
  };
  return md.render(source.replace(/^<\/?details>\s*$/gm, '').replace(/^<summary>(.*?)<\/summary>\s*$/gm, '**$1**'));
}
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
export function readReport(source, prefix = '') {
  const pdf = readJson(join(source, 'pdf/results.json'));
  const allure = readJson(join(source, 'allure/widgets/summary.json'));
  const environment = Object.fromEntries(readJson(join(source, 'allure/widgets/environment.json')).map(x => [x.name, x.values[0]]));
  if (pdf.version !== environment['Playbot.version'] || pdf.commit !== environment['Customer.commit'] || !pdf.run_url.endsWith('/' + environment['GitHub.run'])) throw new Error('PDF and Allure do not describe the same run');
  if (!/^\d+\.\d+\.\d+$/.test(pdf.version) || !/^\d+$/.test(environment['GitHub.run'])) throw new Error('Invalid report provenance');
  return { version: pdf.version, commit: pdf.commit, run: environment['GitHub.run'], generated_at: pdf.generated_at, statistic: allure.statistic, allure: `${prefix}allure/`, pdf: `${prefix}pdf/` };
}
function collectReports(source) {
  if (!source) return [];
  const latest = readReport(source);
  const reports = [latest];
  // The public report repository retains the same allure/pdf layout per run.
  const archives = join(source, 'runs');
  if (existsSync(archives)) for (const name of readdirSync(archives)) {
    if (!/^\d+-\d+$/.test(name)) continue;
    const folder = join(archives, name);
    if (!existsSync(join(folder, 'pdf/results.json')) || !existsSync(join(folder, 'allure/widgets/environment.json'))) continue;
    const archived = readReport(folder, `runs/${name}/`);
    if (!reports.some(report => report.run === archived.run)) reports.push(archived);
  }
  return reports.sort((a, b) => b.generated_at.localeCompare(a.generated_at));
}
export function reportForVersion(reports, version) { return reports.find(report => report.version === version); }

export function build({ content = join(root, 'content'), output = join(root, 'dist'), reports: reportsSource } = {}) {
  const manifest = readJson(join(content, 'manifest.json'));
  const releases = [...manifest.releases].sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
  const latest = releases.find(r => r.version === manifest.latest);
  if (!latest) throw new Error('Latest release is absent');
  // Only this repository's generated directory may ever be cleared.
  if (resolve(output) !== join(root, 'dist')) throw new Error('Output must be the portal dist directory');
  rmSync(output, { recursive: true, force: true });
  const write = (path, data) => { const dest = join(output, path); mkdirSync(dirname(dest), { recursive: true }); writeFileSync(dest, data); };
  const reports = collectReports(reportsSource);
  const navigation = [['index.html', 'Übersicht'], ['start.html', 'Entwicklereinstieg'], ['presentation/index.html', 'Präsentation'], ['docs/modules.html', 'Module'], ['releases.html', 'Releases'], ['reports.html', 'Dashboards']];
  function shell(title, body, path, release = null, toc = '') {
    const depth = path.split('/').length - 1;
    const base = '../'.repeat(depth);
    const prefix = release ? `versions/${release.version}/` : '';
    const localPath = path.slice(prefix.length);
    const switchPath = localPath === 'presentation/images/index.html' ? 'presentation/index.html' : localPath;
    const versionOptions = `<option value="${base}${switchPath}" ${!release ? 'selected' : ''}>Aktuell · ${escape(manifest.latest)}</option>` + releases.map(r => `<option value="${base}versions/${r.version}/${switchPath}" ${r.version === release?.version ? 'selected' : ''}>Release ${r.version}</option>`).join('');
    return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)} · Playbot</title><meta name="description" content="Playbot: Entwickler-Einstieg, Präsentation, Releases und öffentliche Testberichte."><link rel="stylesheet" href="${base}assets/style.css"><script defer src="${base}assets/app.js"></script></head><body><a class="skip" href="#main">Zum Inhalt</a><div class="layout"><aside class="sidebar"><a class="brand" href="${base}index.html"><span class="mark">P<span>_</span></span>playbot<span class="brand-caption">DEVELOPER PORTAL</span></a><label class="version-label" for="version">Version ansehen</label><select id="version">${versionOptions}</select><nav aria-label="Hauptnavigation">${navigation.map(([url, label]) => `<a ${localPath === url ? 'aria-current="page"' : ''} href="${base}${prefix}${url}">${label}</a>`).join('')}</nav><div class="sidebar-bottom"><span class="dot"></span> Open documentation<br><a href="https://github.com/${escape(manifest.repository)}">Portal auf GitHub ↗</a></div></aside><div class="content"><header class="topbar"><span>Robot Framework × Playwright</span><span>${release ? 'Release-Archiv' : 'Entwicklerportal'} / ${escape(release?.version || manifest.latest)}</span></header><main id="main">${release ? `<div class="archive-note">Release-Stand ${release.version} · ${release.date}. <a href="${base}${switchPath}">Aktuellen Einstieg öffnen →</a></div>` : ''}${body}</main><footer>Playbot · Dokumentation und reale Demo-Evidenz.<br><small>Quellen: ${escape((release?.source_revision || manifest.source_revision).slice(0, 12))}. Verweise auf Framework-Code und Kundenbeispiele benötigen GitHub-Zugriff. Dieses Portal ist öffentlich.</small></footer></div>${toc}</div></body></html>`;
  }
  function cards(items) { return `<div class="cards">${items.map(([title, text, link]) => `<a class="card" href="${link}"><span class="arrow">↗</span><h3>${title}</h3><p>${text}</p></a>`).join('')}</div>`; }
  function reportBlock(report, base) {
    if (!report) return `<div class="notice">Für diese Version ist kein zugeordneter Bericht im aufbewahrten Archiv verfügbar. Aktuelle Demo-Berichte sind separat unter <a href="${base}reports.html">Dashboards</a> erreichbar.</div>`;
    return `<div class="report-meta"><span>Playbot ${escape(report.version)}</span><span>Lauf ${escape(report.run)}</span><span>${escape(report.generated_at.slice(0, 10))}</span></div><div class="metrics"><div><strong>${escape(report.statistic.total)}</strong><span>Allure-Tests</span></div><div><strong>${escape(report.statistic.passed)}</strong><span>Bestanden</span></div><div><strong>${escape(report.statistic.failed + report.statistic.broken)}</strong><span>Fehler / Broken</span></div><div><strong>${escape(report.statistic.skipped)}</strong><span>Übersprungen</span></div></div>${cards([['Allure', 'Tests, Schritte, Technologien und Trends.', base + report.allure], ['PDF-Dashboard', 'Text, Pixel, Masken und nachvollziehbare Unterschiede.', base + report.pdf]])}<p class="muted">Kundenrevision <code>${escape(report.commit.slice(0, 12))}</code>. Zahlen gelten für diesen Lauf; sie werden nicht mit historischen Läufen addiert.</p>`;
  }
  for (const release of [null, ...releases]) {
    const r = release || latest;
    const prefix = release ? `versions/${r.version}/` : '';
    const base = release ? '../../' : '';
    const source = join(content, release ? prefix : 'current');
    const hasApi = r.version.localeCompare('0.5.0', undefined, { numeric: true }) >= 0;
    const hasDiscovery = r.version.localeCompare('0.6.1', undefined, { numeric: true }) >= 0;
    const report = release ? reportForVersion(reports, r.version) : reports[0];
    const heading = `<p class="eyebrow">PLAYBOT / ${release ? 'RELEASE ' + r.version : 'BUILD. TEST. UNDERSTAND.'}</p>`;
    write(prefix + 'index.html', shell('Übersicht', `${heading}<section class="hero"><div><h1>Ein Einstieg.<br><span>Alle Möglichkeiten.</span></h1><p class="lead">${release ? escape(r.summary) : "Browser, APIs, Datenbanken und Dokumente testen — mit einer gemeinsamen Laufzeit und nachvollziehbaren Berichten."}</p><div class="actions"><a class="button" href="start.html">Mit Playbot starten <span>→</span></a><a class="text-link" href="presentation/index.html">Präsentation ansehen ↗</a></div></div><div class="hero-code"><div class="code-label">DEIN ERSTER ABLAUF <span>● ● ●</span></div><pre>${hasDiscovery ? '<span class="code-comment"># Öffentliche Module entdecken</span>\nplaybot discover\n\n' : ''}<span class="code-comment"># Konfiguration prüfen</span>\nplaybot doctor --config config/playbot.toml\n\n<span class="code-comment"># Tests ausführen</span>\nplaybot run --config config/playbot.toml \\\n  -- robot/tests</pre><div class="code-bottom">Module wählen <span>→</span> Prüfen <span>→</span> Ausführen</div></div></section><section class="release-focus"><div><p class="eyebrow">${release ? 'DIESES RELEASE' : 'NEUESTES RELEASE'} · ${r.date}</p><h2>${escape(r.title)}</h2><p>${escape(r.summary)}</p><a class="text-link" href="releases.html">Was ist neu in ${r.version}? →</a></div><span class="release-number">${r.version}</span></section><section><div class="section-title"><h2>Was möchtest du testen?</h2><span>Vom ersten Import bis zur Evidenz</span></div>${cards([['Browser & UI', 'Playwright, semantische Locators und fachliche Keywords.', 'docs/modules.html'], [hasApi ? 'APIs & Daten' : 'JSON & XML', hasApi ? 'HTTP, WireMock und OpenAPI; strukturierte JSON/XML-Vergleiche.' : 'Strukturierte Vergleiche mit expliziten Regeln und nachvollziehbaren Unterschieden.', 'docs/modules.html'], ['PDF & Reporting', 'Text und Darstellung vergleichen. Ergebnisse direkt nachvollziehen.', 'docs/modules.html#pdf-comparison-and-masks']])}</section><section><div class="section-title"><h2>Ergebnisse zum Ansehen</h2><a href="reports.html">Alle Dashboards →</a></div>${reportBlock(report, base)}</section><section><h2>Die letzten Releases</h2><div class="release-list">${releases.map(x => `<a href="${base}versions/${x.version}/releases.html"><strong>${x.version}</strong><span>${escape(x.title)}</span><time>${x.date}</time><b>→</b></a>`).join('')}</div></section>`, prefix + 'index.html', release));
    write(prefix + 'start.html', shell('Entwicklereinstieg', `${heading}<h1>Vom Überblick<br><span>zum ersten Test.</span></h1><p class="lead">Beginne mit einem Kundenprojekt oder entwickle das Framework weiter. Die bestehende Dokumentation begleitet beide Wege.</p><div class="steps"><article><span>01</span><h2>Laufzeit auswählen</h2><p>Release und Image-Digest gemeinsam pinnen. Profile stellen die installierten Fähigkeiten bereit.</p><a href="docs/customer.html">Kundenprojekt aufsetzen →</a></article><article><span>02</span><h2>Module aktivieren</h2><p>Öffentliche Ressourcen importieren. Verwendete Module müssen aktiv und installiert sein.</p><a href="docs/modules.html">Modulübersicht öffnen →</a></article><article><span>03</span><h2>Prüfen und ausführen</h2><p>Doctor vor dem Testlauf starten. Danach Robot-, Allure- und PDF-Evidenz auswerten.</p><a href="reports.html">Beispiele im Report ansehen →</a></article></div><h2>Direkt in die Dokumentation</h2>${cards([['Architektur', 'Core, Module, Kundenprojekt und unveränderliche Artefakte.', 'docs/concepts.html'], ['Entwicklung', 'Lokale Einrichtung, Tests und neue Module.', 'docs/development.html'], ['Release & Rollback', 'Versionen prüfen, übernehmen und bei Bedarf zurückrollen.', 'docs/release.html']])}<div class="notice">Die technischen Referenzseiten werden aus den fünf bestehenden Playbot-Dokumenten übernommen. Sie sind auf Englisch; Einstieg und Präsentation sind auf Deutsch.</div>`, prefix + 'start.html', release));
    write(prefix + 'releases.html', shell('Release-Neuerungen', `${heading}<h1>${escape(r.title)}</h1><p class="lead">${escape(r.summary)}</p><p class="release-tag">Playbot ${r.version} · ${r.date}</p><ul class="highlights">${r.highlights.map(x => `<li>${escape(x)}</li>`).join('')}</ul><h2>Übernahme ins Projekt</h2><p>${escape(r.migration)}</p><h2>Grenzen und Ausblick</h2><p>${escape(r.limitations)}</p><p><a href="https://github.com/Test-Automation-PTS/playbot/releases/tag/v${r.version}">Original-Release und Artefakte ↗</a> <small>(Repository-Zugriff erforderlich)</small></p><h2>Weitere Versionen</h2><div class="release-list">${releases.map(x => `<a href="${base}versions/${x.version}/releases.html"><strong>${x.version}</strong><span>${escape(x.title)}</span><time>${x.date}</time></a>`).join('')}</div><p class="muted">Das Portal archiviert die Präsentationsreihe ab 0.4.0. Ältere Releases bleiben im Framework-Repository erhalten.</p>`, prefix + 'releases.html', release));
    write(prefix + 'reports.html', shell('Dashboards', `${heading}<h1>Tests werden<br><span>nachvollziehbar.</span></h1><p class="lead">Allure zeigt den gesamten Lauf. Das PDF-Dashboard ergänzt die konkreten Dokumente und Unterschiede.</p>${reportBlock(report, base)}${!reportsSource ? `<p>Ohne lokalen Report-Snapshot: <a href="https://test-automation-pts.github.io/playbot-demo-reports/allure/">Öffentliches Allure</a> · <a href="https://test-automation-pts.github.io/playbot-demo-reports/pdf/">Öffentliches PDF-Dashboard</a></p>` : ''}<h2>Aufbewahrte Läufe</h2><p class="muted">Nur anhand ihrer Umgebung zuordenbare Läufe erscheinen bei einer Release-Version.</p><div class="release-list">${reports.filter(x => !release || x.version === r.version).map(x => `<a href="${base}${x.pdf}"><strong>${escape(x.version)}</strong><span>Lauf ${escape(x.run)} · PDF-Evidenz</span><time>${escape(x.generated_at.slice(0, 10))}</time></a>`).join('') || '<p>Keine zugeordneten archivierten Läufe verfügbar.</p>'}</div>`, prefix + 'reports.html', release));
    for (const name of ['concepts', 'customer', 'development', 'modules', 'release', 'presentation']) {
      const input = name === 'presentation' ? 'presentation/README.md' : `docs/${name}.md`;
      const path = prefix + (name === 'presentation' ? 'presentation/index.html' : `docs/${name}.html`);
      const markdown = readFileSync(join(source, input), 'utf8');
      const title = markdown.match(/^# (.+)/m)?.[1] || name;
      write(path, shell(title, `<div class="document-toolbar"><span>${name === 'presentation' ? 'PRÄSENTATION' : 'DOKUMENTATION'}</span><button type="button" id="print">Drucken / PDF</button></div><article class="prose">${renderMarkdown(markdown)}</article>`, path, release));
    }
    function copyAssets(folder) {
      if (!existsSync(join(source, folder))) return;
      for (const entry of readdirSync(join(source, folder), { withFileTypes: true })) {
        const path = `${folder}/${entry.name}`;
        if (entry.isSymbolicLink()) throw new Error('Symlink in content');
        if (entry.isDirectory()) copyAssets(path);
        else write(prefix + path, readFileSync(join(source, path)));
      }
    }
    copyAssets('docs/assets'); copyAssets('presentation/images');
    if (!release) {
      const gallery = readdirSync(join(source, 'presentation/images')).filter(x => /\.(png|svg)$/.test(x)).map(x => `<figure><img src="${escape(x)}" alt="${escape(x)}"><figcaption>${escape(x)}</figcaption></figure>`).join('');
      write('presentation/images/index.html', shell('Präsentationsbilder', `<h1>Die Demo in Bildern</h1><article class="prose">${gallery}</article>`, 'presentation/images/index.html'));
    }
  }
  for (const name of ['style.css', 'app.js']) write('assets/' + name, readFileSync(join(root, 'assets', name)));
  write('.nojekyll', '');
  write('report-provenance.json', JSON.stringify(reports, null, 2));
  if (reportsSource) {
    const canonical = 'https://test-automation-pts.github.io/playbot-demo-reports';
    function copyReport(path) {
      const full = join(reportsSource, path);
      if (lstatSync(full).isSymbolicLink()) throw new Error('Symlink in report');
      if (lstatSync(full).isDirectory()) for (const name of readdirSync(full)) copyReport(path + '/' + name);
      else {
        let data = readFileSync(full);
        if (['.html', '.json'].includes(extname(path))) data = data.toString('utf8').replaceAll(canonical, manifest.url.replace(/\/$/, ''));
        write(path, data);
      }
    }
    for (const path of ['allure', 'pdf', 'runs']) if (existsSync(join(reportsSource, path))) copyReport(path);
  }
  console.log(`Built ${releases.length} release archives, current docs and ${reports.length} verified report views.`);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf('--reports');
  build({ reports: index >= 0 ? resolve(process.argv[index + 1]) : undefined });
}
