// Registra el Service Worker, aviso offline + mejoras de accesibilidad globales.
(function(){
  // Accesibilidad global: foco visible por teclado + respeto a prefers-reduced-motion.
  try{
    var a=document.createElement('style');
    a.textContent='a:focus-visible,button:focus-visible,[role="button"]:focus-visible,[tabindex]:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:3px solid #1e5af9;outline-offset:2px;border-radius:6px}@media(prefers-reduced-motion:reduce){*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;transition-duration:.001ms!important;scroll-behavior:auto!important}}';
    (document.head||document.documentElement).appendChild(a);
  }catch(e){}
  if('serviceWorker' in navigator){
    window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){});});
  }
  var bar;
  function ensure(){
    if(bar)return bar;
    bar=document.createElement('div');bar.id='prep-offbar';bar.setAttribute('role','status');bar.setAttribute('aria-live','polite');
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
