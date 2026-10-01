// Guard de sesión: protege toda la app con login, excepto superficies públicas.
// SSO entre subdominios *.prep.rest: la sesión se comparte vía cookie de dominio,
// para saltar entre restaurantes (un subdominio por cliente) sin re-login.
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

  // Contexto correcto para cada usuario. tenant.js ya no asume ningún restaurante: si no hay
  // contexto (PREP_NEEDCTX) o la marca en pantalla no es una de las del usuario, se le lleva
  // a SU restaurante y sede en la MISMA pantalla. El super admin sin contexto va a /portal.
  // Corre tras DOMContentLoaded: tenant.js ya fijó PREP_MARCA.
  var SIN='__sin_contexto__';
  function irA(c,marca,local){
    function go(lc){
      // Freno anti-bucle: máximo 3 redirecciones de contexto por pestaña.
      var n=0;try{n=+(sessionStorage.getItem('prep_ctx_redir')||0);sessionStorage.setItem('prep_ctx_redir',String(n+1));}catch(e){}
      if(n>=3) return;
      try{localStorage.setItem('prep_ctx',JSON.stringify({marca:marca,local:lc||''}));}catch(e){}
      var qs='?marca='+encodeURIComponent(marca)+(lc?'&local='+encodeURIComponent(lc):'');
      // En el subdominio de OTRO cliente el subdominio manda sobre ?marca: se pasa a os.prep.rest.
      if(window.PREP_BYSUB&&onPrep){ location.replace('https://os.prep.rest'+location.pathname+qs+location.hash); return; }
      location.replace(location.pathname+qs+location.hash);
    }
    if(local) return go(local);
    c.from('inv_locales').select('id').eq('marca_id',marca).order('orden',{nullsFirst:false}).order('id').limit(1)
      .then(function(r){go(r&&r.data&&r.data[0]&&r.data[0].id);}).catch(function(){go('');});
  }
  function checkMarca(c,sess){
    var email=sess&&sess.user&&sess.user.email; if(!email) return;
    function run(){
      var marca=window.PREP_MARCA; if(!marca) return;      // página sin tenant.js
      var sinCtx=!!window.PREP_NEEDCTX||marca===SIN;
      Promise.all([
        c.from('prep_usuarios').select('rol_sistema,marca_id,local_id').ilike('email',email).eq('activo',true).limit(1),
        c.from('prep_usuario_marcas').select('marca_id').ilike('email',email)
      ]).then(function(rs){
        var u=rs[0]&&rs[0].data&&rs[0].data[0]; if(!u) return;
        if(u.rol_sistema==='superadmin'){
          if(!sinCtx) return;
          if(marca!==SIN) return irA(c,marca,null);            // marca elegida, falta la sede
          if(location.pathname.replace(/\/+$/,'')!=='/portal') location.replace('/portal');
          return;
        }
        var mias=((rs[1]&&rs[1].data)||[]).map(function(x){return x.marca_id;});
        if(u.marca_id) mias.unshift(u.marca_id);
        if(!mias.length) return;
        if(!sinCtx&&mias.indexOf(marca)>=0){ try{sessionStorage.removeItem('prep_ctx_redir');}catch(e){} return; } // ya está en una de sus marcas
        if(sinCtx&&marca!==SIN&&mias.indexOf(marca)>=0) return irA(c,marca,null);
        var dest=u.marca_id||mias[0];
        irA(c,dest,dest===u.marca_id?u.local_id:null);
      }).catch(function(){});
    }
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',run); else run();
  }

  try{
    var c=window.supabase.createClient('https://jmkvphayyhwzootlybde.supabase.co','sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M');
    // Mantener la cookie SSO al día (login, refresh de token, logout)
    c.auth.onAuthStateChange(function(ev,sess){
      if(ev==='SIGNED_OUT'){ clearCookie(SSO); }
      else if(sess){ persist(sess); }
    });
    // Sesión guardada en el equipo (aunque el token haya vencido). Sin internet NO se echa a nadie
    // al login: el POS y la Línea deben seguir operando el turno con la sesión local.
    function storedSession(){ try{ var raw=localStorage.getItem('sb-jmkvphayyhwzootlybde-auth-token'); var s=raw&&JSON.parse(raw); return !!(s&&(s.refresh_token||(s.currentSession&&s.currentSession.refresh_token))); }catch(e){ return false; } }
    function netErr(e){ if(!e) return false; var m=((e.message||'')+'')+' '+(e.name||''); return e.status===0||/fetch|network|timeout|abort|offline|retryable|load failed/i.test(m); }
    function seguirOffline(){ window.addEventListener('online', function(){ c.auth.getSession().then(function(r2){ if(r2&&r2.data&&r2.data.session) persist(r2.data.session); }); }, {once:true}); }
    c.auth.getSession().then(function(r){
      var sess=r&&r.data&&r.data.session;
      if(sess){ persist(sess); checkMarca(c,sess); return; } // sesión local OK
      if((!navigator.onLine||netErr(r&&r.error)) && storedSession()){ seguirOffline(); return; } // sin red: seguir con la sesión local
      if(!navigator.onLine){ window.addEventListener('online', function(){ location.reload(); }, {once:true}); return; } // sin red y sin sesión: esperar, no mandar a un login que no carga
      // Sin sesión local: intentar restaurar desde la cookie compartida (.prep.rest)
      var raw=readCookie(SSO), tok=null;
      if(raw){ try{tok=JSON.parse(raw)}catch(e){} }
      if(tok&&tok.a&&tok.r){
        if(sessionStorage.getItem('prep_sso_tried')){ clearCookie(SSO); toLogin(); return; } // evita bucle si la cookie ya no sirve
        sessionStorage.setItem('prep_sso_tried','1');
        c.auth.setSession({access_token:tok.a,refresh_token:tok.r}).then(function(res){
          if(res&&res.data&&res.data.session){ persist(res.data.session); location.reload(); }
          else { clearCookie(SSO); toLogin(); }
        }).catch(function(e){ if(netErr(e)||!navigator.onLine){ sessionStorage.removeItem('prep_sso_tried'); seguirOffline(); return; } clearCookie(SSO); toLogin(); });
      } else {
        toLogin();
      }
    }).catch(function(){});
  }catch(e){}
})();
