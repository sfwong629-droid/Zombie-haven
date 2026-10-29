import glob, os, sys
from PIL import Image, ImageDraw, ImageOps
R = sys.argv[1]; OUT = sys.argv[2]
def fr(st, a, d):
    ps = sorted(glob.glob(f'{R}/{st}/animations/{a}/{d}*'))
    return sorted(glob.glob(ps[0] + '/*.png'))
# (name, (state, anim, dir, mirror) for SE, same for NE)
PICK = [
 ('idle',       ('Idle','Idle_Standing','south-east',0), ('Idle','Idle_Standing','north-east',0)),
 ('walk',       ('Idle','Walk','south-east',0), ('Idle','Walk','north-east',0)),
 ('hold_idle',  ('Hold','Idle_Hold','south-east',0), ('Hold','Idle_Hold','north-east',0)),
 ('hold_walk',  ('Hold','The_character_keeps_facing_the_same_direction_as_t','south-east',0), ('Hold','The_character_keeps_facing_the_same_direction_as_t','north-east',0)),
 ('rescue',     ('holding_both_hand_up','The_character_maintains_a_determined_expression_wh','south-east',0), ('holding_both_hand_up','The_character_maintains_a_determined_expression_wh','north-east',0)),
 ('punch',      ('Idle','Punch','south-east',0), ('Idle','Punch','north-east',0)),
 ('swing_a',    ('Hold','Swing_A','south-east',0), ('Hold','Swing_A','north-east-1eb67c18',0)),
 ('swing_b',    ('Hold','Swing_B','south-east',0), ('Hold','Swing_B_NE_skeleton','north-east',0)),
 ('swing_c',    ('Hold','Swing_C','south-east',0), ('Hold','Swing_C','north-east',0)),
 ('fire',       ('Aim','Fire','south-east',0), ('Aim','Fire','north-east',0)),
 ('hurt',       ('Hold','Hurt','south-east',0), ('Hold','Hurt_NE_skeleton','north-east',0)),
 ('collapse',   ('Hold','Collapse','south-east',0), ('Hold','Collapse','north-east',0)),
 ('cheer',      ('Idle','Happy_Jump','south-east',0), ('Idle','Happy_Jump_v2','north-west',1)),
]
os.makedirs(OUT, exist_ok=True)
S = 3; cw = 48 * S; rows = []
for name, *dirs in PICK:
    for tag, (st, a, d, m) in zip(('se', 'ne'), dirs):
        fs = [Image.open(f).convert('RGBA') for f in fr(st, a, d)]
        if m: fs = [ImageOps.mirror(x) for x in fs]
        strip = Image.new('RGBA', (48 * len(fs), 48))
        for i, x in enumerate(fs): strip.paste(x, (48 * i, 0))
        strip.save(f'{OUT}/medic_{name}_{tag}.png'); rows.append((f'{name} {tag}', fs))
# animated review sheet: 4 columns of clips
cols = 4; n = len(rows); H = (n + cols - 1) // cols; L = max(len(f) for _, f in rows)
frames = []
for t in range(L * 2):
    im = Image.new('RGB', (cols * (cw + 10), H * (cw + 14)), (150, 150, 150)); d = ImageDraw.Draw(im)
    for k, (lab, fs) in enumerate(rows):
        x, y = (k % cols) * (cw + 10), (k // cols) * (cw + 14)
        d.text((x + 4, y + 2), lab, fill=(0, 0, 0))
        f = fs[t % len(fs)].resize((cw, cw), 0); im.paste(f, (x, y + 12), f)
    frames.append(im)
frames[0].save(f'{OUT}/../medic_review.gif', save_all=True, append_images=frames[1:], duration=120, loop=0)
print(len(rows))
