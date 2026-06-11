// Pone el nombre del cliente activo (window.PREP_MARCA) en los encabezados de módulo,
// inyecta un selector de RESTAURANTE (si el usuario tiene acceso a varias marcas) y
// un selector de SEDE (si la marca activa tiene más de un local).
document.addEventListener('DOMContentLoaded',function(){
  try{
    var marca=window.PREP_MARCA||'m6';
    var local=window.PREP_LOCAL;
    var c=window.supabase.createClient('https://jmkvphayyhwzootlybde.supabase.co','sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M');
    // marca -> subdominio (cada restaurante vive en su propia URL)
    var SUBOF={m6:'casa-italia',m7:'symposium',m8:'lcds'};
    // marca -> logo del restaurante (icono junto al nombre)
    var LOGOS={m7:'/logos/m7.png',m8:'/logos/m8.png'};

    // Logo del restaurante junto al nombre
    var lg=LOGOS[marca];
    if(lg){document.querySelectorAll('.brand-txt').forEach(function(bt){
      if(bt.parentNode && !bt.parentNode.querySelector('.prep-cli-logo')){
        var im=document.createElement('img');im.className='prep-cli-logo';im.src=lg;im.alt='';
        im.style.cssText='width:30px;height:30px;border-radius:50%;border:2px solid var(--outline,#000);object-fit:cover;flex-shrink:0;background:#fff';
        bt.parentNode.insertBefore(im,bt);
      }
    });}

    // Nombre del cliente
    c.from('inv_marcas').select('nombre').eq('id',marca).maybeSingle().then(function(r){
      var nom=r&&r.data&&r.data.nombre; if(!nom)return;
      document.querySelectorAll('.brand-txt .cli').forEach(function(e){e.textContent=nom;});
      try{var base=(document.title||'').replace(/^[^·]*·\s*/,'');document.title=nom+(base?' · '+base:' · Prep!');}catch(e){}
    }).catch(function(){});

    // Selector de RESTAURANTE (solo si el usuario tiene 2+ marcas asignadas)
    c.auth.getSession().then(function(s){
      var email=s&&s.data&&s.data.session&&s.data.session.user&&s.data.session.user.email;
      if(!email)return;
      c.from('prep_usuario_marcas').select('marca_id').then(function(r){
        var rows=(r&&r.data)||[]; if(rows.length<2)return;
        var ids=rows.map(function(x){return x.marca_id;});
        c.from('inv_marcas').select('id,nombre').in('id',ids).then(function(rm){
          var ms=(rm&&rm.data)||[]; if(ms.length<2)return;
          var anchor=document.querySelector('.brand-txt'); if(!anchor||document.getElementById('prep-marca-sel'))return;
          ms.sort(function(a,b){return (a.nombre||'').localeCompare(b.nombre||'');});
          var sel=document.createElement('select');
          sel.id='prep-marca-sel'; sel.title='Cambiar de restaurante';
          sel.style.cssText='margin-left:10px;padding:5px 9px;border:2px solid #000;border-radius:9px;font-family:var(--font-mono,ui-monospace,monospace);font-size:11px;font-weight:700;background:var(--primary,#1e5af9);color:#fff;cursor:pointer';
          sel.innerHTML=ms.map(function(m){return '<option value="'+m.id+'"'+(m.id===marca?' selected':'')+'>🏢 '+m.nombre+'</option>';}).join('');
          sel.onchange=function(){
            var sub=SUBOF[sel.value]; if(!sub||sel.value===marca)return;
            location.href='https://'+sub+'.prep.rest';   // cada restaurante = su propio subdominio
          };
          anchor.parentNode.insertBefore(sel,anchor.nextSibling);
        }).catch(function(){});
      }).catch(function(){});
    }).catch(function(){});

    // Selector de SEDE (solo si la marca activa tiene 2+ locales)
    c.from('inv_locales').select('id,nombre').eq('marca_id',marca).order('id').then(function(r){
      var locs=r&&r.data; if(!locs||locs.length<2)return;
      var anchor=document.querySelector('.brand-txt'); if(!anchor||document.getElementById('prep-local-sel'))return;
      var sel=document.createElement('select');
      sel.id='prep-local-sel';
      sel.title='Cambiar de sede';
      sel.style.cssText='margin-left:8px;padding:5px 9px;border:2px solid #000;border-radius:9px;font-family:var(--font-mono,ui-monospace,monospace);font-size:11px;font-weight:700;background:var(--tertiary,#ffcc00);color:#000;cursor:pointer';
      sel.innerHTML=locs.map(function(l){return '<option value="'+l.id+'"'+(l.id===local?' selected':'')+'>📍 '+l.nombre+'</option>';}).join('');
      sel.onchange=function(){
        var ctx={};try{ctx=JSON.parse(localStorage.getItem('prep_ctx')||'{}')}catch(e){}
        ctx.marca=marca;ctx.local=sel.value;try{localStorage.setItem('prep_ctx',JSON.stringify(ctx))}catch(e){}
        location.reload();
      };
      var ref=document.getElementById('prep-marca-sel')||anchor;
      ref.parentNode.insertBefore(sel,ref.nextSibling);
    }).catch(function(){});
  }catch(e){}
});
