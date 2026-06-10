// Pone el nombre del cliente activo (window.PREP_MARCA) en los encabezados de módulo
// y, si la marca tiene más de un local, inyecta un selector de sede (multi-sede).
document.addEventListener('DOMContentLoaded',function(){
  try{
    var marca=window.PREP_MARCA||'m6';
    var local=window.PREP_LOCAL;
    var c=window.supabase.createClient('https://jmkvphayyhwzootlybde.supabase.co','sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M');
    // Nombre del cliente
    c.from('inv_marcas').select('nombre').eq('id',marca).maybeSingle().then(function(r){
      var nom=r&&r.data&&r.data.nombre; if(!nom)return;
      document.querySelectorAll('.brand-txt .cli').forEach(function(e){e.textContent=nom;});
    }).catch(function(){});
    // Selector de sede (solo si la marca tiene 2+ locales)
    c.from('inv_locales').select('id,nombre').eq('marca_id',marca).order('id').then(function(r){
      var locs=r&&r.data; if(!locs||locs.length<2)return;
      var anchor=document.querySelector('.brand-txt'); if(!anchor||document.getElementById('prep-local-sel'))return;
      var sel=document.createElement('select');
      sel.id='prep-local-sel';
      sel.title='Cambiar de sede';
      sel.style.cssText='margin-left:10px;padding:5px 9px;border:2px solid #000;border-radius:9px;font-family:var(--font-mono,ui-monospace,monospace);font-size:11px;font-weight:700;background:var(--tertiary,#ffcc00);color:#000;cursor:pointer';
      sel.innerHTML=locs.map(function(l){return '<option value="'+l.id+'"'+(l.id===local?' selected':'')+'>📍 '+l.nombre+'</option>';}).join('');
      sel.onchange=function(){
        var ctx={};try{ctx=JSON.parse(localStorage.getItem('prep_ctx')||'{}')}catch(e){}
        ctx.marca=marca;ctx.local=sel.value;try{localStorage.setItem('prep_ctx',JSON.stringify(ctx))}catch(e){}
        location.reload();
      };
      anchor.parentNode.insertBefore(sel,anchor.nextSibling);
    }).catch(function(){});
  }catch(e){}
});
