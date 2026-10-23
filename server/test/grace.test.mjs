import {createEngine} from '../src/engine.gen.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const eng=createEngine();eng.onPersist(()=>{});eng.setCode('G1');
function mk(name,pid){const c={view:null};c.conn=eng.makeConn(d=>{if(d.t==='view')c.view=d.v;},()=>{});eng.accept(c.conn);c.send=d=>c.conn.emit('data',d);c.hello=()=>c.send({t:'hello',name,pid});return c;}
eng.create({n:3,minFan:1,level:2});
const A=mk('甲','pa'),B=mk('乙','pb');A.hello();B.hello();await sleep(100);eng.start(A.conn);await sleep(300);
B.send({t:'proxy',on:true});
const nm=()=>B.view.players.map(p=>p.name).join(',');
A.conn.remoteClose();await sleep(500);
console.log('right after A drops:',nm());
// A returns after 4s
await sleep(4000);const A2=mk('甲','pa');A2.hello();await sleep(300);
console.log('A back at ~5s:',nm(),'A2 seat',A2.view&&A2.view.me,'human?',A2.view&&A2.view.players[0].human);
A2.send({t:'proxy',on:false});
A2.conn.remoteClose();await sleep(500);
console.log('A drops again:',nm());
await sleep(10500);
console.log('after 10s no return:',nm());
process.exit(0);
