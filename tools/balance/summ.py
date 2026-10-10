import json,sys,glob,collections
for f in sorted(glob.glob(sys.argv[1])):
    L=[json.loads(l) for l in open(f)]; rows=L[:-1]; fin=L[-1]['final']
    def at(d):
        for r in rows:
            if r['d']>=d: return r
        return rows[-1]
    r10,r20,r30,rl=at(10),at(20),at(30),rows[-1]
    rk=lambda k:next((r['d'] for r in rows if r['rank']>=k),None)
    tr=lambda k:next((r['d'] for r in rows if r['terr']>=k),None)
    dh=collections.Counter(('night' if (x['h']>=20 or x['h']<6) else 'day') for x in fin.get('deaths',[]))
    boss=sum(1 for x in fin.get('deaths',[]) if 'boss' in x['z'])
    print(f"{f.split('/')[-1]:14} dead {rl['fallen']:3} (d10 {r10['fallen']}, d20 {r20['fallen']}, d30 {r30['fallen']}) {dict(dh)} bossNight {boss} | rank2 d{rk(2)} r3 d{rk(3)} r4 d{rk(4)} r5 d{rk(5)} | terr1 d{tr(1)} t2 d{tr(2)} t3 d{tr(3)} | bld d10 {r10['nb']} d20 {r20['nb']} d30 {r30['nb']} end {rl['nb']} | lvl {rl['lvl']} res {rl['res']} burnt {rl['burnt']} inc {rl['inc']} | food {rl['food']} water {rl['water']} | grades {sorted(set(r['grade'] for r in rows if r['grade']))}")
    led=fin.get('ledger',{}); print('   parts in', sum(v for v in led.values() if v>0), 'walls', -(led.get('autoRepair-',0)+led.get('tryWall-',0)), 'buildings', -led.get('place-',0), 'upkeep', -led.get('payUpkeep-',0), 'gear', -led.get('finishFacility-',0))
