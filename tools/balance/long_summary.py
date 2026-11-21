import json,sys,glob,collections
D=sys.argv[1]
for f in sorted(glob.glob(D+'/s*.jsonl')):
    ds=[json.loads(l) for l in open(f)]; sd=f.split('/s')[-1].split('.')[0]
    print('\n=== seed',sd,'days',len(ds),'last day',ds[-1]['day'])
    lv={}
    for d in ds: lv.setdefault(d['lvl'],d['day'])
    print('level first reached on day:',lv)
    print('banners:',[(d['day'],d['banners']) for i,d in enumerate(ds) if i==0 or d['banners']!=ds[i-1]['banners']][1:])
    print('day lvl pop/cap fall bld  food water wood stone mat fuel meds ammo cloth | caps | res rp ren | zNight peakN zLeftDawn | sat hp | ms')
    for d in ds:
        if d['day']%10==0 or d is ds[-1]:
            print(f"{d['day']:>3} {d['lvl']:>2} {d['pop']:>6} {d['fallen']:>3} {d['nb']:>3}  {d['food']:>4} {d['water']:>4} {d['wood']:>4} {d['stone']:>4} {d['mat']:>4} {d['fuel']:>3} {d['meds']:>3} {d['ammo']:>4} {d['cloth']:>3} | {d['cap']}/{d['mcap']}/{d['scap']} | {d['res']} {d['rp']} {d['ren']} | {sum(d['night'].values()):>3} {d['peakNight']:>3} {d['zLeft']:>3} | {d['sat']} {d['hpAvg']} | {d['ms']} f{d['fighters']} {d['ban']}")
    era=lambda l:1 if l<=5 else 2 if l<=10 else 3
    for e in (1,2,3):
        x=[d for d in ds if era(d['lvl'])==e]
        if not x: continue
        bn=[sum(d['night'].values())+sum(d['spawn'].values()) for d in x if d['bossNight']]; on=[sum(d['night'].values()) for d in x if not d['bossNight']]
        print(f"era {e}: {len(x)} days, deaths {sum(d['deathsDay'] for d in x)}, downs {sum(d['downs'] for d in x)}, boss nights {len(bn)} zombies {min(bn) if bn else 0}-{max(bn) if bn else 0} avg {sum(bn)/max(1,len(bn)):.0f}, ordinary night avg {sum(on)/max(1,len(on)):.0f}, peak standing {max(d['peakNight'] for d in x)}, day peak {max(d['peak'] for d in x)}, raids {sum(1 for d in x if d['raid'])}")
    iss=[(d['day'],i) for d in ds for i in d['issues']]; print('issues',len(iss)); [print('  ',a,b) for a,b in iss[:40]]
    er=collections.Counter(e[:160] for d in ds for e in d['errs']+d['timerErrs']+([d['stepErr']] if d['stepErr'] else [])); print('errors',er.most_common(8))
    try:
        e=json.load(open(D+'/s%s_end.json'%sd)); print('deaths by:',collections.Counter(str(x['z']) for x in e['deaths']).most_common(8)); print('death days:',[x['d'] for x in e['deaths']]); print('events tail:',e['events'][-25:])
        print('downs by:',collections.Counter(x['by'] for x in e['downs']).most_common(8),'in town',sum(1 for x in e['downs'] if x['inTown']),'of',len(e['downs']))
    except Exception as ex: print('no end file yet')
    print('types of zombie seen:',dict(collections.Counter(k for d in ds for k in list(d['night'])+list(d['spawn']))))
    print('last jobs',ds[-1]['jobs'],'btypes',ds[-1]['btypes'],'arr',ds[-1]['arr'],'joins',ds[-1]['joins'],'kids',ds[-1]['kids'],'born',ds[-1]['born'])
