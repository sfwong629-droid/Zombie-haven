/* ---------------- 3D.379 W274 step 1: test towns (owner, 25 Nov: "A large part of the game I am not able to test because it will take time to
   reach the level or area"; "w274 yes to plan"). Title screen → Test towns: ready-made towns the balance bot played up to levels 3 to 20
   (assets/testtowns/, remade by tools/build/test_towns.py when saves change). One loads into slot 3, never slot 1: the town that was in slot 3
   stays as that slot's day backup, as with Backups → Import. A test town is marked (S.testTown): it never sets a trophy record or leaves a
   legacy, and its name says it is a test. ---------------- */
const TT_DIR = 'assets/testtowns/', TT_SLOT = 2;
const testTown = () => !!(S && S.testTown);
let ttArm = null;
async function ttIndex() { const r = await fetch(TT_DIR + 'index.json', { cache: 'no-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); }
function ttButton() {   /* the title's button, made here so the published page (its own index.html) gets it too */
  if ($('tTT')) return; const g = $('tGear') || $('tSvt'); if (!g) return; const b = document.createElement('button'); b.className = 'act tbtn'; b.id = 'tTT'; b.textContent = 'Test towns'; g.after(b); b.onclick = () => { ttArm = null; showTestTowns(); };
}
function showTestTowns(msg) {
  $('title').style.display = 'none'; const box = $('slots'); box.style.display = 'flex'; box.querySelector('.sHead').textContent = 'Test towns'; $('sBak').style.display = 'none';
  const list = box.querySelector('.slist'); list.innerHTML = '<div class="card sm">Loading…</div>'; $('sBack').onclick = () => { ttArm = null; showTitle(); };
  ttIndex().then((idx) => { const x = slotInfo(TT_SLOT), keep = x && !x.broken && !x.test;
    list.innerHTML = (msg ? `<div class="card sm" id="ttMsg" style="color:#b0402a">${esc(msg)}</div>` : '') + `<div class="card sm" id="ttNote" style="color:#2a2a5a;background:#f3f6f9">Towns played ahead by the bot. One loads into <b>slot 3</b>${keep ? `, in place of ${esc(x.name)} (Day ${x.day}), which is kept as the slot's backup` : ''}. Slot 1 is never touched.</div>`
      + idx.towns.map((t) => `<div class="slot" data-tt="${t.lvl}"><span class="snum">${t.lvl}</span><span class="sinfo"><b>Level ${t.lvl}</b><small>Day ${t.day} · 👥 ${t.pop} · 🏠 ${t.bld}</small><small class="sago">${ttArm === t.lvl ? 'Tap again to replace slot 3' : 'Made with ' + esc(idx.build || '?')}</small></span></div>`).join('');
    list.querySelectorAll('[data-tt]').forEach((el) => { el.onclick = () => ttLoad(+el.dataset.tt, keep, idx); });
  }).catch((e) => { list.innerHTML = `<div class="card sm" id="ttMsg">The test towns could not be loaded (${esc(String(e && e.message || e))}).</div>`; });
}
async function ttLoad(lvl, keep, idx) {
  if (keep && ttArm !== lvl) { ttArm = lvl; showTestTowns(); return; }
  const t = idx.towns.find((q) => q.lvl === lvl); let o;
  try { const r = await fetch(TT_DIR + t.file, { cache: 'no-cache' }); if (!r.ok) throw new Error('HTTP ' + r.status); o = await r.json(); } catch (e) { showTestTowns('Could not load the level ' + lvl + ' town (' + (e && e.message || e) + ').'); return; }
  const sv = o.zhBackup ? o.save : o; if (!sv || !sv.S) { showTestTowns('The level ' + lvl + ' town file is damaged.'); return; }
  sv.S.testTown = { lvl, build: idx.build || '' }; sv.S.townName = 'Test · Level ' + lvl;
  const w = importBackup(TT_SLOT, JSON.stringify(o.zhBackup ? { ...o, save: sv } : sv)); ttArm = null; if (!w.ok) { showTestTowns(w.why); return; }
  playSlot(TT_SLOT);
}
