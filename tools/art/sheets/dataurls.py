# dataurls.py TEXTFILE NAME [OUTDIR=.] — pull image data URLs (as copied out of a browser page, e.g. a ChatGPT image grabbed with
# tools/chatgpt/helpers.js) out of any text file and save them: one URL -> NAME-sheet.jpg; three -> the front / right side / back PNGs.
import sys, re, base64, io, os
from PIL import Image
t = open(sys.argv[1]).read(); name = sys.argv[2]; out = sys.argv[3] if len(sys.argv) > 3 else '.'; os.makedirs(out, exist_ok=True)
U = re.findall(r'data:image/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+', t)
if len(U) == 1: p = os.path.join(out, name + '-sheet.jpg'); Image.open(io.BytesIO(base64.b64decode(U[0].split(',', 1)[1]))).convert('RGB').save(p); print(p)
else:
    for v, u in zip(['1-front', '3-right-side', '4-back'], U):
        p = os.path.join(out, 'zombie-haven-%s-%s.png' % (name, v)); Image.open(io.BytesIO(base64.b64decode(u.split(',', 1)[1]))).convert('RGB').save(p); print(p)
