// Prep Sync — cola de escritura offline (outbox) + caché de lectura.
// Las escrituras intentan ir a Supabase; si no hay red, se encolan y se reenvían
// al reconectar (idempotente vía upsert por id). Lecturas se cachean para abrir offline.
window.PrepSync = (function(){
  var URL='https://jmkvphayyhwzootlybde.supabase.co', KEY='sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M';
  var _sb = window.supabase ? window.supabase.createClient(URL,KEY) : null;
  var QKEY='prep_outbox';
  function q(){ try{return JSON.parse(localStorage.getItem(QKEY)||'[]')}catch(e){return[]} }
  function setQ(a){ try{localStorage.setItem(QKEY,JSON.stringify(a))}catch(e){} badge(); }
  function enqueue(op){ var a=q(); a.push(op); setQ(a); }
  function isNet(e){ if(!e)return false; var m=((e&&e.message)||'')+''; return (e instanceof TypeError)||/fetch|network|failed to fetch|timeout|offline|connection/i.test(m); }
  async function exec(op){
    var t=_sb.from(op.table), r;
    if(op.op==='insert'||op.op==='upsert'){ r=await t.upsert(op.values,{onConflict:op.onConflict||'id'}); }
    else if(op.op==='update'){ var u=t.update(op.values); for(var k in (op.match||{})){ var v=op.match[k]; u=Array.isArray(v)?u.in(k,v):u.eq(k,v); } r=await u; }
    else if(op.op==='delete'){ var d=t.delete(); for(var k2 in (op.match||{})){ var v2=op.match[k2]; d=Array.isArray(v2)?d.in(k2,v2):d.eq(k2,v2); } r=await d; }
    if(r&&r.error) throw r.error; return r;
  }
  async function write(table, op, opts){
    opts=opts||{};
    var item={table:table, op:op, values:opts.values, match:opts.match, onConflict:opts.onConflict, ts:Date.now()};
    if(navigator.onLine){
      try{ await exec(item); flush(); return {queued:false,error:null}; }
      catch(e){ if(isNet(e)){ enqueue(item); return {queued:true,error:null}; } return {queued:false,error:e}; }
    }
    enqueue(item); return {queued:true,error:null};
  }
  var flushing=false;
  async function flush(){
    if(flushing||!navigator.onLine||!_sb)return; flushing=true;
    var a=q();
    while(a.length){ var op=a[0];
      try{ await exec(op); a.shift(); setQ(a); }
      catch(e){ if(isNet(e)) break; a.shift(); setQ(a); } // error no-red: descartar para no atascar la cola
    }
    flushing=false; badge();
  }
  function badge(){
    var n=q().length, el=document.getElementById('prep-syncbadge');
    if(!el){ if(!n||!document.body)return; el=document.createElement('div'); el.id='prep-syncbadge';
      el.style.cssText='position:fixed;right:10px;bottom:46px;z-index:99998;background:#ffcc00;color:#171c20;border:2px solid #000;border-radius:999px;padding:6px 12px;font:700 12px system-ui,sans-serif;box-shadow:3px 3px 0 #000'; document.body.appendChild(el); }
    if(el){ el.style.display=n?'block':'none'; el.textContent='↑ '+n+' por sincronizar'; }
  }
  function cacheSet(k,v){ try{localStorage.setItem('prep_cache_'+k,JSON.stringify(v))}catch(e){} }
  function cacheGet(k){ try{return JSON.parse(localStorage.getItem('prep_cache_'+k))}catch(e){return null} }
  window.addEventListener('online', function(){ flush(); badge(); });
  window.addEventListener('offline', badge);
  setInterval(flush, 20000);
  document.addEventListener('DOMContentLoaded', function(){ badge(); flush(); });
  return {
    write:write, flush:flush, pending:function(){return q().length},
    online:function(){return navigator.onLine},
    uuid:function(){return (window.crypto&&crypto.randomUUID)?crypto.randomUUID():('id'+Date.now()+Math.random().toString(16).slice(2))},
    cacheSet:cacheSet, cacheGet:cacheGet
  };
})();
