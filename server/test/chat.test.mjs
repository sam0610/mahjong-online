import {createEngine} from '../src/engine.gen.js';
import assert from 'node:assert';
const eng=createEngine();eng.setCode('CHT2');
function mk(name,pid){const c={view:null,chats:[]};c.conn=eng.makeConn(d=>{if(d.t==='view')c.view=d.v;if(d.t==='chat')c.chats.push(d);},()=>{});eng.accept(c.conn);c.send=d=>c.conn.emit('data',d);c.send({t:'hello',name,pid});return c;}
eng.create({n:3,minFan:1,level:2});
const A=mk('甲','pa'),B=mk('乙','pb');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await wait(100);
// 未開局:唔收
A.send({t:'chat',k:'x',v:'早晨'});await wait(50);
assert.strictEqual(A.chats.length+B.chats.length,0,'未開局唔廣播');
eng.start(A.conn);
for(let i=0;i<40&&!(A.view&&B.view);i++)await wait(100);
const sa=A.view.me,sb=B.view.me;
A.send({t:'chat',k:'x',v:'快啲啦!'});await wait(50);
assert.deepStrictEqual(A.chats.map(c=>[c.s,c.k,c.v]),[[sa,'x','快啲啦!']],'發言者自己都收到');
assert.deepStrictEqual(B.chats.map(c=>[c.s,c.k,c.v]),[[sa,'x','快啲啦!']],'其他人收到');
// 3 秒內再發:擋住(連表情都擋)
A.send({t:'chat',k:'e',v:'😄'});await wait(50);
assert.strictEqual(A.chats.length,1,'3 秒內第二次被擋');
// 另一個人唔受影響
B.send({t:'chat',k:'e',v:'🔥'});await wait(50);
assert.deepStrictEqual(A.chats.slice(-1)[0],{t:'chat',s:sb,k:'e',v:'🔥'});
// 非法表情、空白、HTML 字元
B.conn.emit('data',{t:'chat',k:'e',v:'<img>'});
await wait(3100);
B.send({t:'chat',k:'e',v:'💣'});await wait(50);
assert.strictEqual(B.chats.length,2,'唔喺 8 個表情入面 → 擋');
B.send({t:'chat',k:'x',v:'   '});await wait(50);
assert.strictEqual(B.chats.length,2,'空白 → 擋');
B.send({t:'chat',k:'x',v:'<b>好</b>牌'+'啊'.repeat(40)});await wait(50);
const last=B.chats.slice(-1)[0];
assert(!/[<>]/.test(last.v),'去除 < >');
assert(Array.from(last.v).length<=30,'最多 30 字');
// 角色表情:合法 c/i 照發,非法就當冇
await wait(3100);
A.send({t:'chat',k:'x',v:'好牌!',c:'bobo',i:2});await wait(50);
assert.deepStrictEqual(B.chats.slice(-1)[0],{t:'chat',s:sa,k:'x',v:'好牌!',c:'bobo',i:2},'角色表情傳去其他人');
await wait(3100);
A.send({t:'chat',k:'x',v:'唔該曬',c:'<evil>',i:99});await wait(50);
assert.deepStrictEqual(B.chats.slice(-1)[0],{t:'chat',s:sa,k:'x',v:'唔該曬'},'非法角色/格數 → 淨文字');
await wait(3100);
A.send({t:'chat',k:'e',v:'😄',c:'chick',i:1});await wait(50);
assert.deepStrictEqual(B.chats.slice(-1)[0],{t:'chat',s:sa,k:'e',v:'😄'},'表情唔帶角色');
console.log('chat OK');
process.exit(0);
