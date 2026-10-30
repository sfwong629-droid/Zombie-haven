"""Writes the three style-frame artboards (.dc.html) for the design canvas.

Run: python3 tools/art/b3d/mockup_boards.py ROOT gritty=/_blob/.. night=/_blob/.. toy=/_blob/..
Each board is a 1280x800 game screen: the Blender render with a town-builder HUD on top.
"""
import sys, os, json

ROOT = sys.argv[1]
URL = dict(a.split('=', 1) for a in sys.argv[2:])
os.makedirs(os.path.join(ROOT, 'project'), exist_ok=True)

ICON = {  # 24px stroke icons
    'food': '<path d="M7 3v8a3 3 0 0 0 6 0V3M10 3v18M17 3c-2 2-2 6 0 8v10"/>',
    'water': '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
    'wood': '<path d="M3 17l9-9 9 9M6 14v6h12v-6"/><circle cx="12" cy="8" r="1"/>',
    'scrap': '<path d="M14 4l6 6-9 9H5v-6z"/><path d="M12 6l6 6"/>',
    'med': '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M12 8v8M8 12h8"/>',
    'people': '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6M18 14c2 .6 3 2.6 3 6"/>',
    'house': '<path d="M3 11l9-7 9 7v9H3z"/><path d="M10 20v-5h4v5"/>',
    'farm': '<path d="M12 20V10M12 10c0-4 3-6 7-6 0 4-3 6-7 6zM12 13c0-3-2-5-6-5 0 3 2 5 6 5z"/>',
    'tool': '<path d="M14 6a4 4 0 0 0 5 5l-9 9-3-3 9-9a4 4 0 0 1-2-2z"/>',
    'wall': '<path d="M3 20V8l3-3 3 3 3-3 3 3 3-3 3 3v12z"/><path d="M3 13h18"/>',
    'box': '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    'pause': '<path d="M9 5v14M15 5v14"/>',
    'play': '<path d="M7 4l12 8-12 8z"/>',
    'fast': '<path d="M4 5l8 7-8 7zM12 5l8 7-8 7z"/>',
    'alert': '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
    'moon': '<path d="M20 14A8 8 0 1 1 10 4a7 7 0 0 0 10 10z"/>',
    'sun': '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
}
def ic(name, size=20, sw=2):
    return (f'<svg width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" '
            f'stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICON[name]}</svg>')

STY = {
    'gritty': dict(title='Gritty survival · day', fonts='family=Oswald:wght@500;600&family=Barlow:wght@500;600;700',
                   head="'Oswald', 'Arial Narrow', sans-serif", body="'Barlow', system-ui, sans-serif",
                   panel='rgba(28,26,20,0.82)', edge='rgba(214,196,150,0.28)', ink='#efe7d2', mute='#bfb497',
                   accent='#d9a441', warn='#e0703a', radius='4px', clock='Day 12 · 08:40', time='sun',
                   alert=('Horde sighted', '4 walkers at the east fence'), sel=('Farm Plot', '2 × 2 tiles · 20 wood · feeds 3')),
    'night': dict(title='Gritty survival · night defense', fonts='family=Oswald:wght@500;600&family=Barlow:wght@500;600;700',
                  head="'Oswald', 'Arial Narrow', sans-serif", body="'Barlow', system-ui, sans-serif",
                  panel='rgba(10,13,22,0.84)', edge='rgba(140,160,210,0.28)', ink='#e4e8f2', mute='#a3adc4',
                  accent='#f0b450', warn='#ff6a4a', radius='4px', clock='Night 12 · 23:10', time='moon',
                  alert=('Night raid', 'Walkers at the east fence · keep the fire lit'), sel=('Watchtower', '2 × 2 tiles · 40 wood · 10 scrap')),
    'toy': dict(title='Cozy toy town', fonts='family=Fredoka:wght@500;600;700&family=Nunito:wght@600;700;800',
                head="'Fredoka', 'Trebuchet MS', sans-serif", body="'Nunito', system-ui, sans-serif",
                panel='rgba(255,255,255,0.92)', edge='rgba(60,90,40,0.18)', ink='#2c3a24', mute='#5d6b52',
                accent='#f08a2c', warn='#e04b3a', radius='18px', clock='Day 12 · 08:40', time='sun',
                alert=('Visitors!', '4 zombies wandering by the east fence'), sel=('Farm Plot', '2 × 2 tiles · 20 wood · feeds 3')),
}
for _k, _t in (('gpt1', 'ChatGPT 1 · Painted survival'), ('gpt2', 'ChatGPT 2 · Overcast scrap fort'),
               ('gpt3', 'ChatGPT 3 · Autumn evening'), ('gpt4', 'ChatGPT 4 · Grounded detail')):
    STY[_k] = dict(STY['gritty'], title=_t)
for _k, _base, _t in (('s1', 'gritty', 'Style 1 · Oil painting'), ('s2', 'toy', 'Style 2 · Flat vector'),
                      ('s3', 'gritty', 'Style 3 · Hand-drawn ink cartoon'), ('s4', 'gritty', 'Style 4 · Comic cel-shaded'),
                      ('s5', 'night', 'Style 5 · Noir, red accent'), ('s6', 'toy', 'Style 6 · Clay diorama')):
    STY[_k] = dict(STY[_base], title=_t, toyhud=(_base == 'toy'))
for _k, _base, _t in (('r3a', 'gritty', 'Round 2 · Ink cartoon, colourful day'), ('r3b', 'night', 'Round 2 · Ink cartoon, night'),
                      ('r4a', 'night', 'Round 2 · Comic, night with red accent'), ('r4b', 'gritty', 'Round 2 · Comic, clean mobile')):
    STY[_k] = dict(STY[_base], title=_t)
for _k, _base, _t in (('r5a', 'gritty', 'Round 3 · Ink, grown-up survivors'), ('r5b', 'gritty', 'Round 3 · Ink, bigger town'),
                      ('r5c', 'gritty', 'Round 3 · Ink, winter')):
    STY[_k] = dict(STY[_base], title=_t)
STY['b3ink'] = dict(STY['gritty'], title='Blender 3D · Ink style, first pass')
RES = [('food', 'Food', '46'), ('water', 'Water', '31'), ('wood', 'Wood', '120'), ('scrap', 'Scrap', '58'), ('med', 'Medicine', '9')]
BUILD = [('house', 'Shelter'), ('farm', 'Farm'), ('tool', 'Workshop'), ('med', 'Medical'), ('wall', 'Defense'), ('box', 'Storage')]

def board(key):
    s = STY[key]; img = URL[key]
    toy = key == 'toy' or s.get('toyhud', False)
    pad = '10px 14px' if not toy else '10px 16px'
    shadow = 'box-shadow: 0 6px 18px rgba(0,0,0,0.35);' if not toy else 'box-shadow: 0 6px 0 rgba(60,90,40,0.18), 0 10px 24px rgba(0,0,0,0.12);'
    P = f"background: {s['panel']}; border: 1px solid {s['edge']}; border-radius: {s['radius']}; {shadow} color: {s['ink']};"
    res = ''.join(
        f'<div style="display: flex; align-items: center; gap: 8px; padding: 0 6px"><span style="color: {s["accent"]}; display: flex">{ic(i)}</span>'
        f'<span style="display: flex; flex-direction: column; line-height: 1.05"><span style="font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; color: {s["mute"]}">{n}</span>'
        f'<span style="font-size: 19px; font-weight: 700; font-variant-numeric: tabular-nums">{v}</span></span></div>' for i, n, v in RES)
    tabs = ''.join(
        f'<button style="all: unset; box-sizing: border-box; width: 92px; height: 74px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; '
        f'border-radius: {s["radius"]}; cursor: pointer; font: 600 13px/1 {s["body"]}; '
        + (f'background: {s["accent"]}; color: {"#1d1a12" if not toy else "#ffffff"};' if n == ('Farm' if key != 'night' else 'Defense') else f'color: {s["ink"]}; background: transparent;')
        + f'">{ic(i, 26)}<span>{n}</span></button>' for i, n in BUILD)
    speed = ''.join(
        f'<button aria-label="{lab}" style="all: unset; box-sizing: border-box; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; border-radius: {s["radius"]}; cursor: pointer; '
        + (f'background: {s["accent"]}; color: {"#1d1a12" if not toy else "#ffffff"};' if lab == 'Normal speed' else f'color: {s["ink"]};')
        + f'">{ic(i, 18)}</button>' for i, lab in (('pause', 'Pause'), ('play', 'Normal speed'), ('fast', 'Fast forward')))
    warn_col = s['warn']
    html = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{s['title']}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?{s['fonts']}&amp;display=swap">
<style>
body{{margin:0}}
a{{color:{s['accent']}}}a:hover{{color:{s['ink']}}}
</style>
</helmet>
<div style="width: 1280px; height: 800px; position: relative; overflow: hidden; background: #222; font-family: {s['body']}; color: {s['ink']}">
<img src="{img}" alt="Zombie Haven town, {s['title']} style: a walled settlement with a medical tent, workshop, cabin, farm plots and campfire, survivors at work and zombies outside the east fence" style="position: absolute; inset: 0; width: 1280px; height: 800px; object-fit: cover">

<div style="position: absolute; left: 20px; top: 20px; display: flex; align-items: center; gap: 14px; padding: {pad}; {P}">
<span style="color: {s['accent']}; display: flex">{ic(s['time'], 26)}</span>
<div style="display: flex; flex-direction: column; gap: 2px">
<span style="font: 600 22px/1 {s['head']}; letter-spacing: 0.02em; text-transform: {'uppercase' if not toy else 'none'}">Zombie Haven</span>
<span style="font-size: 14px; color: {s['mute']}; font-variant-numeric: tabular-nums">{s['clock']}</span>
</div>
<div style="width: 1px; height: 34px; background: {s['edge']}"></div>
<span style="display: flex; align-items: center; gap: 8px"><span style="color: {s['accent']}; display: flex">{ic('people', 22)}</span><span style="font-size: 19px; font-weight: 700; font-variant-numeric: tabular-nums">7<span style="color: {s['mute']}; font-weight: 600"> / 10</span></span></span>
</div>

<div style="position: absolute; right: 20px; top: 20px; display: flex; gap: 8px; padding: 10px 12px; {P}">{res}</div>

<div style="position: absolute; right: 20px; top: 104px; width: 300px; display: flex; gap: 12px; padding: 14px 16px; {P} border-left: 1px solid {s['edge']}">
<span style="color: {warn_col}; display: flex; padding-top: 2px">{ic('alert', 22)}</span>
<div style="display: flex; flex-direction: column; gap: 4px">
<span style="font: 600 17px/1.1 {s['head']}; text-transform: {'uppercase' if not toy else 'none'}; letter-spacing: 0.03em; color: {warn_col}">{s['alert'][0]}</span>
<span style="font-size: 14px; line-height: 1.35; color: {s['ink']}">{s['alert'][1]}</span>
</div>
</div>

<div style="position: absolute; left: 20px; bottom: 20px; width: 290px; display: flex; flex-direction: column; gap: 8px; padding: 14px 16px; {P}">
<span style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: {s['mute']}">Placing</span>
<span style="font: 600 22px/1 {s['head']}">{s['sel'][0]}</span>
<span style="font-size: 14px; color: {s['mute']}">{s['sel'][1]}</span>
<div style="display: flex; gap: 8px; padding-top: 4px">
<button style="all: unset; box-sizing: border-box; height: 44px; padding: 0 18px; display: flex; align-items: center; border-radius: {s['radius']}; background: {s['accent']}; color: {'#1d1a12' if not toy else '#ffffff'}; font: 700 15px/1 {s['body']}; cursor: pointer">Build</button>
<button style="all: unset; box-sizing: border-box; height: 44px; padding: 0 16px; display: flex; align-items: center; border-radius: {s['radius']}; border: 1px solid {s['edge']}; color: {s['ink']}; font: 600 15px/1 {s['body']}; cursor: pointer">Cancel</button>
</div>
</div>

<div style="position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); display: flex; gap: 6px; padding: 8px; {P}">{tabs}</div>

<div style="position: absolute; right: 20px; bottom: 20px; display: flex; gap: 4px; padding: 8px; {P}">{speed}</div>
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1280,"height":800}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
'''
    return html

names = {'gritty': 'Main.dc.html', 'night': 'Night.dc.html', 'toy': 'Toy.dc.html',
         'gpt1': 'GptPainted.dc.html', 'gpt2': 'GptScrap.dc.html', 'gpt3': 'GptAutumn.dc.html', 'gpt4': 'GptDetail.dc.html',
         's1': 'StyleOil.dc.html', 's2': 'StyleFlat.dc.html', 's3': 'StyleInk.dc.html', 's4': 'StyleComic.dc.html',
         's5': 'StyleNoir.dc.html', 's6': 'StyleClay.dc.html',
         'b3ink': 'BlenderInk.dc.html',
         'r5a': 'R3AdultTown.dc.html', 'r5b': 'R3BiggerTown.dc.html', 'r5c': 'R3Winter.dc.html',
         'r3a': 'R2InkDay.dc.html', 'r3b': 'R2InkNight.dc.html', 'r4a': 'R2ComicNight.dc.html', 'r4b': 'R2ComicClean.dc.html'}
for k, n in names.items():
    if k not in URL: continue
    open(os.path.join(ROOT, 'project', n), 'w').write(board(k))
def lineup(title, img, h=640, alt=None):
    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>{title}</title>
<script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
<style>
body{{margin:0}}
a{{color:#555}}a:hover{{color:#222}}
</style>
</helmet>
<div style="width: 1280px; height: {h}px; position: relative; overflow: hidden; background: #222">
<img src="{img}" alt="{alt or (title + ': farmer with a straw hat and hoe, medic with a red-cross armband, lookout with binoculars, cook in an apron, scavenger with a backpack, and a shambling zombie')}" style="position: absolute; inset: 0; width: 1280px; height: {h}px; object-fit: cover">
</div>
</x-dc>
<script type="text/x-dc" data-dc-script data-props='{{"$preview":{{"width":1280,"height":{h}}}}}'>
class Component extends DCLogic {{
renderVals() {{
return {{}};
}}
}}
</script>
</body>
</html>
'''
SHEETS = [('l5', 'R3AdultLineup.dc.html', 'Round 3 · Ink, grown-up character lineup', 640, None),
          ('b5', 'R3Buildings.dc.html', 'Round 3 · Ink, building sheet', 853, 'Round 3 ink building sheet: medical tent, workshop shed, log cabin, fenced farm plot, watchtower and outdoor kitchen'),
          ('z5', 'R3Zombies.dc.html', 'Round 3 · Ink, zombie variety', 640, 'Round 3 ink zombie lineup: walker, runner, bloated heavy, crawler, firefighter and farmer zombies')]
SHEETS += [('c6', 'InkCloseup.dc.html', 'Blender 3D · Ink close-up: cabin and Farmer', 800,
            'Blender ink-style close-up: log cabin with shingle roof, stone chimney, lit windows, barrel, crates, firewood and a crop bed, with the Farmer holding a hoe'),
           ('t6', 'InkTurn.dc.html', 'Blender 3D · Ink Farmer, four directions', 396,
            'The ink-style Farmer standing, facing SE, SW, NW and NE'),
           ('w6', 'InkWalk.dc.html', 'Blender 3D · Ink Farmer walking (SE and NE)', 792,
            'Animated walk cycle of the ink-style Farmer, front view and back view')]
LOOKS = [('la', 'LookA.dc.html', 'Look A · Chunky toy figure', 853), ('lb', 'LookB.dc.html', 'Look B · Storybook (ChatGPT kept the hat)', 788),
         ('lc', 'LookC.dc.html', 'Look C · Lanky gothic', 853), ('ld', 'LookD.dc.html', 'Look D · Rugged and sturdy', 853),
         ('le', 'LookE.dc.html', 'Look E · Low-poly papercraft', 853), ('lf', 'LookF.dc.html', 'Look F · Soft vinyl figure', 853)]
SHEETS += [(k, n, t, h, t + ': the Farmer as a 3D game character, front and back three-quarter views') for k, n, t, h in LOOKS]
SHEETS += [('e1', 'E3dLineup.dc.html', 'Look E in 3D · six professions, four directions', 1542,
            'Six survivors built from one shared body: farmer, medic, guard, cook, scavenger, engineer, shown facing SE, SW, NW and NE'),
           ('e2', 'E3dWalk.dc.html', 'Look E in 3D · all six walking', 385, 'The six Look E survivors walking, with clothes and gear moving with them'),
           ('e3', 'E3dFarmer.dc.html', 'Look E in 3D · Farmer close-up', 616, 'The Look E Farmer close up, front and back three-quarter views')]
SHEETS += [('e4', 'E3dFarmerV2.dc.html', 'Look E in 3D · Farmer v2: shorter legs, Look E colours', 330,
            'Farmer before, then v2 front and back with shorter legs, thicker arms and muted Look E colours, next to the Look E target')]
SHEETS += [('e5', 'E3dFarmerV3.dc.html', 'Look E in 3D · Farmer v3: collar, cuffs, fists, boots, swept hair', 447,
            'Farmer v2, then v3 front and back with a shirt collar and buttons, chunky rolled cuffs, fist hands, laced work boots, bunched trouser hems and swept hair, next to the Look E target')]
SHEETS += [('g1', 'StorybookGuy.dc.html', 'Storybook body · general survivor, smooth vs faceted', 469,
            'The ink reference next to a general male survivor on the new storybook body: big round head, short legs, cream shirt and jeans, shown smooth, faceted, and from the back')]
SHEETS += [('g2', 'StorybookGuyV2.dc.html', 'Storybook body v2 · shorter arms, lower eyes, swept hair', 517,
            'The ink reference, the first storybook survivor, then v2 from both sides with shorter arms, eyes lower on the face and side-parted swept hair')]
SHEETS += [('g3', 'StorybookGear.dc.html', 'Storybook body v3 · bold outline, less round face, gear', 484,
            'The ink reference next to three storybook survivors with a bold dark outline: plain shirt and jeans, a scavenger with backpack, scarf and crowbar, and a guard with vest, rifle on the back and binoculars')]
SHEETS += [('m1', 'CasualMobileRef.dc.html', 'ChatGPT · casual 3D mobile survivor style (Town Survival-like)', 640,
            'ChatGPT character sheet of five original survivors in a polished casual 3D mobile style: farmer with pitchfork, medic with first-aid case, guard with shotgun, cook with frying pan, scavenger with backpack and crowbar, with style notes on proportions, faces, clothing and shading')]
for k, n, t, h, alt in SHEETS:
    if k in URL:
        open(os.path.join(ROOT, 'project', n), 'w').write(lineup(t, URL[k], h, alt))
for k, n, t in (('l3', 'R2InkLineup.dc.html', 'Round 2 · Ink cartoon, character lineup'), ('l4', 'R2ComicLineup.dc.html', 'Round 2 · Comic, character lineup')):
    if k in URL:
        open(os.path.join(ROOT, 'project', n), 'w').write(lineup(t, URL[k]))
print('boards written')
