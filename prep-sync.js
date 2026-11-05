// Prep Sync — cola de escritura offline (outbox) + caché de lectura + salud de conexión.
// Las escrituras intentan ir a Supabase; si no hay red (o la sesión venció, o el servidor
// responde 5xx/429), se encolan y se reenvían solas con backoff (idempotente vía upsert por id).
// Solo un error de datos verdadero (constraint, tipo, RLS con sesión válida) se aparta a
// 'fallidos', que se reporta al servidor en el heartbeat y se puede reintentar a mano.
// Lecturas se cachean para abrir offline.
window.PrepSync = (function(){
  var URL='https://jmkvphayyhwzootlybde.supabase.co', KEY='sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M';
  var APP_VERSION='2026.11.05-central2';
  var QKEY='prep_outbox', FKEY='prep_outbox_fallidos';
  var TIMEOUT_MS=10000;
  // Estado de la central del local (ver más abajo). Declarado arriba: write/overlay/badge lo leen.
  var HUB={on:false, paired:false, pend:[], seq:0, es:null, imprime:false, draining:false};

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
  function clean(v){ if(Array.isArray(v)) return v.map(clean); if(!v||typeof v!=='object') return v;
    var o={}; for(var k in v){ if(k.charAt(0)!=='_') o[k]=v[k]; } return o; }
  async function exec(op){
    var t=_sb.from(op.table), r; op=Object.assign({}, op, {values:clean(op.values)});
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
    if(HUB.on && HUB.paired){ var hr=await hubSend([item]); if(hr) return {queued:netDown||!navigator.onLine, error:null, hub:true}; }
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
    q().concat(HUB.pend).forEach(function(op){
      if(op.table!==table) return;
      var vals=Array.isArray(op.values)?op.values:[op.values];
      if(op.op==='insert'||op.op==='upsert'){ vals.forEach(function(v){ if(v&&v.id!=null&&byId[v.id]==null){ byId[v.id]=out.length; out.push(Object.assign({},v)); } }); }
      else if(op.op==='update'){ var ids=op.match&&op.match.id; ids=Array.isArray(ids)?ids:(ids!=null?[ids]:[]);
        ids.forEach(function(id){ var i=byId[id]; if(i!=null) out[i]=Object.assign({},out[i],op.values); }); }
      else if(op.op==='delete'){ var d=op.match&&op.match.id; d=Array.isArray(d)?d:(d!=null?[d]:[]);
        d.forEach(function(id){ var i=byId[id]; if(i!=null) out[i]=null; }); }
    });
    return out.filter(Boolean).map(function(r){ if(r.ticket_num==null&&r._ticket_prov!=null){ r=Object.assign({},r,{ticket_num:r._ticket_prov,_prov:true}); } return r; });
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
    var n=q().length+HUB.pend.length, nf=fq().length, el=document.getElementById('prep-syncbadge');
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
    // Conectado a la central del local: los cambios llegan por el wifi (SSE), el aviso sobra.
    var down=Object.keys(rtDown).some(function(k){return rtDown[k];}) && navigator.onLine && !(HUB.on&&HUB.paired);
    if(!rtBar){ if(!down||!document.body) return; rtBar=document.createElement('div'); rtBar.id='prep-rtbar'; rtBar.setAttribute('role','status'); rtBar.setAttribute('aria-live','polite');
      rtBar.style.cssText='pointer-events:none;opacity:.9;position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:99999;background:#ffcc00;color:#171c20;border:2px solid #000;border-radius:999px;padding:7px 14px;font:700 13px system-ui,sans-serif;box-shadow:3px 3px 0 #000;display:none';
      rtBar.textContent='Reconectando · se actualiza cada 15 s';
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


  // ── Central del local (Prep Local en la laptop de caja) ──
  // Si la app se abrió desde la laptop por el wifi (http://192.168.x.x:8080), cada escritura
  // va a la central: ella la reparte al instante a los demás equipos del local (aunque no haya
  // internet) y un equipo con sesión la sube a Supabase en el MISMO orden en que llegó.
  // Así un cobro hecho en la caja nunca sube antes que el pedido que abrió un mozo en su celular.
  var LAN=/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.)/.test(location.hostname)||location.hostname==='localhost'||/\.local$/.test(location.hostname);
  function hubTok(){ try{return localStorage.getItem('prep_hub_token')||''}catch(e){return ''} }
  function hubCall(path, body, ms){
    var ctrl=new AbortController(), t=setTimeout(function(){ ctrl.abort(); }, ms||4000);
    return fetch('/__hub/'+path, {method:body?'POST':'GET', headers:{'Content-Type':'application/json','X-Hub-Token':hubTok()},
      body:body?JSON.stringify(body):undefined, signal:ctrl.signal, cache:'no-store'})
      .then(function(r){ clearTimeout(t); if(!r.ok){ var e=new Error('central '+r.status); e.status=r.status; throw e; } return r.json(); },
            function(e){ clearTimeout(t); throw e; });
  }
  function hubPendSave(){ try{ localStorage.setItem('prep_hub_pend', JSON.stringify(HUB.pend)); }catch(e){} badge(); }
  try{ HUB.pend=JSON.parse(localStorage.getItem('prep_hub_pend')||'[]'); }catch(e){ HUB.pend=[]; }
  async function hubSend(items){
    // lo que quedó en la cola propia (de antes de conectarse a la central) va primero
    var own=q(); if(own.length){ try{ var r0=await hubCall('ops',{dev:deviceId(), ops:own}); setQ([]); (r0.ops||[]).forEach(hubAddPend); }catch(e){ return false; } }
    try{ var r=await hubCall('ops',{dev:deviceId(), ops:items}); (r.ops||[]).forEach(hubAddPend); hubDrainSoon(); return true; }
    catch(e){ if(e.status===401){ HUB.paired=false; hubPairUI(); } return false; }
  }
  function hubAddPend(op){ if(!op||op.seq==null) return; if(HUB.pend.some(function(x){return x.seq===op.seq;})) return; HUB.pend.push(op); HUB.pend.sort(function(a,b){return a.seq-b.seq;}); hubPendSave(); }
  function hubDrop(seqs){ if(!seqs||!seqs.length) return; var s={}; seqs.forEach(function(n){s[n]=1;}); HUB.pend=HUB.pend.filter(function(x){return !s[x.seq];}); hubPendSave(); }
  function hubStream(){
    if(HUB.es) try{ HUB.es.close(); }catch(e){}
    var es=new EventSource('/__hub/stream?token='+encodeURIComponent(hubTok())); HUB.es=es;
    es.onmessage=function(ev){ var m; try{ m=JSON.parse(ev.data); }catch(e){ return; }
      if(m.t==='snap'){ HUB.pend=(m.pend||[]); hubPendSave(); var nuevo=m.seq>HUB.seq; HUB.seq=m.seq; HUB.imprime=!!m.imprime;
        if(nuevo) try{ window.dispatchEvent(new CustomEvent('prep:remote',{detail:{snap:true}})); }catch(e){} return; }
      if(m.t==='op'){ HUB.seq=Math.max(HUB.seq,m.op.seq); if(m.op.st==='pend') hubAddPend(m.op);
        if(m.op.dev!==deviceId()) try{ window.dispatchEvent(new CustomEvent('prep:remote',{detail:m.op})); }catch(e){}
        hubDrainSoon(); return; }
      if(m.t==='ack'){ hubDrop(m.ok); hubDrop((m.fail||[]).map(function(f){return f.seq;})); return; }
      if(m.t==='cfg'){ HUB.imprime=!!m.imprime; }
    };
    es.onerror=function(){ /* EventSource reintenta solo */ };
  }
  // Un solo equipo a la vez (el que tenga la "llave" de la central) sube lo pendiente a Supabase.
  var drainT=null;
  function hubDrainSoon(){ if(drainT) return; drainT=setTimeout(function(){ drainT=null; hubDrain(); }, 400); }
  async function hubDrain(){
    if(!HUB.on||!HUB.paired||HUB.draining||!navigator.onLine||!_sb) return;
    var s=await sessionOk(); if(!s.ok) return;
    HUB.draining=true;
    try{
      var r=await hubCall('drain',{dev:deviceId()}); var ops=r.ops||[]; if(!ops.length) return;
      var ok=[], fail=[];
      for(var i=0;i<ops.length;i++){ var op=ops[i];
        try{ await exec(op); ok.push(op.seq); }
        catch(e){ var k=classify(e,true); lastErr=errMsg(e).slice(0,300);
          if(k!=='data') break;                                   // sin internet o sesión: se para y reintenta luego
          fail.push({seq:op.seq, error:lastErr}); var f=fq(); f.push({op:op,error:lastErr,code:e&&e.code||null,at:Date.now()}); setFq(f); }
      }
      if(ok.length||fail.length){ await hubCall('ack',{dev:deviceId(), ok:ok, fail:fail}); hubDrop(ok); hubDrop(fail.map(function(f){return f.seq;})); }
      if(ok.length+fail.length===ops.length) hubDrainSoon();
    }catch(e){} finally{ HUB.draining=false; }
  }
  function hubPairUI(){
    if(!document.body){ document.addEventListener('DOMContentLoaded', hubPairUI); return; }
    if(document.getElementById('prep-hubpair')) return;
    var d=document.createElement('div'); d.id='prep-hubpair';
    d.style.cssText='position:fixed;inset:0;z-index:100000;background:rgba(23,28,32,.55);display:flex;align-items:center;justify-content:center;padding:16px;font-family:system-ui,sans-serif';
    d.innerHTML='<form style="background:#fcf9f8;border:2px solid #000;border-radius:16px;box-shadow:6px 6px 0 #000;padding:20px;max-width:340px;width:100%">'+
      '<div style="font-weight:800;font-size:18px;margin-bottom:6px">Conectar con la caja</div>'+
      '<div style="font-size:14px;margin-bottom:12px">Escribe el PIN que aparece en la pantalla de Prep Local, en la laptop de caja. Se pide una sola vez por equipo.</div>'+
      '<input id="prep-hubpin" inputmode="numeric" autocomplete="off" maxlength="6" style="width:100%;font-size:24px;letter-spacing:6px;text-align:center;padding:10px;border:2px solid #000;border-radius:10px">'+
      '<div id="prep-hubmsg" style="color:#c8372d;font-size:13px;min-height:18px;margin:6px 0"></div>'+
      '<button style="width:100%;padding:12px;border:2px solid #000;border-radius:999px;background:#1e5af9;color:#fff;font-weight:700;font-size:15px">Conectar</button>'+
      '<button type="button" id="prep-hubskip" style="width:100%;margin-top:8px;padding:8px;border:none;background:none;font-size:13px;text-decoration:underline">Ahora no (este equipo no se avisará con los demás sin internet)</button></form>';
    document.body.appendChild(d);
    d.querySelector('#prep-hubskip').onclick=function(){ d.remove(); };
    d.querySelector('form').onsubmit=function(ev){ ev.preventDefault();
      var pin=d.querySelector('#prep-hubpin').value.trim();
      hubCall('pair',{pin:pin, dev:deviceId(), nombre:(navigator.userAgent||'').slice(0,80)}).then(function(r){
        try{ localStorage.setItem('prep_hub_token', r.token); }catch(e){}
        HUB.paired=true; d.remove(); hubStream(); hubSend([]).then(function(){}); },
        function(){ d.querySelector('#prep-hubmsg').textContent='PIN incorrecto. Revísalo en la laptop.'; });
    };
  }
  async function hubInit(){
    if(!LAN) return;
    try{ var r=await hubCall('ping'); if(!r||!r.hub) return; }catch(e){ return; }
    HUB.on=true; HUB.imprime=!!r.imprime; HUB.paired=!!r.paired;
    if(!HUB.paired){ hubPairUI(); return; }
    hubStream();
    if(q().length) hubSend([]);
    setInterval(hubDrain, 3000);
  }
  // Comanda a la impresora térmica de la laptop (sin diálogo de impresión). Devuelve false si no se pudo.
  async function hubPrint(comanda){
    if(!HUB.on||!HUB.paired||!HUB.imprime) return false;
    try{ var r=await hubCall('print', comanda, 8000); return !!(r&&r.ok); }catch(e){ return false; }
  }
  hubInit();
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
    hub:function(){return {on:HUB.on, paired:HUB.paired, imprime:HUB.imprime, pendientes:HUB.pend.length};}, hubPrint:hubPrint,
    _test:{classify:classify, isNet:isNet}
  };
})();
