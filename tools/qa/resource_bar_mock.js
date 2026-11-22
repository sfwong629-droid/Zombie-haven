// UI chat, 22 Nov (W210): draws the resource bar ideas A, B, C in the real game for the sample sheet (pictures only, nothing in the game changes).
const Q=require('/home/claude/zombie-haven/tools/qa/lib');(async()=>{const b=await Q.launch();const p=await Q.page(b,{w:390,h:844});await Q.newGame(p);await Q.clearCards(p);await p.waitForTimeout(2500);await Q.clearCards(p);
const V={food:14,water:14,wood:12,stone:6,scrap:16,cloth:9,meds:1,fuel:0,ammo:30};
const opt=async(k)=>{await p.evaluate(({k,V})=>{
 const ic=(n,s=26)=>ZHIcons.svg(n,s);
 const chip=(n,v,s,extra='')=>`<span ${extra}><i>${ic(n,s)}</i><b>${v}</b></span>`;
 document.querySelectorAll('.mockX').forEach(e=>e.remove());
 const res=document.querySelector('#plaque .res');res.classList.remove('tight');res.style.cssText='';
 if(!res.dataset.orig)res.dataset.orig='1';
 const base=chip('food',V.food)+chip('water',V.water)+chip('wood',V.wood)+chip('stone',V.stone)+chip('parts',V.scrap);
 if(k==='now'){res.classList.add('tight');res.innerHTML=chip('food',V.food)+chip('water',V.water)+chip('wood',V.wood)+chip('parts',V.scrap)+chip('stash','9·1·0')+chip('ammo',V.ammo);}
 if(k==='A'){res.innerHTML=base+chip('cloth',V.cloth)+chip('pill',V.meds)+chip('ammo',V.ammo);res.style.cssText='gap:1px;padding:4px 8px 4px 5px';res.querySelectorAll('span').forEach(s=>s.style.cssText='gap:0');res.querySelectorAll('svg').forEach(s=>{s.setAttribute('width',22);s.setAttribute('height',22)});}
 if(k==='B'){res.innerHTML=base;const r2=document.createElement('div');r2.className='res mockX';r2.innerHTML=chip('cloth',V.cloth,20)+chip('pill',V.meds,20)+chip('fuel',V.fuel,20)+chip('ammo',V.ammo,20);r2.style.cssText='margin:4px auto 0;width:max-content;transform-origin:top center;font-size:13px';r2.querySelectorAll('b').forEach(x=>x.style.fontSize='13px');r2.querySelectorAll('span').forEach(x=>{if(x.textContent.trim()==='0')x.style.opacity='.45'});res.after(r2);}
 if(k==='C'||k==='C2'){res.innerHTML=base+chip('stash','10',26,'class="mockBag" style="position:relative"');
  const bag=res.querySelector('.mockBag');const dot=document.createElement('em');dot.className='mockX';dot.style.cssText='position:absolute;top:0;right:-4px;width:8px;height:8px;border-radius:50%;background:#ff8a6a;box-shadow:0 0 0 2px rgba(16,22,28,.9)';bag.appendChild(dot);
  if(k==='C2'){const r=bag.getBoundingClientRect();const d=document.createElement('div');d.className='mockX';
   const row=(n,name,v,cap,low)=>`<div style="display:flex;align-items:center;gap:8px;min-height:44px"><i style="display:flex">${ic(n,24)}</i><span style="flex:1"><span style="display:block;font-size:13px;color:#e9e4d8">${name}</span><span style="display:block;height:4px;border-radius:3px;background:rgba(255,255,255,.12);margin-top:4px"><span style="display:block;height:4px;border-radius:3px;width:${Math.round(100*v/cap)}%;background:${low?'#ff8a6a':'#e9e4d8'}"></span></span></span><b style="font-size:15px;color:${low?'#ff8a6a':'#fff'};min-width:50px;text-align:right">${v}<small style="opacity:.55;font-weight:400"> / ${cap}</small></b></div>`;
   d.innerHTML=`<div style="font-size:11px;letter-spacing:.08em;color:#b9b2a3;margin-bottom:2px">SUPPLIES</div>`+row('cloth','Cloth',V.cloth,20)+row('pill','Medicine',V.meds,20,true)+row('fuel','Fuel',V.fuel,20,true)+row('ammo','Ammo',V.ammo,60);
   d.style.cssText=`position:fixed;z-index:999;top:${r.bottom+8}px;right:${Math.max(8,390-r.right-10)}px;width:210px;padding:10px 12px 6px;border-radius:16px;background:rgba(16,22,28,.88);backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.1);box-shadow:0 8px 24px rgba(0,0,0,.45);font-family:inherit`;
   document.body.appendChild(d);}}
},{k,V});await p.waitForTimeout(150);
const h=k==='C2'?300:k==='B'?150:118;await p.screenshot({path:`/tmp/rb_${k}.png`,clip:{x:0,y:0,width:390,height:h}});};
for(const k of ['now','A','B','C','C2'])await opt(k);
await b.close();})();
