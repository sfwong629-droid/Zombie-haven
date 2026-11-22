"""Whole-game bug sweep (Bugs chat, 21 Nov 2026). The owner: "Can you do a bugs test for the whole game during the whole game play?"
One bot town played from day 1 for as many game days as the budget allows (to level 20 and past), using the Balance chat's long-run harness
(tools/balance/long_study.py: same bot, same daily logic checks), plus the bug checks below. The game is not changed.

    python3 tools/qa/bug_sweep.py SEED MAX_DAYS BUDGET_SECONDS OUT_DIR

Extra checks (hourly unless said; each finding is written once, with the day):
  stuck walker      a survivor with a path who has not moved for 3 game hours
  on a wall         a survivor (2 hours running) or zombie standing on a solid wall tile
  off the map       anyone outside the map
  can't reach       how often survivors give up on a target ("Couldn't reach", "Can't reach"); one survivor 6+ times in a day is flagged
  emoji flapping    the same emoji put back on one survivor 8+ times in one game hour (bugs A2, A10)
  bad text          'undefined', 'NaN', 'null', '[object' in names, status lines, the event log, the Needs you list; children named "Kid N"
  rough with beds   people sleeping rough while the town has a free bed
  stale Needs you   a row in the Needs you list for 48 game hours
  broken links      a survivor working at, or living in, a building that no longer exists; duplicate ids; a dead person still in the town
  buildings         two buildings on the same tile; a building on a wall
  over the cap      a stock more than 10% above its limit
  long trips        a trip out for more than 5 game days; a stronghold fight longer than 1 game day
  dead zombies      more than 300 dead zombies kept in the list (a leak)
  save and load     every 15 game days the town is saved, loaded in a fresh page and played for 2 game hours: anything lost or changed, any error
Writes OUT_DIR/s<seed>.jsonl (long_study's daily line plus 'bug' fields), backups every 10 days, and OUT_DIR/s<seed>_bugs.json (all findings)."""
import asyncio, sys, os, json, time, re
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'tests'))
import run_tests as R
from playwright.async_api import async_playwright
# the long-run harness (SETUP, DAY, AP) without running its main()
_src = open(os.path.join(ROOT, 'tools', 'balance', 'long_study.py')).read().replace('asyncio.run(main())', '')
LS = {'__file__': os.path.join(ROOT, 'tools', 'balance', 'long_study.py')}; exec(compile(_src, 'long_study.py', 'exec'), LS)
SETUP, DAY, AP = LS['SETUP'], LS['DAY'], LS['AP']
EXPOSE = 'alerts, hubItems, bedFor, facilityUsers,'

BUG = r"""() => {
  const Z = ZH, S = Z.S, W = Z.world, Wd = Z.Wd, D = Wd.DEFS;
  const B = window.BUG = { found: [], keys: {}, day: {}, emo: new WeakMap(), pos: new WeakMap(), onWall: new WeakMap(), hub: new Map(), logN: (S.log || []).length, reach: {}, lastWhy: new WeakMap() };
  const flag = (k, v) => { const key = k + '|' + v.replace(/day \d+/, ''); if (B.keys[key]) { B.keys[key].n++; return; } B.keys[key] = { k, v, d: S.day, h: S.hour, n: 1 }; B.found.push(B.keys[key]); };
  B.flag = flag;
  const solid = (x, y) => { const wl = Wd.wallAt(W, Math.floor(x), Math.floor(y)); return !!wl && !wl.broken && wl.type !== 'gate'; };
  const BAD = /undefined|NaN|\[object|\bnull\b/;
  const who = (s) => (s.name || s.id) + ' (' + s.job + ', ' + s.mode + (s.purpose ? '/' + s.purpose : '') + ')';
  const tick0 = AP.tick, hour0 = AP.hour;
  AP.tick = function () { tick0();
    for (const s of S.sv) { const e = s.emo; if (!e) continue; const m = B.emo.get(s) || { last: null, n: {}, h: S.day * 24 + S.hour }; if (m.h !== S.day * 24 + S.hour) { m.n = {}; m.h = S.day * 24 + S.hour; }
      if (e !== m.last) { m.last = e; m.n[e.t] = (m.n[e.t] || 0) + 1; if (m.n[e.t] === 8) flag('emoji flapping', (e.t || '?') + ' on ' + who(s) + ' 8 times in one game hour' + (s.why ? ' — ' + s.why : '') + ' day ' + S.day); }
      B.emo.set(s, m); }
    for (const s of S.sv) { const w = s.why || ''; if (w !== B.lastWhy.get(s)) { B.lastWhy.set(s, w); if (/Couldn.t reach|Can.t reach/i.test(w)) { B.day.reach = (B.day.reach || 0) + 1; const k = (s.name || s.id) + ' → ' + w.replace(/ —.*| \(.*/, '') + (s.noReach && s.noReach.b ? ' ' + s.noReach.b.type : ''); B.reach[k] = (B.reach[k] || 0) + 1; if (B.reach[k] === 6) flag("can't reach the same thing 6 times in a day", k + ' day ' + S.day); } } }
  };
  AP.hour = function () { hour0();
    const H = S.day * 24 + S.hour;
    for (const s of S.sv) {
      if (!s.w) continue; const away = ['away', 'errand', 'hospital'].includes(s.mode) || s.away;
      if (!away && Wd.inMap && !Wd.inMap(Math.floor(s.w.x), Math.floor(s.w.y))) flag('survivor off the map', who(s) + ' at ' + s.w.x.toFixed(1) + ',' + s.w.y.toFixed(1) + ' day ' + S.day);
      if (!away && solid(s.w.x, s.w.y)) { const n = (B.onWall.get(s) || 0) + 1; B.onWall.set(s, n); if (n === 2) flag('survivor standing on a wall', who(s) + ' at ' + Math.floor(s.w.x) + ',' + Math.floor(s.w.y) + ' day ' + S.day); } else B.onWall.set(s, 0);
      const key = Math.round(s.w.x * 4) + ',' + Math.round(s.w.y * 4), p = B.pos.get(s);
      if (p && p.key === key && s.path && s.path.length && !away) { p.n++; if (p.n === 3) flag('stuck walker (has a path, has not moved for 3 game hours)', who(s) + ' at ' + Math.floor(s.w.x) + ',' + Math.floor(s.w.y) + (s.why ? ' — ' + s.why : '') + ' day ' + S.day); } else B.pos.set(s, { key, n: 0 });
      for (const t of [s.name, s.why, s.job]) if (t && BAD.test(String(t))) flag('bad text on a survivor', String(t).slice(0, 80) + ' day ' + S.day);
      if (/^Kid \d/.test(s.name || '')) flag('child named "Kid N"', s.name + ' day ' + S.day);
      if (s.facility && !W.buildings.includes(s.facility)) flag('survivor going to a building that is gone', who(s) + ' → ' + (s.facility.type || '?') + ' day ' + S.day);
      for (const k of ['home', 'housing', 'work', 'post']) { const b = s[k]; if (b && typeof b === 'object' && b.type && D[b.type] && !W.buildings.includes(b)) flag('survivor linked to a building that is gone', who(s) + ' ' + k + ' → ' + b.type + ' day ' + S.day); }
      if (s.hp <= 0 && s.mode !== 'down') flag('survivor at 0 health but not down', who(s) + ' day ' + S.day);
    }
    const ids = new Set(); for (const s of S.sv) { if (ids.has(s.id)) flag('two survivors with the same id', String(s.id)); ids.add(s.id); }
    for (const f of S.fallen || []) if (f.id != null && ids.has(f.id) && S.sv.find((q) => q.id === f.id && q.name === f.name)) flag('a fallen survivor is still in the town', f.name + ' day ' + S.day);
    for (const z of S.z) { if (z.hp <= 0 || !z.w) continue; if (solid(z.w.x, z.w.y) && !z.human) flag('zombie standing on a wall', z.type + ' ' + z.mode + ' at ' + Math.floor(z.w.x) + ',' + Math.floor(z.w.y) + ' day ' + S.day); if (Wd.inMap && !Wd.inMap(Math.floor(z.w.x), Math.floor(z.w.y)) && z.mode !== 'zleave' && !z.edge) { const n = (z.__off = (z.__off || 0) + 1); if (n === 3) flag('zombie off the map for 3 game hours', z.type + ' ' + z.mode + ' day ' + S.day); } }
    const deadZ = S.z.filter((z) => z.hp <= 0).length; if (deadZ > 300) flag('dead zombies kept in the list', deadZ + ' day ' + S.day);
    /* the event log since last hour */
    const L = S.log || []; for (let i = Math.max(0, Math.min(B.logN, L.length)); i < L.length; i++) { const t = (L[i] && (L[i].t || L[i].text || L[i])) + ''; if (BAD.test(t)) flag('bad text in the event log', t.slice(0, 100) + ' day ' + S.day); } B.logN = L.length;
    /* the Needs you list */
    let items = []; try { items = Z.hubItems(); } catch (e) { flag('Needs you list throws', String(e).slice(0, 120)); }
    const seen = new Set(); for (const it of items) { const k = it.key; seen.add(k); if (!B.hub.has(k)) B.hub.set(k, H); else if (H - B.hub.get(k) === 48) flag('a Needs you row stays 48 game hours', String(it.text || k).replace(/<[^>]+>/g, '').slice(0, 90) + ' day ' + S.day);
      const t = String(it.text || ''); if (BAD.test(t.replace(/<[^>]+>/g, ''))) flag('bad text in the Needs you list', t.replace(/<[^>]+>/g, '').slice(0, 90) + ' day ' + S.day); }
    for (const k of [...B.hub.keys()]) if (!seen.has(k)) B.hub.delete(k);
    /* sleeping rough while beds are free (night hours) */
    if (S.hour === 1) { const rough = S.sv.filter((s) => s.sleeping === 'rough' && !['away', 'errand'].includes(s.mode)), inTown = S.sv.filter((s) => !['away', 'errand'].includes(s.mode)).length, beds = Z.bedCount ? Z.bedCount() : 0;
      if (rough.length && beds >= inTown) flag('people sleep rough while there are free beds', rough.length + ' rough, ' + inTown + ' people, ' + beds + ' beds day ' + S.day); B.day.rough = rough.length; }
    /* buildings */
    if (S.hour === 3) { const occ = new Map(); for (const b of W.buildings) { const r = b.rot ? Wd.rotDef(D[b.type], b.rot) : D[b.type], w = b.w || (r && r.w) || 1, h = b.h || (r && r.h) || 1;
        for (let y = b.y; y < b.y + h; y++) for (let x = b.x; x < b.x + w; x++) { const k = x + ',' + y; if (occ.has(k) && occ.get(k) !== b) flag('two buildings on one tile', occ.get(k).type + ' and ' + b.type + ' at ' + k + ' day ' + S.day); occ.set(k, b); if (solid(x + .5, y + .5)) flag('a building on a wall tile', b.type + ' at ' + k + ' day ' + S.day); } } }
    /* stock caps */
    const caps = { food: Z.supplyCap && Z.supplyCap(), water: Z.supplyCap && Z.supplyCap(), wood: Z.matCap && Z.matCap(), mat: Z.scrapCap && Z.scrapCap() };
    for (const [k, c] of Object.entries(caps)) if (c && S[k] > c * 1.1 + 2) flag('stock above its cap', k + ' ' + Math.round(S[k]) + ' / ' + c + ' day ' + S.day);
    /* trips and strongholds */
    if (S.trip) { B.tripH = (B.tripH || 0) + 1; if (B.tripH === 120) flag('a trip out for 5 game days', (S.trip.dest || '?') + ' day ' + S.day); } else B.tripH = 0;
    if (S.sh) { B.shH = (B.shH || 0) + 1; if (B.shH === 24) flag('a stronghold fight longer than a game day', (S.sh.dest || '?') + ' day ' + S.day); } else B.shH = 0;
    if (S.lvUp && !isFinite(S.lvUp.left)) flag('level timer not a number', String(S.lvUp.left));
  };
  B.dayOut = () => { const o = { ...B.day, mission: S.mission ? String(S.mission.text || S.mission.t || S.mission.name || '').slice(0, 80) : '', logLen: (S.log || []).length, hub: (() => { try { return Z.hubItems().length; } catch (e) { return -1; } })(), new: B.found.length }; B.day = {}; B.reach = {}; return o; };
}"""

SNAP = """() => { const S = ZH.S, W = ZH.world; const r = (v) => typeof v === 'number' ? Math.round(v * 10) / 10 : v;
  return { day: S.day, hour: S.hour, lvl: S.lvl, rank: S.rank, terr: S.terr || 0,
    sv: S.sv.map((s) => [s.id, s.name, s.job, Math.round(s.hp) + "/" + Math.round(s.max), s.l, s.spec || '', s.pet ? 1 : 0]).sort((a, b) => a[0] - b[0]),
    b: W.buildings.map((b) => b.type + '@' + b.x + ',' + b.y + (b.burnt ? '!' : '')).sort(), walls: W.walls.size,
    stock: Object.fromEntries(['food', 'water', 'wood', 'stone', 'mat', 'fuel', 'meds', 'ammo', 'cloth', 'ren', 'rp'].map((k) => [k, r(S[k])])),
    res: Object.keys(S.res || {}).sort(), inv: (S.inv || []).length, banners: (S.banners || []).length, fallen: (S.fallen || []).length,
    kids: (S.kids || []).length, pets: (S.pets || []).length, sites: (S.sites || []).length, trip: !!S.trip, posts: (S.posts || []).length, tools: JSON.stringify(S.tools || {}), veh: Object.keys(S.veh || {}).sort() } }"""

def diff_snap(a, b):
    out = []
    for k in a:
        if k in ('stock',):
            for r in a[k]:
                x, y = a[k][r], b[k].get(r)
                if x != y and not (isinstance(x, (int, float)) and isinstance(y, (int, float)) and abs(x - y) <= max(1, abs(x) * .02)): out.append('%s %s -> %s' % (r, x, y))
        elif a[k] != b[k]:
            if isinstance(a[k], list):
                sa, sb = set(map(json.dumps, a[k])), set(map(json.dumps, b[k])); out.append('%s: lost %s; new %s' % (k, list(sa - sb)[:4], list(sb - sa)[:4]))
            else: out.append('%s %s -> %s' % (k, a[k], b[k]))
    return out

async def open_game(br, port, tag, save=None, now=None):
    ctx = await br.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    async def expose(route):
        res = await route.fetch(); t = (await res.text()).replace('window.ZH = { BUILD_TAG,', 'window.ZH = { BUILD_TAG, ' + EXPOSE, 1)
        await route.fulfill(body=t, content_type='application/javascript')
    await ctx.route(re.compile(r'js/game\.js'), expose)
    if now: await ctx.add_init_script("(()=>{const n0=%d,p0=performance.now();Date.now=()=>n0+Math.round(performance.now()-p0);})();" % now)   # the sim page's clock, so the load sees no time away
    if save: await ctx.add_init_script("try{if(!sessionStorage.getItem('zhPut')){localStorage.setItem('zombieHavenR1'," + json.dumps(save) + ");localStorage.setItem('zhSlot','1');sessionStorage.setItem('zhPut','1');}}catch(e){}")
    pg = await ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
    await pg.goto(f'http://127.0.0.1:{port}/index.html?test={tag}&nocut=1')
    await pg.wait_for_function('window.ZH && ZH.S && ZH.S.sv.length > 0', timeout=30000)
    await pg.evaluate("()=>{window.requestAnimationFrame=()=>0}")
    return ctx, pg, errs

async def round_trip(br, port, pg, seed):
    """Save, load the save in a fresh page, compare, play 2 game hours there."""
    raw = await pg.evaluate("()=>{ZH.saveGame&&ZH.saveGame();const t=ZH.backupText((ZH.SLOT||1)-1);return t}")
    if not raw: return ['no save text']
    now = await pg.evaluate("()=>Date.now()"); save = json.loads(raw); save = json.dumps({**(save.get('save') or save), 'sid': 'import', 'time': now})
    a = await pg.evaluate(SNAP)
    ctx, p2, errs = await open_game(br, port, 'rt%d' % seed, save, now)
    out = []
    try:
        b = await p2.evaluate(SNAP); out += diff_snap(a, b)
        await p2.evaluate("()=>{for(let h=0;h<2;h++)ZH.step(1000)}")
        if errs: out.append('errors after loading: ' + ' | '.join(errs[:3]))
    except Exception as e: out.append('loaded game failed: ' + str(e)[:300])
    finally: await ctx.close()
    return out

async def main():
    seed, maxd, budget, out = int(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
    os.makedirs(out, exist_ok=True); t0 = time.time(); srv, port = R.serve()
    async with async_playwright() as p:
        br = await p.chromium.launch(); res = os.environ.get('RESUME')   # RESUME=backup.json: carry on a town from one of this tool's backups
        if res:
            b = json.load(open(res)); sv = b.get('save') or b; t_ = sv.get('time') or int(time.time() * 1000)
            ctx, pg, errs = await open_game(br, port, 'bug%d' % seed, json.dumps({**sv, 'sid': 'import', 'time': t_}), t_)
        else: ctx, pg, errs = await open_game(br, port, 'bug%d' % seed)
        await pg.evaluate(SETUP, seed)
        if res: await pg.evaluate("()=>{__awayMs=-ZH.tick*1000/60}")   # keep the clock where the save left it
        await pg.evaluate("()=>0"); await pg.evaluate(AP); await pg.evaluate("()=>{AP.exp=true;AP.long=true;AP.expert=true}"); await pg.evaluate(BUG)
        f = open(os.path.join(out, 's%d.jsonl' % seed), 'a' if res else 'w'); n = 0; rts = []
        while n < maxd and time.time() - t0 < budget:
            d = await pg.evaluate(DAY, 24); d['bug'] = await pg.evaluate("()=>BUG.dayOut()")
            d['errs'] = errs[:]; errs.clear()
            if d['errs']: await pg.evaluate("(e)=>{for(const x of e)BUG.flag('page error',x.slice(0,200)+' day '+ZH.S.day)}", d['errs'])
            for x in d.get('timerErrs') or []: await pg.evaluate("(x)=>BUG.flag('error in a timer',x.slice(0,200))", x)
            if d.get('stepErr'): await pg.evaluate("(x)=>BUG.flag('the game step threw',x.slice(0,200))", d['stepErr'])
            for x in d.get('issues') or []: await pg.evaluate("(x)=>BUG.flag('long-run check',x)", x)
            n += 1
            if n % int(os.environ.get('RT_EVERY', '15')) == 0:
                try: rt = await round_trip(br, port, pg, seed)
                except Exception as e: rt = ['round trip failed: ' + str(e)[:200]]
                d['roundTrip'] = rt; rts.append({'day': d['day'], 'diff': rt})
                for x in rt: await pg.evaluate("(x)=>BUG.flag('save and load',x.slice(0,240)+' day '+ZH.S.day)", x)
            f.write(json.dumps(d) + '\n'); f.flush()
            if n % 10 == 0:
                try:
                    t = await pg.evaluate("()=>{ZH.saveGame&&ZH.saveGame();return ZH.backupText((ZH.SLOT||1)-1)}")
                    if t: open(os.path.join(out, 's%d_d%d.json' % (seed, d['day'])), 'w').write(t)
                except Exception as e: print('backup failed', e, flush=True)
            if n % 5 == 0 or n < 3:
                found = await pg.evaluate("()=>BUG.found.length")
                print('seed', seed, 'day', d['day'], 'level', d.get('hl'), 'pop', d['sv'], 'bld', d['nb'], 'ms', d['ms'], 'findings', found, 'reach', d['bug'].get('reach', 0), flush=True)
            json.dump({'found': await pg.evaluate("()=>BUG.found"), 'roundTrips': rts, 'days': n, 'resumed': res}, open(os.path.join(out, 's%d_bugs%s.json' % (seed, '_r' if res else '')), 'w'), indent=0)
            if d.get('stepErr') or d.get('sv', 1) == 0: break
        await br.close()
    print('done seed', seed, 'days', n, 'in', round(time.time() - t0), 's')
asyncio.run(main())
