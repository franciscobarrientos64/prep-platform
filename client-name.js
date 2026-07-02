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

    // --- Selectores con la estética del sitio: pill brutalista + Material Symbols (sin emojis) ---
    if(!document.getElementById('prep-sel-css')){
      var st=document.createElement('style');st.id='prep-sel-css';
      st.textContent='.prep-selpill{position:relative;display:inline-flex;align-items:center;gap:5px;margin-left:8px;padding:6px 10px;border:2px solid var(--outline,#000);border-radius:999px;background:var(--surface,#fff);box-shadow:3px 3px 0 0 var(--outline,#000);cursor:pointer;font-family:var(--font-mono,ui-monospace,monospace);font-weight:700;font-size:12px;color:var(--ink,#171c20);line-height:1;white-space:nowrap;transition:transform .1s,box-shadow .1s}'
      +'.prep-selpill:active{transform:translate(2px,2px);box-shadow:none}'
      +'.prep-selpill .lead{font-size:17px;color:var(--primary,#1e5af9)}'
      +'.prep-selpill .caret{font-size:15px;opacity:.6}'
      +'.prep-selpill .lbl{pointer-events:none}'
      +'.prep-selpill select{position:absolute;inset:0;width:100%;height:100%;opacity:0;border:0;margin:0;padding:0;cursor:pointer;font:inherit}';
      document.head.appendChild(st);
    }
    function makePill(sel,leadIcon){
      var w=document.createElement('span');w.className='prep-selpill';
      var lead=document.createElement('span');lead.className='material-symbols-outlined lead';lead.textContent=leadIcon;
      var lab=document.createElement('span');lab.className='lbl';var o0=sel.options[sel.selectedIndex];lab.textContent=o0?o0.textContent:'';
      var car=document.createElement('span');car.className='material-symbols-outlined caret';car.textContent='unfold_more';
      sel.addEventListener('change',function(){var x=sel.options[sel.selectedIndex];lab.textContent=x?x.textContent:'';});
      w.appendChild(lead);w.appendChild(lab);w.appendChild(car);w.appendChild(sel);
      return w;
    }

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
      // Filtrar por el email del usuario: el selector muestra SOLO las marcas
      // asignadas a ti. Sin esto, el super admin (RLS pum_self_read devuelve todo)
      // veria las marcas de otros clientes en cualquier subdominio.
      c.from('prep_usuario_marcas').select('marca_id').eq('email',email).then(function(r){
        var rows=(r&&r.data)||[]; if(rows.length<2)return;
        var ids=rows.map(function(x){return x.marca_id;});
        c.from('inv_marcas').select('id,nombre').in('id',ids).then(function(rm){
          var ms=(rm&&rm.data)||[]; if(ms.length<2)return;
          var anchor=document.querySelector('.brand-txt'); if(!anchor||document.getElementById('prep-marca-sel'))return;
          ms.sort(function(a,b){return (a.nombre||'').localeCompare(b.nombre||'');});
          var sel=document.createElement('select');
          sel.id='prep-marca-sel'; sel.title='Cambiar de restaurante';
          sel.innerHTML=ms.map(function(m){return '<option value="'+m.id+'"'+(m.id===marca?' selected':'')+'>'+m.nombre+'</option>';}).join('');
          sel.onchange=function(){
            var sub=SUBOF[sel.value]; if(!sub||sel.value===marca)return;
            location.href='https://'+sub+'.prep.rest';   // cada restaurante = su propio subdominio
          };
          anchor.parentNode.insertBefore(makePill(sel,'storefront'),anchor.nextSibling);
        }).catch(function(){});
      }).catch(function(){});
    }).catch(function(){});

    // Selector de SEDE (solo si la marca activa tiene 2+ locales)
    c.from('inv_locales').select('id,nombre').eq('marca_id',marca).order('orden',{nullsFirst:false}).order('id').then(function(r){
      var locs=r&&r.data; if(!locs||locs.length<2)return;
      var anchor=document.querySelector('.brand-txt'); if(!anchor||document.getElementById('prep-local-sel'))return;
      var sel=document.createElement('select');
      sel.id='prep-local-sel';
      sel.title='Cambiar de sede';
      sel.innerHTML=locs.map(function(l){return '<option value="'+l.id+'"'+(l.id===local?' selected':'')+'>'+l.nombre+'</option>';}).join('');
      sel.onchange=function(){
        var ctx={};try{ctx=JSON.parse(localStorage.getItem('prep_ctx')||'{}')}catch(e){}
        ctx.marca=marca;ctx.local=sel.value;try{localStorage.setItem('prep_ctx',JSON.stringify(ctx))}catch(e){}
        location.reload();
      };
      var mp=document.getElementById('prep-marca-sel');
      var ref=mp?(mp.closest('.prep-selpill')||mp):anchor;
      ref.parentNode.insertBefore(makePill(sel,'location_on'),ref.nextSibling);
    }).catch(function(){});
  }catch(e){}
});
