import {Room} from './room.js';
import {Names} from './names.js';
export {Room,Names};
const ORIGINS=['https://sam0610.github.io','http://localhost:8123','http://127.0.0.1:8123','http://localhost:8787'];
export default {
  async fetch(req,env){
    const url=new URL(req.url);
    if(url.pathname==='/'||url.pathname==='/health')return new Response('mahjong room server ok');
    if(url.pathname==='/names'){
      const o=req.headers.get('Origin');
      if(o&&!ORIGINS.includes(o))return new Response('forbidden',{status:403});
      const cors={'access-control-allow-origin':o||'*','access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type','access-control-max-age':'86400'};
      if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
      const r=await env.NAMES.get(env.NAMES.idFromName('global')).fetch(req);
      const h=new Headers(r.headers);Object.keys(cors).forEach(k=>h.set(k,cors[k]));
      return new Response(r.body,{status:r.status,headers:h});
    }
    const m=/^\/room\/([A-Za-z0-9]{3,12})$/.exec(url.pathname);
    if(!m)return new Response('not found',{status:404});
    const o=req.headers.get('Origin');
    if(o&&!ORIGINS.includes(o))return new Response('forbidden',{status:403});
    const id=env.ROOM.idFromName(m[1].toUpperCase());
    return env.ROOM.get(id).fetch(req);
  }
};
