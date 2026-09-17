# Public portal

Keep this a static, dependency-light GitHub Pages site. User-visible content
comes from the framework's allowlisted documentation export in `content/`.
Do not copy private source trees, tests, inputs or credentials here.

Use Node 22+, `npm ci`, `npm test`, and `npm run build`. Preserve relative URLs
so the complete site works below `/playbot-portal/`. A missing report snapshot
must remain visible as unavailable. Never fabricate results or associate a
report with a release based only on its date.

For feature MRs, update the framework presentation using its
`.codex/skills/playbot-presentation/SKILL.md` and re-export the content.
