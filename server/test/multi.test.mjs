// 一炮雙響:出銃嗰家逐個賠足,當連莊
import {createEngine} from '../src/engine.gen.js';
import assert from 'node:assert';
const eng=createEngine();eng.setCode('MULT1');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function mk(name,pid){const c={view:null};c.conn=eng.makeConn(d=>{if(d.t==='view')c.view=d.v;},()=>{});eng.accept(c.conn);c.send=d=>c.conn.emit('data',d);c.send({t:'hello',name,pid});return c;}
eng.create({n:4,minFan:1,level:2});
const A=mk('甲','pa'),B=mk('乙','pb'),C=mk('丙','pc');
await sleep(100);
eng.start(A.conn);
const S=eng._S;
for(const x of [A,B,C])x.send({t:'proxy',on:true});
for(let i=0;i<100&&!(S.players.length&&!S.dice&&S.players[0].hand.length>=13);i++)await sleep(200);
for(const x of [A,B,C])x.send({t:'proxy',on:false});
// 等到甲要打牌
let ok=false;
for(let i=0;i<400;i++){
  await sleep(100);
  for(const x of [B,C])if(x.view&&x.view.ask&&x.view.ask.kind==='turn'){const h=x.view.players[x.view.me].hand;x.send({t:'ans',id:x.view.ask.id,v:{a:'discard',t:h[h.length-1]}});}
  for(const x of [A,B,C])if(x.view&&x.view.ask&&x.view.ask.kind==='claim')x.send({t:'ans',id:x.view.ask.id,v:{a:'pass'}});
  if(A.view&&A.view.ask&&A.view.ask.kind==='turn'&&!A.view.over){ok=true;break;}
  assert(!S.over,'未到甲已經完局,重跑');
}
assert(ok,'甲輪到打牌');
const a=A.view.me,b=B.view.me,c=C.view.me,P=S.players;
P[b].hand=[0,0,0,1,1,1,2,2,2,3,3,3,4];P[b].melds=[];
P[c].hand=[4,14,14,14,15,15,15,16,16,16,17,17,17];P[c].melds=[];
P[a].hand[0]=4;
const sc=P.map(p=>p.score),dealer=S.dealer,lian=S.lian;
A.send({t:'ans',id:A.view.ask.id,v:{a:'discard',t:4}});
for(let i=0;i<100&&!S.over;i++){
  await sleep(100);
  for(const x of [B,C])if(x.view&&x.view.ask&&x.view.ask.kind==='claim'&&x.view.ask.opts.ev)x.send({t:'ans',id:x.view.ask.id,v:{a:'win'}});
}
assert(S.over,'完局');
const r=S.result;
assert.strictEqual(r.type,'win');assert(r.multi,'multi');assert.strictEqual(r.wins.length,2);
assert.deepStrictEqual(r.wins.map(x=>x.seat).sort(),[b,c].sort());
const gb=r.wins.find(x=>x.seat===b).gain,gc=r.wins.find(x=>x.seat===c).gain;
assert(gb>0&&gc>0);
assert.strictEqual(P[a].score,sc[a]-gb-gc,'出銃嗰家賠兩份');
assert.strictEqual(P[b].score,sc[b]+gb);assert.strictEqual(P[c].score,sc[c]+gc);
assert.strictEqual(P[b].hand.length,14);assert.strictEqual(P[c].hand.length,14);
assert(A.view.result.wins.length===2,'view 有齊兩個贏家');
console.log('雙響',r.wins.map(x=>P[x.seat].name+' '+x.ev.fan+'番 +'+x.gain).join(' / '),'出銃',P[a].name,P[a].score-sc[a]);
for(const x of [A,B,C])x.send({t:'ready'});
for(let i=0;i<60&&S.over;i++)await sleep(200);
assert.strictEqual(S.dealer,dealer,'連莊:莊家不變');assert.strictEqual(S.lian,lian+1,'連莊數 +1');
console.log('multi OK');
process.exit(0);
