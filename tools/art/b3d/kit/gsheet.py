# gsheet.py PREFIX COLS OUT.png : tile PREFIX_0.png, PREFIX_1.png ... (gate_poses.js output) into one sheet
import sys, glob
from PIL import Image
pre,cols,dst=sys.argv[1],int(sys.argv[2]),sys.argv[3]; n=len(glob.glob(pre+'_*.png')); rows=(n+cols-1)//cols; o=Image.new('RGB',(cols*240,rows*300),(205,205,205))
for i in range(n):
    im=Image.open('%s_%d.png'%(pre,i)).convert('RGBA'); o.paste(im,(240*(i%cols),300*(i//cols)),im)
o.save(dst); print(n)
