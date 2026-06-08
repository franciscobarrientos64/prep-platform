// Pone el nombre del cliente activo (window.PREP_MARCA) en los encabezados de módulo.
document.addEventListener('DOMContentLoaded',function(){
  try{
    var marca=window.PREP_MARCA||'m6';
    var c=window.supabase.createClient('https://jmkvphayyhwzootlybde.supabase.co','sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M');
    c.from('inv_marcas').select('nombre').eq('id',marca).maybeSingle().then(function(r){
      var nom=r&&r.data&&r.data.nombre; if(!nom)return;
      document.querySelectorAll('.brand-txt .cli').forEach(function(e){e.textContent=nom;});
    }).catch(function(){});
  }catch(e){}
});
