import {createEngine} from '../src/engine.gen.js';
import assert from 'node:assert';
const eng=createEngine();eng.setCode('TP1');
const S=eng._S;
function mk(name,pid){const c={view:null};c.conn=eng.makeConn(d=>{if(d.t==='view')c.view=d.v;},()=>{});eng.accept(c.conn);c.send=d=>c.conn.emit('data',d);c.send({t:'hello',name,pid});return c;}
eng.create({n:3,minFan:1,level:2});
const A=mk('甲','pa'),B=mk('乙','pb');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await wait(100);eng.start(A.conn);
for(let i=0;i<40&&!(A.view&&A.view.players[A.view.me].hand);i++)await wait(100);
const g=eng._g;
const p=S.players[0];
p.melds=[];p.flowers=[];
// 123萬 123筒 456索 55萬 78索 + 多一隻東:打東 → 聽 6索/9索
p.hand=[0,1,2,9,10,11,21,22,23,4,4,24,25,27];p._tk=null;
const r=g.tenpaiInfo(p);
assert(r,'應該有聽牌資料');
assert.deepStrictEqual(Object.keys(r).map(Number),[27],'只有打東先聽牌');
assert.deepStrictEqual(r[27].w.map(x=>x[0]).sort((a,b)=>a-b),[20,23,26],'聽 3索/6索/9索');
r[27].w.forEach(x=>{assert(x[1]>=1&&x[1]<=4,'餘牌數');assert(x[2]>=0&&x[3]>=x[2]-0,'番數');});
assert(r[27].max>=1&&r[27].ok,'夠起糊');
// 打其他牌唔聽;兩款打法都聽:加多一隻 3索 → 打東聽(6/9索), 打3索 亦聽
p.hand=[0,1,2,9,10,11,21,22,23,4,4,24,25,25];p._tk=null;
const r2=g.tenpaiInfo(p);
assert(r2&&Object.keys(r2).length>=1);
// 13 隻(非自己回合)→ null
p.hand=p.hand.slice(0,13);p._tk=null;
assert.strictEqual(g.tenpaiInfo(p),null);
console.log('tenpai ok');
process.exit(0);
