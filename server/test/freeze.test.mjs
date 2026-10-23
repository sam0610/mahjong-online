import {createEngine} from '../src/engine.gen.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const eng=createEngine();eng.onPersist(()=>{});eng.setCode('F1');
function mk(name,pid){const c={view:null};c.conn=eng.makeConn(d=>{if(d.t==='view')c.view=d.v;},()=>{});eng.accept(c.conn);c.send=d=>c.conn.emit('data',d);c.hello=()=>c.send({t:'hello',name,pid});return c;}
eng.create({n:3,minFan:1,level:2});
const A=mk('甲','pa'),B=mk('乙','pb');A.hello();B.hello();await sleep(100);eng.start(A.conn);
await sleep(300);B.send({t:'proxy',on:true});A.send({t:'proxy',on:true});
await sleep(3000);
const prog=()=>B.view.players.map(p=>p.discards.length).join('/')+' cur'+B.view.cur;
console.log('running:',prog());
A.conn.remoteClose();await sleep(300);
const p0=prog();console.log('A dropped, fz=',JSON.stringify(B.view.fz),p0);
await sleep(5000);console.log('5s into freeze, same?',prog()===p0,prog(),'fz',JSON.stringify(B.view.fz));
const A2=mk('甲','pa');A2.hello();await sleep(300);
console.log('A back, fz=',B.view.fz,'A2 proxy?',A2.view&&A2.view.proxy);
A2.send({t:'proxy',on:true});
await sleep(3000);console.log('resumed progress:',prog());
// drop again, let it expire
A2.conn.remoteClose();await sleep(300);const p1=prog();
await sleep(9000);console.log('9s: still frozen',prog()===p1,JSON.stringify(B.view.fz));
await sleep(3500);console.log('after expiry: names',B.view.players.map(p=>p.name).join(','),'fz',B.view.fz,'progress',prog());
process.exit(0);
