// Prep Sync — cola de escritura offline (outbox) + caché de lectura + salud de conexión.
// Las escrituras intentan ir a Supabase; si no hay red (o la sesión venció, o el servidor
// responde 5xx/429), se encolan y se reenvían solas con backoff (idempotente vía upsert por id).
// Solo un error de datos verdadero (constraint, tipo, RLS con sesión válida) se aparta a
// 'fallidos', que se reporta al servidor en el heartbeat y se puede reintentar a mano.
// Lecturas se cachean para abrir offline.
window.PrepSync = (function(){
  var URL='https://jmkvphayyhwzootlybde.supabase.co', KEY='sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M';
  var APP_VERSION='2026.10.01-turno';
  var QKEY='prep_outbox', FKEY='prep_outbox_fallidos';
  var TIMEOUT_MS=10000;

  // fetch con timeout: una red lenta nunca deja un botón "cargando" para siempre.
  function fetchTO(input, init){
    init=init||{}; var ms=init.timeout||TIMEOUT_MS;
    var ctrl=new AbortController(), t=setTimeout(function(){ ctrl.abort(); }, ms);
    if(init.signal){ if(init.signal.aborted) ctrl.abort(); else init.signal.addEventListener('abort', function(){ ctrl.abort(); }); }
    var opts=Object.assign({}, init, {signal:ctrl.signal});
    return fetch(input, opts).then(function(r){ clearTimeout(t); netOk(); return r; },
      function(e){ clearTimeout(t); netFail(); throw e; });
  }
  // Mismo storageKey por defecto (sb-<ref>-auth-token) que el resto de clientes de la página:
  // la cola escribe con la sesión del usuario, no como anon.
  var _sb = window.supabase ? window.supabase.createClient(URL,KEY,{global:{fetch:fetchTO}}) : null;

  // ── Estado de red real (navigator.onLine miente cuando hay WiFi sin internet) ──
  var netDown=false;
  function setNet(down){ if(down===netDown) return; netDown=down;
    try{ window.dispatchEvent(new CustomEvent('prep:net',{detail:{down:down}})); }catch(e){} }
  function netOk(){ setNet(false); }
  function netFail(){ setNet(true); }

  function q(){ try{return JSON.parse(localStorage.getItem(QKEY)||'[]')}catch(e){return[]} }
  function setQ(a){ try{localStorage.setItem(QKEY,JSON.stringify(a))}catch(e){} badge(); }
  function fq(){ try{return JSON.parse(localStorage.getItem(FKEY)||'[]')}catch(e){return[]} }
  function setFq(a){ try{localStorage.setItem(FKEY,JSON.stringify(a.slice(-200)))}catch(e){} badge(); }
  function enqueue(op){ var a=q(); a.push(op); setQ(a); }

  function errMsg(e){ return ((e&&(e.message||e.error_description||e.msg))||String(e||''))+''; }
  function isNet(e){ if(!e)return false; var m=errMsg(e);
    return (e instanceof TypeError)||e.name==='AbortError'||e.status===0||
      /fetch|network|failed to fetch|load failed|timeout|timed out|offline|connection|abort/i.test(m); }
  // 'net' | 'retry' (sesión vencida, servidor ocupado, conflicto transitorio) | 'data'
  function classify(e, hasSession){
    if(isNet(e)) return 'net';
    var st=Number(e&&e.status)||0, code=((e&&e.code)||'')+'', m=errMsg(e);
    if(st===401||st===408||st===425||st===429||st>=500) return 'retry';
    if(/^PGRST30/.test(code)||/jwt|token|expired|unauthori[sz]ed|invalid claim|session/i.test(m)) return 'retry';
    if(/^(08|53|57|40)/.test(code)) return 'retry';            // conexión, recursos, timeout, deadlock/serialización
    if(code==='42501'&&!hasSession) return 'retry';            // RLS sin sesión = falta login, no dato malo
    return 'data';
  }
  async function exec(op){
    var t=_sb.from(op.table), r;
    if(op.op==='insert'||op.op==='upsert'){ r=await t.upsert(op.values,{onConflict:op.onConflict||'id'}); }
    else if(op.op==='update'){ var u=t.update(op.values); for(var k in (op.match||{})){ var v=op.match[k]; u=Array.isArray(v)?u.in(k,v):u.eq(k,v); } r=await u; }
    else if(op.op==='delete'){ var d=t.delete(); for(var k2 in (op.match||{})){ var v2=op.match[k2]; d=Array.isArray(v2)?d.in(k2,v2):d.eq(k2,v2); } r=await d; }
    if(r&&r.error){ var err=r.error; try{ err.status=r.status; }catch(_){} throw err; }
    return r;
  }
  async function sessionOk(){
    try{ var r=await _sb.auth.getSession(); return {ok:!!(r&&r.data&&r.data.session), error:r&&r.error}; }
    catch(e){ return {ok:false, error:e}; }
  }
  async function write(table, op, opts){
    opts=opts||{};
    var item={table:table, op:op, values:opts.values, match:opts.match, onConflict:opts.onConflict, ts:Date.now()};
    // Si ya hay cola, se respeta el orden: lo nuevo va detrás (un ítem nunca sube antes que su pedido).
    if(navigator.onLine && !netDown && !q().length){
      try{ await exec(item); return {queued:false,error:null}; }
      catch(e){ var s=await sessionOk(); var k=classify(e, s.ok);
        if(k!=='data'){ enqueue(item); bump(k); return {queued:true,error:null}; }
        return {queued:false,error:e}; }
    }
    enqueue(item); flush(); return {queued:true,error:null};
  }
  // Superpone lo pendiente de la cola sobre filas leídas del servidor (para que una recarga
  // no "borre" ventas que todavía no subieron, ni reabra un pedido ya cobrado en el dispositivo).
  function overlay(table, rows){
    var out=(rows||[]).slice(), byId={};
    out.forEach(function(r,i){ byId[r.id]=i; });
    q().forEach(function(op){
      if(op.table!==table) return;
      var vals=Array.isArray(op.values)?op.values:[op.values];
      if(op.op==='insert'||op.op==='upsert'){ vals.forEach(function(v){ if(v&&v.id!=null&&byId[v.id]==null){ byId[v.id]=out.length; out.push(Object.assign({},v)); } }); }
      else if(op.op==='update'){ var ids=op.match&&op.match.id; ids=Array.isArray(ids)?ids:(ids!=null?[ids]:[]);
        ids.forEach(function(id){ var i=byId[id]; if(i!=null) out[i]=Object.assign({},out[i],op.values); }); }
      else if(op.op==='delete'){ var d=op.match&&op.match.id; d=Array.isArray(d)?d:(d!=null?[d]:[]);
        d.forEach(function(id){ var i=byId[id]; if(i!=null) out[i]=null; }); }
    });
    return out.filter(Boolean);
  }

  // ── Vaciado de la cola con backoff exponencial ──
  var flushing=false, fails=0, nextAt=0, needLogin=false, lastErr='';
  function bump(kind){ fails++; nextAt=Date.now()+Math.min(60000, 1000*Math.pow(2,Math.min(fails,6)))+Math.floor(Math.random()*500);
    if(kind==='net') netFail(); }
  async function flush(force){
    if(flushing||!navigator.onLine||!_sb)return;
    if(!q().length){ fails=0; return; }
    if(!force && Date.now()<nextAt) return;
    flushing=true;
    try{
      // Refresca la sesión antes de subir: tras horas sin internet el token ya venció.
      var s=await sessionOk();
      if(!s.ok){ needLogin=!s.error||!isNet(s.error); bump(s.error&&isNet(s.error)?'net':'retry'); return; }
      needLogin=false;
      var a=q();
      while(a.length){ var op=a[0];
        try{ await exec(op); a.shift(); setQ(a); fails=0; nextAt=0; }
        catch(e){
          var k=classify(e,true); lastErr=errMsg(e).slice(0,300);
          if(k!=='data'){ bump(k); if(k==='retry') await sessionOk(); break; }
          op.dataTries=(op.dataTries||0)+1;
          if(op.dataTries<2){ setQ(a); bump('retry'); break; }   // un reintento antes de apartarlo
          var f=fq(); f.push({op:op,error:lastErr,code:e&&e.code||null,at:Date.now()}); setFq(f);
          a.shift(); setQ(a);
        }
      }
    } finally { flushing=false; badge(); }
  }
  // Devuelve lo apartado a la cola (al final, en su orden original) y reintenta.
  function retryFallidos(){
    var f=fq(); if(!f.length) return 0;
    var a=q(); f.forEach(function(x){ var op=x.op; delete op.dataTries; a.push(op); });
    setQ(a); setFq([]); fails=0; nextAt=0; flush(true); return f.length;
  }

  function badge(){
    if(!document.body) return;
    var n=q().length, nf=fq().length, el=document.getElementById('prep-syncbadge');
    if(!el){ if(!n&&!nf)return; el=document.createElement('div'); el.id='prep-syncbadge';
      el.style.cssText='position:fixed;right:10px;bottom:46px;z-index:99998;display:flex;flex-direction:column;align-items:flex-end;gap:6px;font:700 12px system-ui,sans-serif';
      document.body.appendChild(el); }
    var pill='border:2px solid #000;border-radius:999px;padding:6px 12px;box-shadow:3px 3px 0 #000;';
    var h='';
    if(n) h+='<div style="'+pill+'background:#ffcc00;color:#171c20">↑ '+n+' '+(window.PREP_SYNC_LABEL||'cambios')+' por sincronizar'+(needLogin?' · inicia sesión para subirlas':'')+'</div>';
    if(nf) h+='<button type="button" id="prep-retry-fallidos" style="'+pill+'background:#ff3b30;color:#fff;cursor:pointer;font:inherit">⚠ '+nf+' sin guardar · Reintentar</button>';
    el.innerHTML=h; el.style.display=(n||nf)?'flex':'none';
    var b=document.getElementById('prep-retry-fallidos'); if(b) b.onclick=function(){ var k=retryFallidos(); b.textContent='Oído · reintentando '+k; };
  }
  function cacheSet(k,v){ try{localStorage.setItem('prep_cache_'+k,JSON.stringify(v))}catch(e){} }
  function cacheGet(k){ try{return JSON.parse(localStorage.getItem('prep_cache_'+k))}catch(e){return null} }

  // ── Realtime con reconexión: nunca congelado en silencio ──
  var rtBar=null, rtDown={};
  function rtBanner(){
    var down=Object.keys(rtDown).some(function(k){return rtDown[k];}) && navigator.onLine;
    if(!rtBar){ if(!down||!document.body) return; rtBar=document.createElement('div'); rtBar.id='prep-rtbar'; rtBar.setAttribute('role','status'); rtBar.setAttribute('aria-live','polite');
      rtBar.style.cssText='position:fixed;left:50%;top:10px;transform:translateX(-50%);z-index:99999;background:#ffcc00;color:#171c20;border:2px solid #000;border-radius:999px;padding:7px 14px;font:700 13px system-ui,sans-serif;box-shadow:3px 3px 0 #000;display:none';
      rtBar.textContent='Reconectando… los datos se actualizan cada 15 s mientras tanto';
      document.body.appendChild(rtBar); }
    rtBar.style.display=down?'block':'none';
  }
  // client: cliente supabase de la página · name: canal · build(ch) agrega los .on(...) · resync(): recarga desde REST
  function realtime(client, name, build, resync){
    var ch=null, tries=0, timer=null, poll=null, wasDown=false;
    function setDown(d){ rtDown[name]=d; rtBanner();
      if(d&&!poll){ poll=setInterval(function(){ if(navigator.onLine) try{ resync(); }catch(e){} }, 15000); }
      if(!d&&poll){ clearInterval(poll); poll=null; } }
    function sched(){ if(timer) return; var ms=Math.min(30000, 1000*Math.pow(2,Math.min(tries,5)));
      timer=setTimeout(function(){ timer=null; start(); }, ms); }
    function start(){
      tries++;
      try{ if(ch) client.removeChannel(ch); }catch(e){}
      ch=build(client.channel(name+'_'+Date.now()));
      ch.subscribe(function(status){
        if(status==='SUBSCRIBED'){ tries=0; if(wasDown){ try{ resync(); }catch(e){} } wasDown=false; setDown(false); }
        else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){ wasDown=true; setDown(true); sched(); }
      });
    }
    window.addEventListener('online', function(){ tries=0; wasDown=true; start(); try{ resync(); }catch(e){} flush(true); });
    window.addEventListener('offline', function(){ wasDown=true; });
    // La tablet se durmió o volvió a primer plano: ponerse al día sin esperar eventos.
    document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='visible'){
      try{ resync(); }catch(e){} if(rtDown[name]||!ch||ch.state!=='joined'){ tries=0; start(); } } });
    start();
    return { restart:function(){ tries=0; start(); } };
  }

  // ── Heartbeat del dispositivo → prep_dispositivos (lo vigila el monitoreo del turno) ──
  function deviceId(){ var k='prep_device_id', v=null; try{ v=localStorage.getItem(k); }catch(e){}
    if(!v){ v=uuid(); try{ localStorage.setItem(k,v); }catch(e){} } return v; }
  function uuid(){ return (window.crypto&&crypto.randomUUID)?crypto.randomUUID():('id'+Date.now()+Math.random().toString(16).slice(2)); }
  var hbModulo=null, caidaDesde=null, ultimaCaida=null;
  async function heartbeatNow(){
    if(!hbModulo||!_sb||!navigator.onLine) return;
    var s=null; try{ var r=await _sb.auth.getSession(); s=r&&r.data&&r.data.session; }catch(e){}
    if(!s||!window.PREP_LOCAL) return;
    var f=fq();
    var row={ id:deviceId(), marca_id:window.PREP_MARCA||null, local_id:window.PREP_LOCAL, modulo:hbModulo,
      usuario:(s.user&&s.user.email)||null, version_app:APP_VERSION, online:!netDown, pendientes:q().length,
      fallidos:f.length, ultimo_error:lastErr||(f.length?f[f.length-1].error:null),
      fallidos_detalle:f.slice(-20), last_seen:new Date().toISOString(), user_agent:(navigator.userAgent||'').slice(0,300) };
    if(ultimaCaida){ row.ultima_caida_at=ultimaCaida.at; row.ultima_caida_seg=ultimaCaida.seg; }
    try{ var res=await _sb.from('prep_dispositivos').upsert(row,{onConflict:'id'}); if(!res.error) ultimaCaida=null; }catch(e){}
  }
  function heartbeat(modulo){
    hbModulo=modulo; heartbeatNow(); setInterval(heartbeatNow, 60000);
    window.addEventListener('offline', function(){ if(!caidaDesde) caidaDesde=Date.now(); });
    window.addEventListener('prep:net', function(ev){ if(ev.detail&&ev.detail.down){ if(!caidaDesde) caidaDesde=Date.now(); } else closeCaida(); });
    window.addEventListener('online', function(){ closeCaida(); });
  }
  function closeCaida(){ if(caidaDesde){ ultimaCaida={at:new Date(caidaDesde).toISOString(), seg:Math.round((Date.now()-caidaDesde)/1000)}; caidaDesde=null; heartbeatNow(); } }

  window.addEventListener('online', function(){ fails=0; nextAt=0; flush(true); badge(); });
  window.addEventListener('offline', badge);
  setInterval(function(){ flush(); }, 5000);   // respeta el backoff; si no hay cola no hace nada
  document.addEventListener('DOMContentLoaded', function(){ badge(); flush(true); });
  return {
    write:write, flush:flush, overlay:overlay, pending:function(){return q().length},
    fallidos:function(){return fq().length}, retryFallidos:retryFallidos,
    online:function(){return navigator.onLine && !netDown},
    uuid:uuid, cacheSet:cacheSet, cacheGet:cacheGet,
    fetch:fetchTO, realtime:realtime, heartbeat:heartbeat, version:APP_VERSION,
    _test:{classify:classify, isNet:isNet}
  };
})();
