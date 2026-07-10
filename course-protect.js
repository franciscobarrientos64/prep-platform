/* Protección de contenido para los cursos de Prep!
 * - Marca de agua dinámica (identidad + fecha) tenue y repetida: disuade y da trazabilidad si se filtra.
 * - Bloquea clic derecho, selección de texto, copiar/cortar, arrastre de imágenes y guardar/ver-fuente.
 * - NO bloquea imprimir (el one-pager lo necesita); la marca de agua también sale al imprimir.
 * Nota honesta: en web no se puede impedir al 100% una captura de pantalla; esto disuade y deja rastro. */
(function(){
  function ident(){
    try{
      for(var i=0;i<localStorage.length;i++){
        var k=localStorage.key(i), v=localStorage.getItem(k)||'';
        var m=v.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i);
        if(m) return m[0];
      }
    }catch(e){}
    try{ if(window.PREP_LOCAL||window.PREP_MARCA) return (window.PREP_MARCA||'')+'/'+(window.PREP_LOCAL||''); }catch(e){}
    return location.hostname.replace('.prep.rest','');
  }
  var who=ident();
  var d=new Date(), stamp=who+'  ·  '+d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
  var svg='<svg xmlns="http://www.w3.org/2000/svg" width="360" height="210">'
    +'<text x="10" y="130" transform="rotate(-28 10 130)" fill="#7c1f3a" fill-opacity="0.055" font-family="monospace" font-size="15">'+stamp+'</text></svg>';
  function addWM(){
    if(!document.body){ return setTimeout(addWM,40); }
    var wm=document.createElement('div'); wm.id='prep-wm';
    wm.style.cssText='position:fixed;inset:0;z-index:9998;pointer-events:none;background-image:url("data:image/svg+xml;utf8,'+encodeURIComponent(svg)+'");background-repeat:repeat';
    document.body.appendChild(wm);
  }
  addWM();

  var st=document.createElement('style');
  st.textContent='body{-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}'
    +'img,svg,#prep-wm{-webkit-user-drag:none;user-drag:none}'
    +'input,textarea,select{-webkit-user-select:text;user-select:text}'
    +'@media print{#prep-wm{display:block!important}}';
  (document.head||document.documentElement).appendChild(st);

  function block(e){ e.preventDefault(); e.stopPropagation(); return false; }
  document.addEventListener('contextmenu',block,{capture:true});
  ['copy','cut','dragstart'].forEach(function(ev){ document.addEventListener(ev,block,{capture:true}); });
  document.addEventListener('keydown',function(e){
    var k=(e.key||'').toLowerCase();
    if((e.ctrlKey||e.metaKey)&&(k==='s'||k==='u')){ block(e); }        // guardar / ver fuente
    if((e.ctrlKey||e.metaKey)&&e.shiftKey&&(k==='s')){ block(e); }      // guardar como
  },{capture:true});
})();
