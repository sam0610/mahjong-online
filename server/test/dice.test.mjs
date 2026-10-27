import {createEngine} from '../src/engine.gen.js';
import assert from 'node:assert';
const eng=createEngine();eng.setCode('DICE1');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function mk(name,pid){
  const c={name,msgs:[],view:null,lobby:null};
  c.conn=eng.makeConn(d=>{c.msgs.push(d);if(d.t==='view')c.view=d.v;if(d.t==='lobby')c.lobby=d;},()=>{});
  eng.accept(c.conn);c.send=d=>c.conn.emit('data',d);c.send({t:'hello',name,pid});return c;
}
assert(eng.create({n:4,minFan:1,level:2}));
const A=mk('甲','pa'),B=mk('乙','pb'),C=mk('丙','pc');
await sleep(100);
console.log('seats default',A.lobby.seats);
assert.deepStrictEqual(A.lobby.seats,['甲','乙','丙',null]);
B.send({t:'seat',a:1,b:3});await sleep(50);                        // 非房主:無效
assert.deepStrictEqual(A.lobby.seats,['甲','乙','丙',null]);
A.send({t:'seat',a:1,b:3});await sleep(50);                        // 乙去左邊(空位)
assert.deepStrictEqual(A.lobby.seats,['甲',null,'丙','乙']);
A.send({t:'seat',a:2,b:3});await sleep(50);                        // 對調
assert.deepStrictEqual(B.lobby.seats,['甲',null,'乙','丙']);
A.send({t:'seat',a:0,b:2});await sleep(50);                        // 房主固定
assert.deepStrictEqual(A.lobby.seats,['甲',null,'乙','丙']);
A.send({t:'shuffle'});await sleep(50);
assert.strictEqual(A.lobby.seats[0],'甲');
assert.deepStrictEqual(A.lobby.seats.filter(Boolean).sort(),['丙','乙','甲'].sort());
A.send({t:'seat',a:1,b:2});await sleep(10);
const want=A.lobby.seats.slice();
assert(eng.start(A.conn));
await sleep(100);
const S=eng._S;
assert(S.dice,'dice phase');
assert.deepStrictEqual(S.players.map(p=>p.human?p.name:null),want);
assert.strictEqual(A.view.ask&&A.view.ask.kind,'roll');
// 房主隨即擲,其他人逾時前都擲
A.send({t:'ans',id:A.view.ask.id,v:{a:'roll'}});
B.send({t:'ans',id:B.view.ask.id,v:{a:'bad'}});   // 無效答案
await sleep(100);
assert(B.view.ask,'invalid ignored');
B.send({t:'ans',id:B.view.ask.id,v:{a:'roll'}});
C.send({t:'ans',id:C.view.ask.id,v:{a:'roll'}});
for(let i=0;i<80&&!(S.dice&&S.dice.win>=0);i++){await sleep(300);for(const x of [A,B,C])if(x.view&&x.view.ask&&x.view.ask.kind==='roll')x.send({t:'ans',id:x.view.ask.id,v:{a:'roll'}});}   // 平手會再擲,要再答
assert(S.dice&&S.dice.win>=0,'winner shown');
assert.strictEqual(A.view.ask&&A.view.ask.kind,'dok');
const t0=Date.now();
A.send({t:'ans',id:A.view.ask.id,v:{a:'ok'}});B.send({t:'ans',id:B.view.ask.id,v:{a:'ok'}});
await sleep(1500);assert(S.dice,'still waiting for C');
for(let i=0;i<40&&S.dice;i++)await sleep(500);
assert(!S.dice,'dice finished');console.log('waited',Date.now()-t0,'ms (≈10s timeout since C silent)');
const d=S.dealer;
console.log('dealer',d,S.players[d].name,'winds',S.players.map(p=>p.wind),'d0',S.d0);
assert.strictEqual(S.d0,d);
S.players.forEach((p,i)=>assert.strictEqual(p.wind,(i-d+4)%4));
await sleep(1500);
assert(S.players.every(p=>p.hand.length>=12),'hands dealt');assert.strictEqual(S.handNo,1);
// 輪莊:局終後莊家輪到下一個,round 在回到 d0 先加
S.over=true;S.result={type:'win',winner:(d+1)%4};
eng._S.ready={};
console.log('OK');
process.exit(0);
