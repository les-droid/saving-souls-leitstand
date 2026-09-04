#!/usr/bin/env node
// Saving Souls – Listener auf Schnitt 11
// Nimmt Claude-Aufgaben aus dem Leitstand (To-do, Art „Claude-Aufgabe“, „Jetzt erledigen“ gedrückt),
// führt sie mit Claude Code im Repo aus, streamt die Ausgabe live ins Board, hakt das To-do ab,
// schreibt eine Team-Notiz. Realtime per WebSocket, Fallback Polling.
//
// Start: node listener.mjs   (Konfiguration in .env, siehe .env.example)

import { createClient } from '@supabase/supabase-js';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(here, '.env');
if (existsSync(envPath)) for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const must = k => { if (!process.env[k]) { console.error(`Fehlt in .env: ${k}`); process.exit(1); } return process.env[k]; };
const cfg = {
  url: must('SUPABASE_URL'),
  key: must('SUPABASE_SERVICE_KEY'),                  // service_role – nur hier, nie ins Board/Repo
  repo: process.env.REPO_DIR || process.env.HOME + '/saving-souls-gedaechtnis',
  claude: process.env.CLAUDE_BIN || 'claude',
  args: (process.env.CLAUDE_ARGS || '--permission-mode acceptEdits').split(' ').filter(Boolean),
  timeoutMin: Number(process.env.TIMEOUT_MIN || 45),
  pollSec: Number(process.env.POLL_SEC || 30),
  gitPush: (process.env.GIT_PUSH || 'true') === 'true',
};

const sb = createClient(cfg.url, cfg.key, { auth: { persistSession: false } });
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const iso = () => new Date().toISOString();
const patch = (id, p) => sb.rpc('docs_patch', { p_collection: 'todos', p_id: id, p_patch: p, p_by: 'schnitt11' });

// ---- Warteschlange (seriell) ---------------------------------------------
let laeuft = false; const queue = [];
function enqueue(id) { if (!queue.includes(id)) queue.push(id); if (!laeuft) void arbeite(); }
async function arbeite() {
  laeuft = true;
  while (queue.length) { const id = queue.shift(); try { await fuehreAus(id); } catch (e) { log('Fehler', id, e); } }
  laeuft = false;
}

// ---- Ausführung -----------------------------------------------------------
async function fuehreAus(id) {
  const { data: todo, error } = await sb.rpc('s11_claim', { p_id: id });
  if (error) throw error;
  if (!todo) return;                                   // schon vergeben / erledigt / nicht angefordert
  log('▶', todo.angefordertVon || todo.wer, ':', todo.text);

  const prompt = [
    `Du bist Claude Code auf Schnitt 11 im Repo ${cfg.repo} (Doku "Saving Souls" / Safe Haven Crew, Team LES + JB).`,
    `Videomaterial liegt auf dem RAID "260410 Safe Haven Crew" und wird nie bewegt, umbenannt oder gelöscht.`,
    `Lies zuerst README/CLAUDE.md im Repo, falls vorhanden.`,
    ``,
    `Aufgabe aus dem Leitstand (angefordert von ${todo.angefordertVon || todo.wer || 'Team'}):`,
    `TITEL: ${todo.text}`,
    todo.beschreibung ? `BESCHREIBUNG: ${todo.beschreibung}` : '',
    ``,
    `Arbeite die Aufgabe vollständig ab. Ergebnisse als Dateien ins Repo, Commit-Message beginnt mit "[leitstand]".`,
    `Antworte zum Schluss mit einer Zusammenfassung von höchstens 10 Zeilen für das Team – sie erscheint im Board.`,
  ].join('\n');

  const out = []; let lastPush = 0; let abgebrochen = false;
  const child = spawn(cfg.claude, ['-p', prompt, '--output-format', 'text', ...cfg.args],
    { cwd: cfg.repo, env: { ...process.env, CI: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const timeout = setTimeout(() => { log('Timeout', id); child.kill('SIGTERM'); }, cfg.timeoutMin * 60_000);

  // Abbruch: im Board „angefordert“ zurücksetzen oder To-do löschen → wir stoppen
  const watch = setInterval(async () => {
    const { data } = await sb.from('docs').select('data').eq('collection', 'todos').eq('id', id).maybeSingle();
    if (!data || data.data?.s11status === 'abgebrochen' || data.data?.angefordert === false) { abgebrochen = true; child.kill('SIGTERM'); }
  }, 5_000);

  const push = async (force = false) => {
    if (!force && Date.now() - lastPush < 2_000) return;
    lastPush = Date.now();
    await patch(id, { s11fortschritt: out.join('').slice(-2_000) });
  };
  for (const s of [child.stdout, child.stderr]) { s.setEncoding('utf8'); s.on('data', c => { out.push(c); void push(); }); }

  const code = await new Promise(r => child.on('close', r));
  clearTimeout(timeout); clearInterval(watch);
  if (abgebrochen) { await patch(id, { s11status: 'abgebrochen', s11fortschritt: null }); log('✕ abgebrochen', id); return; }

  if (cfg.gitPush) await sh('git', ['push'], cfg.repo).catch(e => out.push('\n[git push fehlgeschlagen] ' + e));

  const ergebnis = out.join('').trim().slice(-50_000) || '(keine Ausgabe)';
  const ok = code === 0;
  await patch(id, { s11status: ok ? 'fertig' : 'fehler', s11ergebnis: ergebnis, s11fortschritt: null, s11beendetAm: iso(), done: ok });
  const kurz = ergebnis.split(/\n\s*\n/).pop().slice(0, 1_500);
  await sb.from('docs').insert({ collection: 'notes', id: crypto.randomUUID(), updated_by: 'schnitt11',
    data: { text: `${ok ? '✓' : '✗'} Claude-Aufgabe „${todo.text}“ (Schnitt 11):\n${kurz}`, wer: 'Claude', created: iso() } });
  log(ok ? '✓' : '✗', id, `exit ${code}`);
}

function sh(cmd, args, cwd) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }); let o = '';
    p.stdout.on('data', d => o += d); p.stderr.on('data', d => o += d);
    p.on('close', c => c === 0 ? res(o) : rej(o));
  });
}

// ---- Realtime + Polling ------------------------------------------------------
const istOffen = d => d?.typ === 'claude' && d.angefordert === true && !d.done && !['laeuft', 'fertig'].includes(d.s11status);
async function holeOffene() {
  const { data, error } = await sb.from('docs').select('id,data').eq('collection', 'todos');
  if (error) { log('Polling-Fehler', error.message); return; }
  data.filter(r => istOffen(r.data)).sort((a, b) => String(a.data.angefordertAm || '').localeCompare(String(b.data.angefordertAm || '')))
    .forEach(r => enqueue(r.id));
}
sb.channel('listener-schnitt11')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'docs', filter: 'collection=eq.todos' },
      p => { if (p.new && istOffen(p.new.data)) enqueue(p.new.id); })
  .subscribe(st => log('Realtime:', st));

await sh('git', ['pull', '--rebase', '--autostash'], cfg.repo).catch(e => log('git pull:', String(e).slice(0, 200)));
await holeOffene();
setInterval(holeOffene, cfg.pollSec * 1_000);
log(`Listener bereit · Repo ${cfg.repo} · wartet auf Claude-Aufgaben aus dem Leitstand`);
