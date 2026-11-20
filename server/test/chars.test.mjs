// 角色存喺 server:房主揀角色 → lobby 廣播;非房主唔收;開局後入 view;存檔還原後仲喺
import {createEngine} from '../src/engine.gen.js';
import assert from 'node:assert';
const st=globalThis.setTimeout;globalThis.setTimeout=(f,ms,...a)=>st(f,(ms||0)/200,...a);
const sleep=ms=>new Promise(r=>st(r,ms));
const eng=createEngine();eng.setCode('CHR1');let saved=null;eng.onPersist((sn)=>{saved=sn;});
function mk(name,pid){const c={lobby:null,view:null};c.conn=eng.makeConn(d=>{if(d.t==='lobby')c.lobby=d;if(d.t==='view')c.view=d.v;},()=>{});eng.accept(c.conn);c.send=d=>c.conn.emit('data',d);c.send({t:'hello',name,pid});return c;}
eng.create({n:4,minFan:1,level:2});
const A=mk('甲','pa'),B=mk('乙','pb');
await sleep(50);
A.send({t:'chars',chars:['peach','mah','chick','cai']});
await sleep(20);
assert.deepStrictEqual(A.lobby.chars,['peach','mah','chick','cai'],'房主揀咗');
assert.deepStrictEqual(B.lobby.chars,['peach','mah','chick','cai'],'玩家都收到');
B.send({t:'chars',chars:['salt','salt','salt','salt']});
await sleep(20);
assert.deepStrictEqual(A.lobby.chars,['peach','mah','chick','cai'],'非房主改唔到');
A.send({t:'chars',chars:['bogus','mah','chick','cai']});
await sleep(20);
assert.strictEqual(A.lobby.chars[0],'salt','無效角色變返預設');
A.send({t:'chars',chars:['peach','mah','chick','cai']});
await sleep(20);
eng.start(A.conn);
await sleep(100);
assert.deepStrictEqual(eng._S.chars,['peach','mah','chick','cai'],'開局後 S.chars');
assert.deepStrictEqual(A.view.chars,['peach','mah','chick','cai'],'view 帶 chars');
// 存檔還原:新引擎讀返存檔,角色仲喺(存檔喺開局後有)
for(let i=0;i<200&&!saved;i++)await sleep(20);
assert(saved&&Array.isArray(saved.chars),'存檔有 chars');
assert.deepStrictEqual(saved.chars,['peach','mah','chick','cai'],'存檔角色');
const eng2=createEngine();eng2.setCode('CHR2');
eng2.restore(JSON.parse(JSON.stringify(saved)));
assert.deepStrictEqual(eng2._S.chars,['peach','mah','chick','cai'],'還原後角色仲喺');
console.log('chars OK');
process.exit(0);
