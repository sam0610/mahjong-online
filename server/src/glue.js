/* ====== 伺服器版:冇畫面、冇房主座位,所有真人座位都係遠端連線 ====== */
HOSTSEAT=0;
U.role='host';U.debug=false;U.screen='lobby';
var created=false,paused=false,pending=null,lastSnap=null,renderT=0,persistCb=null,roomCode='';
function Em(){var h={};return {on:function(e,f){(h[e]=h[e]||[]).push(f);return this;},emit:function(e,a){(h[e]||[]).slice().forEach(function(f){try{f(a);}catch(x){console.error(x);}});}};}
function render(){if(renderT)return;renderT=setTimeout(function(){renderT=0;try{broadcast();}catch(e){console.error(e);}},25);}
function myPid(){return '';}
function rememberRoom(){}
function dropSave(){}
function snapshot(phase,turn){
  if(!S.running||!S.players.length||paused)return;
  lastSnap=snapObj(phase,turn);
  if(persistCb)persistCb(lastSnap,false);
}
function makeConn(sendFn,closeFn){
  var c=Em();c.open=true;c.seen=Date.now();
  c.send=function(d){if(c.open)sendFn(d);};
  c.remoteClose=function(){if(!c.open)return;c.open=false;c.emit('close');};
  c.close=function(){if(!c.open)return;c.open=false;try{closeFn();}catch(e){}c.emit('close');};
  return c;
}
function connected(){return NET.members.filter(function(m){return m.conn&&m.conn.open!==false;});}

/* ---- 大廳 ---- */
HOOKS.lobby=function(){
  var l=lobbyInfo();
  NET.members.forEach(function(m,i){safeSend(m.conn,{t:'lobby',n:l.n,minFan:l.minFan,code:l.code,players:l.players,owner:i===0});});
};
function setCfg(c){
  c=c||{};
  var n=+c.n;U.cfg.n=(n>=2&&n<=4)?n:4;
  var f=+c.minFan;U.cfg.minFan=(f>=0&&f<=8)?f:3;
  var lv=+c.level;U.cfg.level=(lv>=1&&lv<=3)?lv:2;
}
function startServerGame(){
  if(S.running)return false;
  var n=U.cfg.n,mem=NET.members.filter(function(m){return m.joined&&!m.pond;}).slice(0,n);
  S.token++;S.asks={};S.ready={};
  S.n=n;S.minFan=U.cfg.minFan;S.level=U.cfg.level;S.players=[];
  var used={},ai=0;
  function uniq(nm){var x=nm,k=2;while(used[x]){x=nm+k;k++;}used[x]=1;return x;}
  for(var i=0;i<n;i++){
    var m=mem[i],human=!!m;
    var name=m?uniq(m.name):uniq(AI_NAMES[ai++]);
    S.players.push({id:i,name:name,human:human,remote:human,score:1000,level:S.level,hand:[],melds:[],flowers:[],discards:[],wind:0,drawn:null});
    if(m){m.seat=i;S.players[i].pid=m.pid||'';}
  }
  NET.members.forEach(function(m){if(mem.indexOf(m)<0)m.seat=-1;});
  S.dealer=0;S.round=0;S.handNo=1;S.lian=0;S.over=false;S.running=true;
  U.screen='game';paused=false;pending=null;
  runGame();render();
  return true;
}

/* ---- 暫停 / 還原:冇人喺度就停低,有人返嚟先繼續 ---- */
function restore(o){
  clearGrace();
  S.token++;S.asks={};S.ready={};S.call=null;
  U.cfg.n=o.n;U.cfg.minFan=o.minFan;U.cfg.level=o.level;
  S.n=o.n;S.minFan=o.minFan;S.level=o.level;S.dealer=o.dealer;S.round=o.round;S.handNo=o.handNo;S.lian=o.lian;
  S.wall=o.wall.slice();S.discN=o.discN;S.last=o.last?{seat:o.last.seat,t:o.last.t}:null;S.cur=o.cur;S.pond=(o.pond||[]).slice();
  S.players=o.players.map(function(q,i){
    var base=q.baseName||q.name;
    var pl={id:i,name:q.name,human:!!q.human,remote:false,score:q.score,level:q.level,hand:q.hand.slice(),melds:q.melds,flowers:q.flowers,discards:q.discards,taken:q.taken||{},wind:q.wind,drawn:q.drawn,pid:q.pid||''};
    if(q.pid){pl.baseName=base;pl.name=base+'(電腦)';pl.human=false;pl.away=true;pl.level=S.level;}
    return pl;
  });
  S.over=false;S.result=null;S.running=true;U.screen='game';
  NET.members.forEach(function(m){m.seat=-1;});
  paused=true;pending={phase:o.phase,turn:o.turn,result:o.result};
  created=true;
}
function resumeRun(){
  if(!paused)return;
  paused=false;var o=pending;pending=null;if(!o)return;
  if(o.phase==='over'){S.over=true;S.result=(o.result&&o.result.type==='win')?{type:'win',winner:o.result.winner}:o.result;S.msg='';nextHand();}
  else{S.over=false;S.result=null;runGame(o.turn||{});}
  render();
}
function pauseGame(){
  if(paused||!S.running)return;
  S.token++;
  if(!lastSnap){S.running=false;S.players=[];S.asks={};U.screen='lobby';return;}
  var snap=lastSnap;
  setTimeout(function(){restore(snap);if(persistCb)persistCb(snap,true);},0);
  paused=true;
}
/* 斷線緩衝:10 秒內返嚟就當冇事,逾時先由電腦代打 */
var GRACE_MS=10000,graceT={},graceI={};
function stopGrace(seat){clearTimeout(graceT[seat]);clearInterval(graceI[seat]);delete graceT[seat];delete graceI[seat];}
function clearGrace(){Object.keys(graceT).forEach(function(k){stopGrace(k);});S.players.forEach(function(p){p.offline=false;p.offLeft=0;});}
HOOKS.grace=function(seat){
  var p=S.players[seat];if(!p||!p.human||paused)return false;
  var end=Date.now()+GRACE_MS;
  p.offline=true;p.offLeft=Math.ceil(GRACE_MS/1000);
  stopGrace(seat);
  graceI[seat]=setInterval(function(){
    if(S.players[seat]!==p||!p.offline){stopGrace(seat);return;}
    p.offLeft=Math.max(1,Math.ceil((end-Date.now())/1000));render();
  },1000);
  graceT[seat]=setTimeout(function(){
    stopGrace(seat);
    if(S.players[seat]!==p||!p.offline||!p.human)return;
    p.offline=false;p.offLeft=0;takeover(seat);checkReady();render();
  },GRACE_MS);
  render();
  return true;
};
HOOKS.seated=function(si){
  if(si!==undefined&&S.players[si]){S.players[si].offline=false;S.players[si].offLeft=0;stopGrace(si);}
  if(paused)resumeRun();
};
HOOKS.closed=function(){
  if(S.running&&!paused&&!connected().some(function(m){return m.seat>=0;}))pauseGame();
};

/* ---- 對外接口 ---- */
return {
  setCode:function(c){roomCode=c;U.code=c;},
  exists:function(){return created||S.running;},
  members:function(){return NET.members.length;},
  running:function(){return S.running;},
  hasPid:function(pid){
    if(!pid)return false;
    if(NET.members.some(function(m){return m.pid===pid;}))return true;
    return S.players.some(function(p){return p.pid===pid;});
  },
  create:function(cfg){
    if(S.running||connected().length)return false;
    NET.members=[];setCfg(cfg);created=true;return true;
  },
  restore:restore,
  onPersist:function(f){persistCb=f;},
  makeConn:makeConn,
  accept:function(conn){onHostConn(conn);},
  start:function(conn){
    var i=NET.members.findIndex(function(m){return m.conn===conn;});
    if(i!==0)return false;    // 淨係房主(第一個入嘅人)可以開始
    return startServerGame();
  },
  idle:function(){return !connected().length;},
  info:function(){return {code:roomCode,created:created,running:S.running,paused:paused,members:NET.members.length,hand:S.handNo,cur:S.cur};},
  _S:S,_NET:NET
};
