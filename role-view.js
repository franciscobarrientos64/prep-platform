/* Ver como — vista previa de roles para el super admin.
 *
 * Para qué: Francisco necesita ver la app exactamente como la ve cada rol del cliente
 * (Jefe de Servicio, Cajero, Mozo, Admin del restaurante…) sin cerrar sesión ni pedir
 * la clave de nadie. Este script pone un botón flotante "Ver como", guarda el rol
 * elegido en sessionStorage y hace que TODOS los módulos respeten ese rol.
 *
 * Cómo funciona:
 *  - `window.PREP_VISTA` se resuelve de forma SÍNCRONA desde sessionStorage (el objeto
 *    guardado ya trae rol_sistema + permisos), así los módulos pueden leerlo mientras
 *    pintan, sin esperar a la BD.
 *  - `prepNivel(modulo)` devuelve ninguno|ver|operar|aprobar|admin bajo el rol simulado.
 *  - Si el rol simulado no llega al módulo en pantalla, se tapa la página con un aviso.
 *
 * Nota de seguridad: esto SOLO restringe lo que se ve. No da acceso a nada: la data
 * sigue protegida por RLS con la sesión real. Que alguien fuerce la llave de
 * sessionStorage no le abre nada, solo le esconde cosas a sí mismo.
 */
(function(){
  var KEY='prep_vista';

  /* --- 1. Resolución síncrona: los módulos ya pueden preguntar por la vista --- */
  var vista=null;
  try{ var raw=sessionStorage.getItem(KEY); if(raw) vista=JSON.parse(raw); }catch(e){}
  window.PREP_VISTA=vista;

  var ADMINS=['superadmin','admin_marca','gerente'];
  window.prepEsAdminVista=function(){
    var v=window.PREP_VISTA; if(!v) return null;              // null = sin vista, usa el rol real
    return ADMINS.indexOf(v.rol_sistema)>=0;
  };
  window.prepNivel=function(k){
    var v=window.PREP_VISTA; if(!v) return null;              // null = sin vista
    if(ADMINS.indexOf(v.rol_sistema)>=0) return 'admin';
    var p=v.permisos||{};
    return p[k]||'ninguno';
  };
  /* Formatos de El Libro habilitados para el rol simulado. null = todos. */
  window.prepFormatos=function(){
    var v=window.PREP_VISTA; if(!v) return null;
    if(ADMINS.indexOf(v.rol_sistema)>=0) return null;
    var f=(v.permisos||{}).formatos;
    return (Array.isArray(f)&&f.length)?f:null;
  };

  /* --- 2. Rutas --- */
  var path=(location.pathname.replace(/\/+$/,'')||'/');
  var PUBLICAS=['/login','/carta','/menu','/m','/pedir','/reservar','/tarjeta','/encuesta'];
  for(var i=0;i<PUBLICAS.length;i++){ if(path===PUBLICAS[i]||path.indexOf(PUBLICAS[i]+'/')===0) return; }

  // Ruta -> módulo (para saber si el rol simulado llega a esta pantalla)
  var RUTA_MOD={
    '/pase':'pase','/pos':'pos','/pos-v2':'pos','/pos-legacy':'pos','/pos2':'pos',
    '/kds':'linea','/linea':'linea','/bienvenida':'bienvenida','/reservar':'bienvenida',
    '/mercado':'mercado','/inventario':'mercado','/recetas':'recetas','/rrhh':'rrhh',
    '/delivery':'delivery','/finanzas':'contabilidad','/contabilidad':'contabilidad','/caja-chica':'contabilidad',
    '/vuelto':'vuelto','/el-libro':'libro','/libro':'libro','/directorio':'directorio',
    '/engagement':'engagement','/prediccion':'prediccion',
    '/voz-cliente':'mystery','/voz':'mystery','/mystery':'mystery'
  };
  // Consolas que solo existen para el super admin de Prep: bajo una vista de cliente no se ven.
  var SOLO_SUPER=['/portal','/prep','/admin','/prep-negocio','/presentacion','/comite','/instalacion',
                  '/onboarding','/api','/estrategia','/audit','/importar','/features','/brand',
                  '/sistema','/prd','/analisis','/roadmap','/cuenta'];
  var modActual=RUTA_MOD[path]||(path.indexOf('/cursos/')===0?'libro':null);
  var esConsolaSuper=SOLO_SUPER.indexOf(path)>=0;

  /* --- 3. UI --- */
  function css(){
    if(document.getElementById('prep-vista-css'))return;
    var st=document.createElement('style'); st.id='prep-vista-css';
    st.textContent=
     '#prep-vista-btn{position:fixed;left:14px;bottom:14px;z-index:9990;display:inline-flex;align-items:center;gap:7px;'
    +'padding:9px 14px;border:2px solid #000;border-radius:999px;background:#fff;box-shadow:4px 4px 0 0 #000;cursor:pointer;'
    +'font-family:"IBM Plex Sans",system-ui,sans-serif;font-weight:600;font-size:13px;color:#171c20;line-height:1}'
    +'#prep-vista-btn:active{transform:translate(2px,2px);box-shadow:none}'
    +'#prep-vista-bar{position:fixed;left:0;right:0;bottom:0;z-index:9991;display:flex;align-items:center;gap:10px;flex-wrap:wrap;'
    +'padding:9px 14px;background:#ffcc00;border-top:3px solid #000;'
    +'font-family:"IBM Plex Sans",system-ui,sans-serif;font-size:13px;color:#171c20}'
    +'#prep-vista-bar b{font-weight:700}'
    +'#prep-vista-bar .sp{flex:1}'
    +'#prep-vista-bar button{border:2px solid #000;border-radius:999px;background:#fff;padding:5px 12px;cursor:pointer;'
    +'font-family:inherit;font-weight:600;font-size:12px;box-shadow:3px 3px 0 0 #000}'
    +'#prep-vista-bar button:active{transform:translate(2px,2px);box-shadow:none}'
    +'#prep-vista-bar button.out{background:#171c20;color:#fff}'
    +'#prep-vista-panel{position:fixed;left:14px;bottom:64px;z-index:9992;width:290px;max-width:calc(100vw - 28px);max-height:62vh;overflow:auto;'
    +'background:#fff;border:2px solid #000;border-radius:16px;box-shadow:8px 8px 0 0 #000;padding:12px;'
    +'font-family:"IBM Plex Sans",system-ui,sans-serif}'
    +'#prep-vista-panel h4{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10px;font-weight:700;text-transform:uppercase;'
    +'letter-spacing:.06em;opacity:.6;margin:10px 0 5px}#prep-vista-panel h4:first-child{margin-top:0}'
    +'#prep-vista-panel .op{display:flex;align-items:center;gap:8px;width:100%;text-align:left;border:2px solid #000;border-radius:11px;'
    +'background:#fff;padding:8px 11px;margin-bottom:6px;cursor:pointer;font-family:inherit;font-size:13px;font-weight:600}'
    +'#prep-vista-panel .op:hover{background:#d6e2ff}'
    +'#prep-vista-panel .op.on{background:#1e5af9;color:#fff}'
    +'#prep-vista-panel .op small{display:block;font-weight:400;font-size:10.5px;opacity:.7}'
    +'#prep-vista-block{position:fixed;inset:0;z-index:9989;background:#fcf9f8;display:flex;align-items:center;justify-content:center;padding:24px;'
    +'font-family:"IBM Plex Sans",system-ui,sans-serif;text-align:center}'
    +'#prep-vista-block .bx{max-width:420px}'
    +'#prep-vista-block .t{font-family:"Bagel Fat One",system-ui,sans-serif;font-size:28px;margin-bottom:10px}'
    +'@media print{#prep-vista-btn,#prep-vista-bar,#prep-vista-panel{display:none!important}}';
    (document.head||document.documentElement).appendChild(st);
  }

  function setVista(v){
    try{ if(v) sessionStorage.setItem(KEY,JSON.stringify(v)); else sessionStorage.removeItem(KEY); }catch(e){}
    location.reload();
  }

  function panel(opciones){
    var old=document.getElementById('prep-vista-panel'); if(old){old.remove();return;}
    var p=document.createElement('div'); p.id='prep-vista-panel';
    var v=window.PREP_VISTA;
    var grupos={}; opciones.forEach(function(o){ (grupos[o.grupo]=grupos[o.grupo]||[]).push(o); });
    var html='';
    Object.keys(grupos).forEach(function(g){
      html+='<h4>'+g+'</h4>';
      grupos[g].forEach(function(o,idx){
        var on=(!v&&o.propio)||(v&&v.nombre===o.nombre);
        html+='<button class="op'+(on?' on':'')+'" data-i="'+opciones.indexOf(o)+'">'
             +'<span>'+o.nombre+(o.detalle?'<small>'+o.detalle+'</small>':'')+'</span></button>';
      });
    });
    p.innerHTML=html;
    document.body.appendChild(p);
    p.addEventListener('click',function(e){e.stopPropagation();});
    Array.prototype.forEach.call(p.querySelectorAll('[data-i]'),function(b){
      b.onclick=function(){ var o=opciones[Number(b.dataset.i)]; setVista(o.propio?null:{rol_sistema:o.rol_sistema,rol_id:o.rol_id||null,nombre:o.nombre,permisos:o.permisos||{}}); };
    });
    setTimeout(function(){ document.addEventListener('click',function cl(){ var q=document.getElementById('prep-vista-panel'); if(q)q.remove(); document.removeEventListener('click',cl); }); },0);
  }

  function montar(opciones){
    css();
    var v=window.PREP_VISTA;
    if(v){
      var bar=document.createElement('div'); bar.id='prep-vista-bar';
      bar.innerHTML='<span class="material-symbols-outlined" style="font-size:19px">visibility</span>'
        +'<span>Estás viendo la app como <b>'+v.nombre+'</b> — así la ve el equipo.</span><span class="sp"></span>'
        +'<button id="pv-cambiar">Cambiar rol</button><button class="out" id="pv-salir">Salir de la vista</button>';
      document.body.appendChild(bar);
      document.getElementById('pv-cambiar').onclick=function(e){e.stopPropagation();panel(opciones)};
      document.getElementById('pv-salir').onclick=function(){setVista(null)};
      // que la barra no tape el final de la página
      try{ document.body.style.paddingBottom=(parseInt(getComputedStyle(document.body).paddingBottom||0,10)+56)+'px'; }catch(e){}
    }else{
      var b=document.createElement('button'); b.id='prep-vista-btn';
      b.innerHTML='<span class="material-symbols-outlined" style="font-size:18px">visibility</span> Ver como';
      document.body.appendChild(b);
      b.onclick=function(e){e.stopPropagation();panel(opciones)};
    }
  }

  function bloquear(titulo,texto){
    css();
    var d=document.createElement('div'); d.id='prep-vista-block';
    d.innerHTML='<div class="bx"><div class="t">'+titulo+'</div><p style="font-size:15px;opacity:.85">'+texto+'</p>'
      +'<p style="margin-top:18px"><a href="/" style="display:inline-block;padding:9px 18px;border:2px solid #000;border-radius:999px;background:#1e5af9;color:#fff;text-decoration:none;font-weight:600">Ir al inicio</a></p></div>';
    document.body.appendChild(d);
  }

  /* --- 4. Carga: quién soy y qué roles hay --- */
  function init(){
    if(!window.supabase) return;
    var sb=window.supabase.createClient('https://jmkvphayyhwzootlybde.supabase.co','sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M');
    sb.auth.getSession().then(function(r){
      var s=r&&r.data&&r.data.session; if(!s||!s.user)return;
      var correo=(s.user.email||'').toLowerCase();
      sb.from('prep_usuarios').select('rol_sistema,nombre').ilike('email',correo).limit(1).then(function(ru){
        var yo=(ru&&ru.data&&ru.data[0])||null;
        if(!yo||yo.rol_sistema!=='superadmin'){
          if(window.PREP_VISTA){ try{sessionStorage.removeItem(KEY)}catch(e){} }
          return;
        }
        // El botón se monta YA. Si la consulta de roles falla o tarda, igual existe.
        var opciones=[
          {grupo:'Tu sesión',nombre:'Yo · Super Admin',propio:true,detalle:yo.nombre||correo},
          {grupo:'Gerencia del restaurante',nombre:'Admin del restaurante',rol_sistema:'admin_marca',detalle:'Ve todo lo del cliente'},
          {grupo:'Gerencia del restaurante',nombre:'Gerente',rol_sistema:'gerente',detalle:'Ve todo lo del cliente'},
          {grupo:'Roles del equipo',nombre:'Operativo sin rol',rol_sistema:'operativo',permisos:{},detalle:'No ve ningún módulo'}
        ];
        montar(opciones);

        var marca=window.PREP_MARCA||'m6';
        // Roles del cliente: se agregan a la lista cuando llegan (la lista se lee al abrir el panel).
        sb.from('prep_roles').select('*').eq('marca_id',marca).order('nombre').then(function(rr){
          var roles=(rr&&rr.data)||[];
          roles.forEach(function(rl){
            var ks=Object.keys(rl.permisos||{}).filter(function(k){return k!=='formatos'&&k!=='revisar_examenes'});
            opciones.push({grupo:'Roles del equipo',nombre:rl.nombre,rol_sistema:'operativo',rol_id:rl.id,
                           permisos:rl.permisos||{},
                           detalle:ks.length?(ks.length+' módulo'+(ks.length>1?'s':'')):'sin módulos asignados'});
          });
        }).catch(function(){});

        // Bloqueo de pantallas a las que el rol simulado no llega
        var v=window.PREP_VISTA; if(!v) return;
        if(esConsolaSuper){
          bloquear('Solo para Prep','Esta consola es del super admin de Prep. Con el rol <b>'+v.nombre+'</b> no existe: el cliente ni siquiera la ve enlazada.');
          return;
        }
        if(modActual){
          if(window.prepNivel(modActual)==='ninguno'){
            bloquear('Sin acceso con este rol','El rol <b>'+v.nombre+'</b> no tiene permiso sobre este módulo. Puedes ajustarlo en <b>Usuarios y permisos</b>.');
            return;
          }
          sb.from('prep_marca_modulos').select('modulo,activo').eq('marca_id',marca).then(function(rm){
            var mm=(rm&&rm.data)||[];
            if(mm.length&&!mm.some(function(x){return x.modulo===modActual&&x.activo}))
              bloquear('No incluido en el plan','Este módulo no está en el paquete contratado por el cliente, así que no lo ve nadie de su equipo.');
          }).catch(function(){});
        }
      }).catch(function(){});
    }).catch(function(){});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
