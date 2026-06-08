// Contexto de cliente (multi-tenant). Resuelve marca/local desde:
// 1) ?marca=&local= en la URL (super admin navegando desde el portal)
// 2) localStorage prep_ctx (cliente seleccionado, persistente)
// 3) default Casa Italia (m6 / l11)
(function(){
  var q=new URLSearchParams(location.search);
  var ctx={};try{ctx=JSON.parse(localStorage.getItem('prep_ctx')||'{}')}catch(e){}
  var marca=q.get('marca')||ctx.marca||'m6';
  var local=q.get('local')||ctx.local||'l11';
  if(q.get('marca')){ctx.marca=marca;ctx.local=local;try{localStorage.setItem('prep_ctx',JSON.stringify(ctx))}catch(e){}}
  window.PREP_MARCA=marca; window.PREP_LOCAL=local;
})();
