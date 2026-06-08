// Registra el Service Worker y muestra un aviso cuando no hay conexión.
(function(){
  if('serviceWorker' in navigator){
    window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});
  }
  var bar;
  function ensure(){
    if(bar)return bar;
    bar=document.createElement('div');bar.id='prep-offbar';
    bar.style.cssText='position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#ff3b30;color:#fff;font:600 13px/1.3 system-ui,sans-serif;padding:9px 14px;text-align:center;box-shadow:0 -2px 0 #000;display:none';
    bar.textContent='⚠ Sin conexión — la app sigue funcionando con datos guardados.';
    (document.body||document.documentElement).appendChild(bar);
    return bar;
  }
  function upd(){var b=ensure();b.style.display=navigator.onLine?'none':'block';}
  window.addEventListener('online',upd);
  window.addEventListener('offline',upd);
  if(document.readyState!=='loading')upd();else document.addEventListener('DOMContentLoaded',upd);
})();
