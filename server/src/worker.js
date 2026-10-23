import {Room} from './room.js';
export {Room};
const ORIGINS=['https://sam0610.github.io','http://localhost:8123','http://127.0.0.1:8123','http://localhost:8787'];
export default {
  async fetch(req,env){
    const url=new URL(req.url);
    if(url.pathname==='/'||url.pathname==='/health')return new Response('mahjong room server ok');
    const m=/^\/room\/([A-Za-z0-9]{3,12})$/.exec(url.pathname);
    if(!m)return new Response('not found',{status:404});
    const o=req.headers.get('Origin');
    if(o&&!ORIGINS.includes(o))return new Response('forbidden',{status:403});
    const id=env.ROOM.idFromName(m[1].toUpperCase());
    return env.ROOM.get(id).fetch(req);
  }
};
