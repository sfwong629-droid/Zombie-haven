"""Survivor professions as data. Same body, skeleton and animations for all of them.

Add a profession: copy an entry, change body/hair/wear. Every 'wear' item is a
function in wardrobe.py, optionally with settings: ('shirt', {'colour': ...}).
"""
PROFESSIONS = {
    'farmer': {
        'body': {'skin': '#e8b08a', 'beard': '#b8864a', 'brow': '#8a5a2a'},
        'hair': 'messy', 'hair_colour': '#d8a854', 'seed': 3,
        'wear': [('shirt', {'colour': '#4a9640', 'pattern': 'plaid', 'accent': '#1e4a1a', 'sleeves': 'rolled'}),
                 ('pants', {'colour': '#7a4a26'}), 'suspenders', ('boots', {'colour': '#47291a'}),
                 ('tool', {'kind': 'hoe'})],   # straw hat off while we work on the face; add ('hat', {'kind': 'straw'}) back later
    },
    'medic': {
        'body': {'skin': '#c98e6a', 'shoulders': .93, 'hips': 1.04, 'brow': '#2a1a10', 'eye_size': 1.08},
        'hair': 'bun', 'hair_colour': '#2a1f18', 'seed': 5,
        'wear': [('shirt', {'colour': '#8fb4cc', 'sleeves': 'rolled'}), ('pants', {'colour': '#5a6a4a', 'pockets': True}),
                 ('boots', {'colour': '#3a2a1e'}), ('belt', {'pouches': 1}), 'armband', 'gloves',
                 ('satchel', {'colour': '#7a5a34', 'cross': '#c0392b'}), ('tool', {'kind': 'medkit'})],
    },
    'guard': {
        'body': {'skin': '#e3a87e', 'shoulders': 1.08, 'bulk': 1.06, 'beard': '#4a3020', 'brow': '#3a2516', 'brow_tilt': 2},
        'hair': 'short', 'hair_colour': '#4a3020', 'seed': 7,
        'wear': [('jacket', {'colour': '#7a5a3a'}), ('vest', {'colour': '#5a5a3a'}), ('pants', {'colour': '#4a4a36', 'pockets': True}),
                 ('boots', {'colour': '#2b2420', 'tall': True}), ('belt', {'pouches': 2}), ('hat', {'kind': 'cap', 'colour': '#55553a'}),
                 'binoculars', 'rifle_on_back', ('gloves', {'colour': '#2b2420'})],
    },
    'cook': {
        'body': {'skin': '#f0bf98', 'belly': 1.22, 'hips': 1.08, 'bulk': 1.05, 'brow': '#5a2a1a', 'jaw': 1.08},
        'hair': 'bun', 'hair_colour': '#8a4a2a', 'seed': 9,
        'wear': [('shirt', {'colour': '#8a8a90', 'sleeves': 'rolled'}), ('pants', {'colour': '#3e3a44'}), ('boots', {'colour': '#2e2620'}),
                 ('apron', {'colour': '#ece4cc'}), ('hat', {'kind': 'bandana', 'colour': '#c0392b'}), ('tool', {'kind': 'ladle'})],
    },
    'scavenger': {
        'body': {'skin': '#f2c4a0', 'shoulders': .95, 'bulk': .94, 'brow': '#8a3a1a', 'brow_tilt': -4},
        'hair': 'spiky', 'hair_colour': '#c0602a', 'seed': 11,
        'wear': [('jacket', {'colour': '#d0742e'}), ('pants', {'colour': '#6a6a4a', 'pockets': True}), ('boots', {'colour': '#4a3626', 'tall': True}),
                 ('scarf', {'colour': '#5a6a7a'}), ('backpack', {'colour': '#6a5a3a', 'bedroll': '#4a6a3a', 'size': 1.15}),
                 ('belt', {'pouches': 2}), ('tool', {'kind': 'crowbar'})],
    },
    'engineer': {
        'body': {'skin': '#8e5a3e', 'shoulders': 1.04, 'brow': '#1a1210', 'beard': '#1a1210'},
        'hair': 'short', 'hair_colour': '#1a1210', 'seed': 13,
        'wear': [('shirt', {'colour': '#c9c2ad', 'sleeves': 'rolled'}), ('overalls', {'colour': '#3f5a8a'}), ('boots', {'colour': '#3a2a1e'}),
                 ('belt', {'pouches': 3, 'colour': '#5a3a1e'}), ('hat', {'kind': 'hardhat'}), 'goggles', ('tool', {'kind': 'wrench'}),
                 ('gloves', {'colour': '#a8823a'})],
    },
}
ORDER = ['farmer', 'medic', 'guard', 'cook', 'scavenger', 'engineer']
