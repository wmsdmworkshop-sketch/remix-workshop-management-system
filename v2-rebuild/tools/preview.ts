/**
 * Workshop ERP v2 — domain model explorer.
 *
 *   npx tsx v2-rebuild/tools/preview.ts      (then open http://localhost:4400)
 *
 * WHAT THIS IS: a read-only view of `src/domain/job-card-status.ts`, rendered
 * directly from that module's exports on every request. Nothing about the model
 * is hand-written into the HTML, so this page cannot drift from it.
 *
 * WHAT THIS IS NOT: the Workshop ERP v2 application. v2 has no UI, no server and
 * no database. This is a developer tool for reviewing the domain model —
 * deliberately built on Node's built-in http so it commits to no stack, which
 * PROJECT_MEMORY.md §13 still lists as an open decision. Do not read it as a
 * prototype of the product.
 */
import { createServer } from 'node:http';

import {
  GUARDS,
  JOB_CARD_CREATION,
  JOB_CARD_STATUSES,
  JOB_CARD_SUB_STATUSES,
  JOB_CARD_TRANSITIONS,
  ROLES,
  SPEC_4_2_ENTRIES,
  SUB_STATUS_KIND,
  SUB_STATUS_PARENT,
  TRANSITION_NODES,
  WITH_SA_INDEPENDENT_GATES,
} from '../src/domain/job-card-status';
import type { AuthorityBasis, JobCardNode, JobCardSubStatus } from '../src/domain/job-card-status';

const PORT = Number(process.env.V2_PREVIEW_PORT || 4400);

const esc = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const isSubStatus = (node: JobCardNode): node is JobCardSubStatus =>
  (JOB_CARD_SUB_STATUSES as readonly string[]).includes(node);

const nodeChip = (node: JobCardNode): string =>
  isSubStatus(node)
    ? `<span class="chip sub">${esc(node)}</span>`
    : `<span class="chip">${esc(node)}</span>`;

const authorityCell = (basis: AuthorityBasis): string =>
  `<span class="auth ${basis}">${basis}</span>`;

const CITATION = /§([\d.]+)/;

const citationsCell = (citations: readonly string[]): string =>
  citations
    .map((c) => `<span class="cite">§${esc(CITATION.exec(c)?.[1] ?? c)}</span>`)
    .join(' ');

const rolesCell = (roles: readonly string[]): string =>
  roles.length > 0
    ? roles
        .map((r) => `<span class="role">${esc(ROLES[r as keyof typeof ROLES]?.label ?? r)}</span>`)
        .join(' ')
    : `<span class="muted">not specified</span>`;

function renderPage(): string {
  const statusCards = JOB_CARD_STATUSES.map((status, index) => {
    const subs = JOB_CARD_SUB_STATUSES.filter((sub) => SUB_STATUS_PARENT[sub] === status);
    const subList =
      subs.length > 0
        ? `<div class="subs">${subs
            .map(
              (sub) =>
                `<span class="chip sub ${SUB_STATUS_KIND[sub]}">${esc(sub)}<em>${
                  SUB_STATUS_KIND[sub] === 'concurrent-gate' ? 'gate' : 'step'
                }</em></span>`,
            )
            .join('')}</div>`
        : '';
    return `<li><span class="ord">${index + 1}</span>${nodeChip(status)}${subList}</li>`;
  }).join('');

  const transitions = JOB_CARD_TRANSITIONS.map(
    (t) => `<tr class="basis-${t.authorityBasis}">
      <td class="mono">${esc(t.id)}</td>
      <td>${nodeChip(t.from)}<span class="arrow">→</span>${nodeChip(t.to)}</td>
      <td class="trigger">${esc(t.trigger)}</td>
      <td>${rolesCell(t.roles)}<div class="basis-line">${authorityCell(t.authorityBasis)}</div></td>
      <td>${
        t.guards.length > 0
          ? t.guards.map((g) => `<span class="guard">${esc(g)}</span>`).join(' ')
          : '<span class="muted">—</span>'
      }</td>
      <td>${citationsCell(t.citations)}</td>
    </tr>`,
  ).join('');

  const unspecified = JOB_CARD_TRANSITIONS.filter((t) => t.authorityBasis === 'unspecified');
  const implied = JOB_CARD_TRANSITIONS.filter((t) => t.authorityBasis === 'implied');
  const explicit = JOB_CARD_TRANSITIONS.filter((t) => t.authorityBasis === 'explicit');

  const decisionRows = [
    ...unspecified.map(
      (t) =>
        `<tr class="open"><td class="mono">${esc(t.id)}</td><td>${nodeChip(t.from)}<span class="arrow">→</span>${nodeChip(t.to)}</td><td class="trigger">${esc(t.trigger)}</td><td><span class="auth unspecified">who performs this?</span></td></tr>`,
    ),
    ...implied.map(
      (t) =>
        `<tr><td class="mono">${esc(t.id)}</td><td>${nodeChip(t.from)}<span class="arrow">→</span>${nodeChip(t.to)}</td><td class="trigger">${esc(t.trigger)}</td><td>${rolesCell(t.roles)} <span class="muted">(confirm?)</span></td></tr>`,
    ),
  ].join('');

  const guardRows = Object.entries(GUARDS)
    .map(
      ([key, def]) =>
        `<tr><td class="mono">${esc(key)}</td><td>${esc(def.description)}</td><td>${citationsCell([def.citation])}</td></tr>`,
    )
    .join('');

  const traceRows = SPEC_4_2_ENTRIES.map(
    (entry) =>
      `<tr><td class="mono">${entry.ordinal}</td><td class="mono">${esc(entry.specName)}</td><td>${esc(
        entry.kind === 'status' ? 'top-level status' : 'sub-status',
      )}</td><td>${nodeChip(entry.key)}</td></tr>`,
  ).join('');

  const roleRows = Object.entries(ROLES)
    .map(
      ([key, def]) =>
        `<tr><td class="mono">${esc(key)}</td><td>${esc(def.label)}</td><td>${esc(def.specSection)}</td></tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Workshop ERP v2 — domain model</title>
<style>
  :root { --bg:#0f1117; --card:#171a23; --line:#262b38; --fg:#e6e9ef; --muted:#8b93a7;
          --green:#3fb950; --amber:#d29922; --red:#f85149; --blue:#58a6ff; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--bg); color:var(--fg);
         font:14px/1.55 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif; }
  .wrap { max-width:1180px; margin:0 auto; padding:32px 20px 80px; }
  h1 { font-size:22px; margin:0 0 4px; }
  h2 { font-size:15px; text-transform:uppercase; letter-spacing:.08em; color:var(--muted);
       margin:40px 0 12px; border-bottom:1px solid var(--line); padding-bottom:8px; }
  .warn { background:#2a1d10; border:1px solid #6b4a12; border-left:3px solid var(--amber);
          padding:12px 16px; border-radius:6px; margin:16px 0 8px; color:#f0d6a8; }
  .warn strong { color:#ffd479; }
  .sub { color:var(--muted); font-size:13px; }
  table { width:100%; border-collapse:collapse; background:var(--card);
          border:1px solid var(--line); border-radius:8px; overflow:hidden; }
  th,td { text-align:left; padding:9px 12px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { background:#1c202b; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); }
  tr:last-child td { border-bottom:none; }
  .mono { font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12.5px; }
  .chip { display:inline-block; padding:2px 8px; border-radius:5px; background:#20242f;
          border:1px solid var(--line); font-family:ui-monospace,monospace; font-size:12px; }
  .chip.sub { background:#1a1f2e; border-style:dashed; }
  .chip.sub em { color:var(--blue); font-style:normal; font-size:10px; margin-left:6px; text-transform:uppercase; }
  .arrow { color:var(--muted); margin:0 6px; }
  .auth { padding:2px 8px; border-radius:5px; font-size:11px; text-transform:uppercase; letter-spacing:.04em; }
  .auth.explicit { background:#12261a; color:var(--green); border:1px solid #1f4d2e; }
  .auth.implied  { background:#2a2110; color:var(--amber); border:1px solid #5c4413; }
  .auth.unspecified { background:#2b1416; color:var(--red); border:1px solid #5c1f24; }
  tr.basis-unspecified td { background:#1b1418; }
  .basis-line { margin-top:5px; }
  .guard { display:inline-block; padding:1px 7px; border-radius:4px; background:#151b26;
           border:1px solid #243049; color:#9db8e0; font-family:ui-monospace,monospace; font-size:11.5px; }
  .role { display:inline-block; padding:1px 7px; border-radius:4px; background:#1b1f2b;
          border:1px solid var(--line); font-size:12px; }
  .cite { display:inline-block; color:var(--muted); font-family:ui-monospace,monospace; font-size:11.5px; margin-right:5px; }
  .muted { color:var(--muted); }
  .trigger { color:#c3cad8; font-size:13px; }
  .scroll { overflow-x:auto; }
  .t-transitions { table-layout:fixed; min-width:900px; }
  .t-transitions th:nth-child(1), .t-transitions td:nth-child(1) { width:48px; }
  .t-transitions th:nth-child(2), .t-transitions td:nth-child(2) { width:182px; }
  .t-transitions th:nth-child(3), .t-transitions td:nth-child(3) { width:auto; }
  .t-transitions th:nth-child(4), .t-transitions td:nth-child(4) { width:196px; }
  .t-transitions th:nth-child(5), .t-transitions td:nth-child(5) { width:172px; }
  .t-transitions th:nth-child(6), .t-transitions td:nth-child(6) { width:72px; }
  .tiles { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-top:4px; }
  .tile { background:var(--card); border:1px solid var(--line); border-radius:8px; padding:14px 16px; }
  .tile b { display:block; font-size:26px; line-height:1.2; }
  .tile span { color:var(--muted); font-size:11.5px; text-transform:uppercase; letter-spacing:.06em; }
  .tile.good b { color:var(--green); } .tile.warn2 b { color:var(--amber); } .tile.bad b { color:var(--red); }
  ol.statuses { list-style:none; margin:0; padding:0; }
  ol.statuses li { display:flex; align-items:center; gap:10px; padding:8px 12px; background:var(--card);
                   border:1px solid var(--line); border-bottom:none; }
  ol.statuses li:first-child { border-radius:8px 8px 0 0; }
  ol.statuses li:last-child { border-bottom:1px solid var(--line); border-radius:0 0 8px 8px; }
  .ord { color:var(--muted); font-family:ui-monospace,monospace; font-size:12px; width:18px; }
  .subs { display:flex; gap:6px; flex-wrap:wrap; margin-left:auto; }
  code { background:#20242f; padding:1px 5px; border-radius:4px; font-size:12.5px; }
</style></head><body><div class="wrap">

<h1>Workshop ERP v2 — domain model</h1>
<p class="sub">Generated live from <code>v2-rebuild/src/domain/job-card-status.ts</code> on every request.</p>

<div class="warn">
  <strong>This is not the v2 application.</strong> v2 currently has no UI, no API and no database —
  only the specification and this domain module. This page exists to review the status model.
  It is deliberately built on Node's built-in <code>http</code> so that it commits to no stack;
  <code>PROJECT_MEMORY.md</code> §13 still lists the technology choice as an open decision.
</div>

<div class="tiles">
  <div class="tile"><b>${JOB_CARD_STATUSES.length}</b><span>statuses</span></div>
  <div class="tile"><b>${JOB_CARD_SUB_STATUSES.length}</b><span>sub-statuses</span></div>
  <div class="tile"><b>${JOB_CARD_TRANSITIONS.length}</b><span>transitions</span></div>
  <div class="tile good"><b>${explicit.length}</b><span>authority explicit</span></div>
  <div class="tile warn2"><b>${implied.length}</b><span>authority implied</span></div>
  <div class="tile bad"><b>${unspecified.length}</b><span>authority unstated</span></div>
</div>

<h2>§4.2 status sequence</h2>
<ol class="statuses">${statusCards}</ol>
<p class="sub" style="margin-top:10px">
  §4.2 numbers 13 entries but annotates two of them as sub-statuses, so the top-level machine has 11.
  The <span class="chip sub concurrent-gate">gate</span> chips are §5.4's <em>independent</em> gates —
  they open together on entering <code>with-sa</code> and have no transitions in or out, so nothing can
  quietly turn them into a sequence.
</p>

<h2>Transitions</h2>
<div class="scroll">
<table class="t-transitions"><thead><tr>
  <th>id</th><th>move</th><th>trigger</th><th>authority</th><th>preconditions</th><th>spec</th>
</tr></thead><tbody>${transitions}</tbody></table>
</div>

<h2>What the spec does not say</h2>
<table><thead><tr><th>id</th><th>move</th><th>trigger</th><th>status</th></tr></thead>
<tbody>${decisionRows}</tbody></table>
<p class="sub" style="margin-top:10px">
  The ${unspecified.length} red rows <strong>fail closed</strong>: <code>canTransition()</code> returns
  <code>denied-unspecified-authority</code> rather than naming a role the spec never names. §13 requires
  these to be raised as decisions, not assumptions.
</p>

<h2>Preconditions</h2>
<table><thead><tr><th>key</th><th>meaning</th><th>spec</th></tr></thead><tbody>${guardRows}</tbody></table>

<h2>§4.2 traceability</h2>
<table><thead><tr><th>#</th><th>spec entry</th><th>modelled as</th><th>key</th></tr></thead>
<tbody>${traceRows}</tbody></table>

<h2>Roles <span class="sub">— labels, not identifiers (§13 open item)</span></h2>
<table><thead><tr><th>key</th><th>label</th><th>spec</th></tr></thead><tbody>${roleRows}</tbody></table>

<p class="sub" style="margin-top:40px">
  ${TRANSITION_NODES.length} transition nodes ·
  ${WITH_SA_INDEPENDENT_GATES.length} independent gates ·
  creation is <code>${esc(JOB_CARD_CREATION.createsStatus)}</code> by ${esc(JOB_CARD_CREATION.roles.join(', '))} ·
  machine JSON at <code>/model.json</code>
</p>

</div></body></html>`;
}

const server = createServer((req, res) => {
  const url = req.url ?? '/';

  if (url.startsWith('/model.json')) {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(
      JSON.stringify(
        {
          statuses: JOB_CARD_STATUSES,
          subStatuses: JOB_CARD_SUB_STATUSES,
          subStatusParent: SUB_STATUS_PARENT,
          subStatusKind: SUB_STATUS_KIND,
          transitions: JOB_CARD_TRANSITIONS,
          guards: GUARDS,
          roles: ROLES,
          spec42: SPEC_4_2_ENTRIES,
          creation: JOB_CARD_CREATION,
        },
        null,
        2,
      ),
    );
    return;
  }

  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
  res.end(renderPage());
});

server.listen(PORT, () => {
  console.log('Workshop ERP v2 — domain model explorer');
  console.log(`  http://localhost:${PORT}`);
  console.log('  not the v2 application — see the banner on the page');
});
