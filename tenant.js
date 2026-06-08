// Contexto de cliente (multi-tenant). Resuelve marca/local en este orden:
// 1) Subdominio de cliente (ej. casa-italia.prep.rest -> Casa Italia)
// 2) ?marca=&local= en la URL (super admin navegando desde el portal en os.prep.rest)
// 3) localStorage prep_ctx (último cliente abierto, persistente)
// 4) default Casa Italia (m6 / l11)
(function(){
  // Mapa de subdominios de cliente -> {marca, local}. Agregar aquí cada cliente con su URL.
  var SUB={
    'casa-italia':{marca:'m6',local:'l11'}
  };
  var host=(location.hostname||'').toLowerCase();
  var sub=host.split('.')[0];
  var q=new URLSearchParams(location.search);
  var ctx={};try{ctx=JSON.parse(localStorage.getItem('prep_ctx')||'{}')}catch(e){}
  var marca, local;
  if(SUB[sub]){                      // 1) subdominio de cliente manda
    marca=SUB[sub].marca; local=SUB[sub].local;
  }else{                             // os.prep.rest / app / etc. -> portal o contexto elegido
    marca=q.get('marca')||ctx.marca||'m6';
    local=q.get('local')||ctx.local||'l11';
    if(q.get('marca')){ctx.marca=marca;ctx.local=local;try{localStorage.setItem('prep_ctx',JSON.stringify(ctx))}catch(e){}}
  }
  window.PREP_MARCA=marca; window.PREP_LOCAL=local; window.PREP_SUBHOST=sub;
})();
