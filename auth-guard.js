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

  // Marca correcta para quien no es super admin. En os.prep.rest, tenant.js cae en
  // Casa Italia (m6) si no hay contexto, y un cliente veía pantallas vacías (RLS no le
  // deja ver m6). Si la marca en pantalla no es una de las suyas, se le lleva a su
  // restaurante en la MISMA pantalla. Corre tras DOMContentLoaded: tenant.js ya fijó PREP_MARCA.
  var SUBOF={m6:'casa-italia',m7:'symposium',m8:'lcds',m9:'la-calor'};
  function checkMarca(c,sess){
    var email=sess&&sess.user&&sess.user.email; if(!email) return;
    function run(){
      var marca=window.PREP_MARCA; if(!marca) return;      // página sin tenant.js
      Promise.all([
        c.from('prep_usuarios').select('rol_sistema,marca_id').ilike('email',email).eq('activo',true).limit(1),
        c.from('prep_usuario_marcas').select('marca_id').ilike('email',email)
      ]).then(function(rs){
        var u=rs[0]&&rs[0].data&&rs[0].data[0]; if(!u||u.rol_sistema==='superadmin') return;
        var mias=((rs[1]&&rs[1].data)||[]).map(function(x){return x.marca_id;});
        if(u.marca_id) mias.unshift(u.marca_id);
        if(!mias.length||mias.indexOf(marca)>=0) return;   // ya está en una de sus marcas
        var dest=u.marca_id||mias[0], sub=SUBOF[dest];
        if(sub&&onPrep) location.replace('https://'+sub+'.prep.rest'+location.pathname);
        else location.replace(location.pathname+'?marca='+dest);
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
    c.auth.getSession().then(function(r){
      var sess=r&&r.data&&r.data.session;
      if(sess){ persist(sess); checkMarca(c,sess); return; } // sesión local OK
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
