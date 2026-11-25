#!/usr/bin/env python3
"""tools/claim.py: the next free build number and W number, so two chats don't take the same one.

    python3 tools/claim.py           # prints e.g.  build 3D.380   W279
    python3 tools/claim.py build     # just 3D.380
    python3 tools/claim.py w         # just W279

Looks at everything a chat can see after `git pull --rebase`: BUILD_TAG in src/game/01-core.js, every commit subject on
every branch fetched from origin, and every "3D.N" / "WN" written in docs/project (that includes numbers a chat has
noted for work still on a local branch, "would be 3D.369"). Takes the highest and adds one. Run it right before you
commit, after pulling; then commit and push at once, so the number is taken in the repo before anyone else looks.
"""
import os, re, subprocess, sys, glob

R = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))


def git(*a):
    return subprocess.run(['git', '-C', R, *a], capture_output=True, text=True).stdout


def highest_build():
    nums = []
    core = open(os.path.join(R, 'src/game/01-core.js')).read()
    m = re.search(r"BUILD_TAG\s*=\s*'3D\.(\d+)'", core)
    if m: nums.append(int(m.group(1)))
    nums += [int(n) for n in re.findall(r'\b3D\.(\d{2,4})\b', git('log', '--all', '--format=%s', '-n', '3000'))]
    for f in glob.glob(os.path.join(R, 'docs/project/*.md')):
        nums += [int(n) for n in re.findall(r'\b3D\.(\d{2,4})\b', open(f).read())]
    return max(nums)


def highest_w():
    nums = []
    for f in glob.glob(os.path.join(R, 'docs/project/*.md')):
        nums += [int(n) for n in re.findall(r'\bW(\d{1,4})\b', open(f).read())]
    nums += [int(n) for n in re.findall(r'\bW(\d{1,4})\b', git('log', '--all', '--format=%s', '-n', '3000'))]
    return max(nums)


if __name__ == '__main__':
    git('fetch', '-q', 'origin')
    what = (sys.argv[1:] or ['all'])[0].lower()
    b, w = f'3D.{highest_build() + 1}', f'W{highest_w() + 1}'
    print(b if what == 'build' else w if what == 'w' else f'build {b}   {w}')
