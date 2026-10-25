#!/usr/bin/env python3
"""Pixel-art emotes that pop up over a character's head: a 15 x 15 speech bubble (1-px black outline, cream fill, a tail
pointing down at the head) with a 9 x 8 icon inside. Same chunky style and pixel size as the 30-px characters.
    python3 tools/art/emotes.py  -> assets/ui/emotes/emotes.png (one row of 15 x 15 cells) + emotes.json (name -> index)"""
import json, os
from PIL import Image

PAL = {'.': None, 'k': (20, 16, 20), 'w': (244, 238, 220), 'y': (250, 206, 60), 'Y': (196, 140, 30), 'r': (222, 56, 52), 'R': (150, 30, 36),
       'b': (70, 140, 220), 'B': (40, 80, 160), 'g': (110, 180, 70), 'G': (60, 120, 50), 'o': (240, 140, 50), 'p': (240, 130, 170),
       's': (150, 150, 160), 'S': (90, 90, 100), 'n': (150, 100, 60), 'N': (100, 64, 36), 'c': (120, 200, 230)}
# 9 x 8 icons. Faces are a yellow disc with a dark outline; things are drawn with two shades and an outline.
ICONS = {
 'happy':   [".kkkkkkk.", "kyyyyyyyk", "kykyyykyk", "kyyyyyyyk", "kykyyykyk", "kyykkkyyk", "kyyyyyyyk", ".kkkkkkk."],
 'sad':     [".kkkkkkk.", "kyyyyyyyk", "kykyyykyk", "kybyyyyyk", "kyyyyyyyk", "kyykkkyyk", "kykyyykyk", ".kkkkkkk."],
 'angry':   [".kkkkkkk.", "krkyyykrk", "kykkykkyk", "kykyyykyk", "kyyyyyyyk", "kyykkkyyk", "kykyyykyk", ".kkkkkkk."],
 'scared':  [".kkkkkkk.", "kyyyyyyyk", "kkkyyykkk", "kwkyyykwk", "kyyyyyyyk", "kyyykyyyk", "kyykwkyyk", ".kkkkkkk."],
 'love':    [".kk...kk.", "krrk.krrk", "krwrkrrrk", "krrrrrrrk", ".krrrrrk.", "..krrrk..", "...krk...", "....k...."],
 'hungry':  [".....kkk.", "....knnnk", "...knnnNk", "..knnnNk.", ".kwkNNk..", "kwk.kk...", ".k.......", "........."],
 'thirsty': ["....k....", "...kbk...", "..kbbbk..", ".kbwbbbk.", ".kbwbbBk.", ".kbbbbBk.", "..kBBBk..", "...kkk..."],
 'tired':   ["kkkkk....", "...k.....", "..k......", ".k.......", "kkkkk.kkk", ".......k.", "......k..", "......kkk"],
 'hurt':    ["...kkk...", "...krk...", ".kkkrkkk.", ".krrrrrk.", ".kkkrkkk.", "...krk...", "...kkk...", "........."],
 'sick':    [".kkkkkkk.", "kgggggggk", "kgkgggkgk", "kgggggggk", "kgkkkkkgk", "kgkGGGkgk", "kgggggggk", ".kkkkkkk."],
 'alert':   ["...kkk...", "...krk...", "...krk...", "...krk...", "...kRk...", "...kkk...", "...krk...", "...kkk..."],
 'idea':    ["...kkk...", "..kyyyk..", ".kywyyyk.", ".kyyyyyk.", "..kyyyk..", "...kSk...", "...kSk...", "...kkk..."],
 'question':["..kkkkk..", ".kbbbbbk.", ".kbkkkbk.", "....kbbk.", "...kbbk..", "...kkk...", "...kbk...", "...kkk..."],
}
BUBBLE = [   # 15 x 15: rounded bubble 15 x 12 (icon with a 1-px margin all round) and a 3-px tail
 "..kkkkkkkkkkk..", ".kwwwwwwwwwwwk.", "kwwwwwwwwwwwwwk", "kwwwwwwwwwwwwwk", "kwwwwwwwwwwwwwk", "kwwwwwwwwwwwwwk",
 "kwwwwwwwwwwwwwk", "kwwwwwwwwwwwwwk", "kwwwwwwwwwwwwwk", "kwwwwwwwwwwwwwk", ".kwwwwwwwwwwwk.", "..kkkkkwkkkkk..", "......kwk......", ".......k.......", "..............."]

def cell(name):
    im = Image.new('RGBA', (15, 15), (0, 0, 0, 0)); p = im.load()
    for y, row in enumerate(BUBBLE):
        for x, ch in enumerate(row):
            if PAL[ch]: p[x, y] = PAL[ch] + (255,)
    for y, row in enumerate(ICONS[name]):
        for x, ch in enumerate(row):
            if PAL[ch]: p[x + 3, y + 2] = PAL[ch] + (255,)
    return im

if __name__ == '__main__':
    root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    names = list(ICONS); sheet = Image.new('RGBA', (15 * len(names), 15), (0, 0, 0, 0))
    for i, n in enumerate(names): sheet.alpha_composite(cell(n), (i * 15, 0))
    out = os.path.join(root, 'assets/ui/emotes'); sheet.save(os.path.join(out, 'emotes.png'))
    json.dump({'cell': [15, 15], 'tail': [7, 13], 'names': names}, open(os.path.join(out, 'emotes.json'), 'w'), indent=1)
    print(len(names), sheet.size)
