// Contexto de cliente (multi-tenant). Resuelve marca/local en este orden:
// 1) Subdominio de cliente (ej. la-calor.prep.rest -> La Calor)
// 2) ?marca=&local= en la URL (super admin navegando desde el portal en os.prep.rest)
// 3) localStorage prep_ctx (último cliente abierto, persistente)
// 4) SIN contexto: nunca se asume otro restaurante. PREP_MARCA/PREP_LOCAL quedan en un
//    valor que no coincide con ningún cliente (las consultas vuelven vacías) y auth-guard.js
//    deriva el contexto del usuario (su marca/sede) o manda al super admin a /portal.
(function(){
  // Mapa de subdominios de cliente -> {marca, local}. Agregar aquí cada cliente con su URL.
  var SUB={
    'casa-italia':{marca:'m6',local:'l11'},   // casa-italia.prep.rest
    'casaitalia':{marca:'m6',local:'l11'},    // dominio propio casaitalia.rest
    'symposium':{marca:'m7',local:'l12'},
    'lcds':{marca:'m8',local:'l13'},
    'la-calor':{marca:'m9',local:'l17'}   // la-calor.prep.rest (demo bar)
  };
  var host=(location.hostname||'').toLowerCase();
  var sub=host.split('.')[0];
  var q=new URLSearchParams(location.search);
  var ctx={};try{ctx=JSON.parse(localStorage.getItem('prep_ctx')||'{}')}catch(e){}
  // Sede por defecto de cada marca (para ?marca= sin &local=). Si falta, auth-guard la resuelve.
  var DEF_LOCAL={m6:'l11',m7:'l12',m8:'l13',m9:'l17'};
  var SIN='__sin_contexto__';
  var marca, local, needCtx=false;
  if(SUB[sub]){                      // 1) subdominio de cliente manda la MARCA
    marca=SUB[sub].marca;
    // la SEDE sí puede cambiar dentro de la misma marca (selector multi-sede)
    local=q.get('local') || ((ctx.marca===marca && ctx.local) ? ctx.local : SUB[sub].local);
    if(q.get('local')){ctx.marca=marca;ctx.local=local;try{localStorage.setItem('prep_ctx',JSON.stringify(ctx))}catch(e){}}
  }else{                             // os.prep.rest / app / etc. -> portal o contexto elegido
    marca=q.get('marca')||ctx.marca||null;
    if(marca){
      local=q.get('local')||((ctx.marca===marca&&ctx.local)?ctx.local:DEF_LOCAL[marca])||null;
      if(!local){local=SIN;needCtx=true;}
      if(q.get('marca')&&local!==SIN){ctx.marca=marca;ctx.local=local;try{localStorage.setItem('prep_ctx',JSON.stringify(ctx))}catch(e){}}
    }else{ marca=SIN; local=SIN; needCtx=true; }
  }
  window.PREP_MARCA=marca; window.PREP_LOCAL=local; window.PREP_SUBHOST=sub;
  window.PREP_NEEDCTX=needCtx;      // true: falta contexto, auth-guard.js lo resuelve
  // Nombre del cliente activo para textos (mensajes de WhatsApp, tickets, órdenes de compra).
  // Sale de la caché que llena client-name.js desde inv_marcas; nunca de un nombre fijo.
  var noms={};try{noms=JSON.parse(localStorage.getItem('prep_cli_nombres')||'{}')}catch(e){}
  window.PREP_CLIENTE=(!needCtx&&noms[marca])||'';
  window.prepCliente=function(alt){return window.PREP_CLIENTE||alt||'nuestro local';};
  window.PREP_BYSUB=!!SUB[sub];   // true solo si la marca vino de un subdominio de cliente
  // Si el nombre no está en caché (tablet que solo abre el POS, páginas públicas), se pide a
  // inv_marcas (lectura pública) y se pinta en todo elemento [data-client-name].
  if(!needCtx){
    var pintar=function(nom){
      window.PREP_CLIENTE=nom; noms[marca]=nom;
      try{localStorage.setItem('prep_cli_nombres',JSON.stringify(noms))}catch(e){}
      var els=document.querySelectorAll('[data-client-name]');for(var i=0;i<els.length;i++)els[i].textContent=nom;
      try{document.dispatchEvent(new CustomEvent('prep:cliente',{detail:{nombre:nom}}))}catch(e){}
    };
    var pedir=function(){
      if(!window.supabase||!window.supabase.createClient)return;
      try{
        window.supabase.createClient('https://jmkvphayyhwzootlybde.supabase.co','sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M',{auth:{persistSession:false,autoRefreshToken:false,storageKey:'prep-tenant-anon'}})
          .from('inv_marcas').select('nombre').eq('id',marca).maybeSingle()
          .then(function(r){var n=r&&r.data&&r.data.nombre;if(n&&n!==window.PREP_CLIENTE)pintar(n);},function(){});
      }catch(e){}
    };
    if(window.PREP_CLIENTE){ document.addEventListener('DOMContentLoaded',function(){pintar(window.PREP_CLIENTE);}); }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',pedir);else pedir();
  }
})();
