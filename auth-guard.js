// Guard de sesión: protege toda la app con login, excepto superficies públicas.
(function(){
  var path=(location.pathname.replace(/\/+$/,'')||'/');
  var PUBLIC=['/login','/carta','/menu','/m','/pedir','/reservar','/tarjeta'];
  for(var i=0;i<PUBLIC.length;i++){ if(path===PUBLIC[i]||path.indexOf(PUBLIC[i]+'/')===0) return; }
  if(location.search.indexOf('widget=1')>=0) return; // widget público de reservas
  if(!window.supabase){ return; }
  try{
    var c=window.supabase.createClient('https://jmkvphayyhwzootlybde.supabase.co','sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M');
    c.auth.getSession().then(function(r){
      if(!r||!r.data||!r.data.session){ location.replace('/login?next='+encodeURIComponent(path)); }
    }).catch(function(){});
  }catch(e){}
})();
