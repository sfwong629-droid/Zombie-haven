#!/usr/bin/env python3
"""tools/waiting.py: the owner's open items, by chat, straight from docs/project/05-NOW.md ("Waiting on the owner").

    python3 tools/waiting.py            # every chat (the Planning chat's list)
    python3 tools/waiting.py UI         # one chat (its own list)

An item is open when its line starts "- W123." (closed ones are struck through: "- ~~W123."). Prints one line each:
the number and its short title (the bold part, or the first clause). Paste the result into the reply, then add the
one-line state of anything that changed in this chat.
"""
import os, re, sys

R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
text = open(os.path.join(R, 'docs/project/05-NOW.md')).read()
part = text.split('## Waiting on the owner', 1)[1].split('\n## ', 1)[0]

chats, cur = {}, None
for line in part.split('\n'):
    m = re.match(r'^([A-Z][\w .-]*? chat|Later)\b[^\n]*:\s*$', line)
    if m:
        cur = m.group(1); chats.setdefault(cur, []); continue
    m = re.match(r'^- (W\d+)\.\s*(.*)', line)
    if m and cur:
        w, rest = m.groups()
        b = re.match(r'\*\*(.+?)\*\*', rest)
        t = b.group(1) if b else re.split(r'(?<=[a-z\)])[.:?] |\. ', rest, maxsplit=1)[0]
        t = re.sub(r'\s+', ' ', t).strip().rstrip('.:')
        chats[cur].append((w, t[:110] + ('…' if len(t) > 110 else '')))

want = ' '.join(sys.argv[1:]).lower()
for chat, items in chats.items():
    if want and not chat.lower().startswith(want): continue
    if not items: continue
    print(f'{chat}:')
    for w, t in items: print(f'  {w}: {t}')
