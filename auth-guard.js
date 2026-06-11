// Guard de sesión: protege toda la app con login, excepto superficies públicas.
// SSO entre subdominios *.prep.rest: la sesión se comparte vía cookie de dominio,
// para saltar entre restaurantes (symposium / lcds / casa-italia) sin re-login.
(function(){
  var path=(location.pathname.replace(/\/+$/,'')||'/');
  var PUBLIC=['/login','/carta','/menu','/m','/pedir','/reservar','/tarjeta'];
  for(var i=0;i<PUBLIC.length;i++){ if(path===PUBLIC[i]||path.indexOf(PUBLIC[i]+'/')===0) return; }
  if(location.search.indexOf('widget=1')>=0) return; // widget público de reservas
  if(!window.supabase){ return; }

  var SSO='prep_sso';
  var onPrep=/(^|\.)prep\.rest$/.test(location.hostname);
  function readCookie(n){var m=document.cookie.match('(^|; )'+n+'=([^;]*)');return m?decodeURIComponent(m[2]):null;}
  function writeCookie(n,v){ if(!onPrep)return; document.cookie=n+'='+encodeURIComponent(v)+'; domain=.prep.rest; path=/; max-age=2592000; secure; samesite=lax';}
  function clearCookie(n){ if(!onPrep)return; document.cookie=n+'=; domain=.prep.rest; path=/; max-age=0; secure; samesite=lax';}
  function persist(s){ if(s&&s.access_token&&s.refresh_token) writeCookie(SSO,JSON.stringify({a:s.access_token,r:s.refresh_token})); }
  function toLogin(){ location.replace('/login?next='+encodeURIComponent(path)); }

  try{
    var c=window.supabase.createClient('https://jmkvphayyhwzootlybde.supabase.co','sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M');
    // Mantener la cookie SSO al día (login, refresh de token, logout)
    c.auth.onAuthStateChange(function(ev,sess){
      if(ev==='SIGNED_OUT'){ clearCookie(SSO); }
      else if(sess){ persist(sess); }
    });
    c.auth.getSession().then(function(r){
      var sess=r&&r.data&&r.data.session;
      if(sess){ persist(sess); return; }                 // sesión local OK
      // Sin sesión local: intentar restaurar desde la cookie compartida (.prep.rest)
      var raw=readCookie(SSO), tok=null;
      if(raw){ try{tok=JSON.parse(raw)}catch(e){} }
      if(tok&&tok.a&&tok.r){
        if(sessionStorage.getItem('prep_sso_tried')){ clearCookie(SSO); toLogin(); return; } // evita bucle si la cookie ya no sirve
        sessionStorage.setItem('prep_sso_tried','1');
        c.auth.setSession({access_token:tok.a,refresh_token:tok.r}).then(function(res){
          if(res&&res.data&&res.data.session){ persist(res.data.session); location.reload(); }
          else { clearCookie(SSO); toLogin(); }
        }).catch(function(){ clearCookie(SSO); toLogin(); });
      } else {
        toLogin();
      }
    }).catch(function(){});
  }catch(e){}
})();
