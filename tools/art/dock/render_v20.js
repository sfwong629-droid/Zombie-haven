const {chromium}=require('playwright'); const fs=require('fs');
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:512,height:512}}); await p.goto('file:///home/claude/zombie-haven/tools/art/dock/icons_v20.html');
 for(const k of ['explore','people','more','build','townB','townC','townD']){ const svg=await p.evaluate((k)=>window.__render(k),k); fs.writeFileSync(`/tmp/svgicons/${k}.svg`,svg); await p.setContent(`<body style="margin:0">${svg}</body>`); await p.screenshot({path:`/tmp/svgicons/${k}.png`,clip:{x:0,y:0,width:512,height:512}}); await p.goto('file:///home/claude/zombie-haven/tools/art/dock/icons_v20.html'); }
 await b.close();})();
