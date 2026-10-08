import { chromium } from 'playwright';
const [W,H,BW,out]=process.argv.slice(2); const FPS=60, DUR=1200;
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'}).catch(()=>chromium.launch());
const p=await b.newPage({viewport:{width:+W,height:+H}});
await p.goto('file://'+process.cwd()+`/stinger.html?w=${W}&h=${H}&bw=${BW}`); await p.evaluate(()=>document.fonts.ready);
const fs=await import('fs'); fs.mkdirSync(out,{recursive:true});
for(let f=0; f<=DUR*FPS/1000; f++){ await p.evaluate(ms=>render(ms), f*1000/FPS);
  await p.screenshot({path:`${out}/f${String(f).padStart(4,'0')}.png`, omitBackground:true}); }
console.log(out, (DUR*FPS/1000)+1, 'frames', await p.evaluate(()=>getComputedStyle(document.querySelector('#mark b')).fontFamily));
await b.close();
