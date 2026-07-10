/* Reproductor de audiolibro para los cursos de Prep!
 * - Si la página define window.COURSE_AUDIO = '/audio/xxx.mp3' (voz ElevenLabs), reproduce ese MP3.
 * - Si no, usa la voz del navegador (Web Speech API) para leer el contenido en español.
 * Botón flotante abajo a la derecha. Se oculta al imprimir. */
(function(){
  var MP3 = window.COURSE_AUDIO || null;
  var hasTTS = ('speechSynthesis' in window);
  if(!MP3 && !hasTTS) return;

  var css = '#ca{position:fixed;right:16px;bottom:16px;z-index:400;font-family:"IBM Plex Sans",system-ui,sans-serif}'
    + '#ca .pill{display:inline-flex;align-items:center;gap:8px;background:#7c1f3a;color:#fff;border:2px solid #000;border-radius:999px;box-shadow:4px 4px 0 0 #000;padding:9px 14px;cursor:pointer;font-weight:600;font-size:14px;-webkit-user-select:none;user-select:none}'
    + '#ca .pill:active{transform:translate(2px,2px);box-shadow:none}'
    + '#ca .ic{font-size:18px;line-height:1}'
    + '#ca .prog{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:11px;opacity:.9;display:none}'
    + '#ca .stop{margin-left:2px;background:#fff;color:#7c1f3a;border:2px solid #000;border-radius:50%;width:22px;height:22px;display:none;align-items:center;justify-content:center;cursor:pointer;font-size:12px;font-weight:800}'
    + '#ca audio{display:block;margin-top:8px;width:240px;max-width:70vw}'
    + '@media print{#ca{display:none!important}}';
  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  var box=document.createElement('div'); box.id='ca'; document.body.appendChild(box);

  /* --- Modo MP3 (voz propia vía ElevenLabs) --- */
  if(MP3){
    box.innerHTML='<div class="pill"><span class="ic">🎧</span> Audiolibro</div><audio controls preload="none" src="'+MP3+'"></audio>';
    var pillA=box.querySelector('.pill'), au=box.querySelector('audio');
    pillA.addEventListener('click',function(){ if(au.paused){au.play();}else{au.pause();} });
    return;
  }

  /* --- Modo voz del navegador (TTS) --- */
  box.innerHTML='<div class="pill" role="button" aria-label="Escuchar el curso"><span class="ic">🎧</span><span class="lbl">Escuchar</span><span class="prog"></span><span class="stop" title="Detener">✕</span></div>';
  var pill=box.querySelector('.pill'), lbl=box.querySelector('.lbl'), prog=box.querySelector('.prog'), stop=box.querySelector('.stop'), ic=box.querySelector('.ic');
  var chunks=[], idx=0, state='idle', voice=null;

  function gather(){
    var wrap=document.querySelector('.wrap'); if(!wrap) return [];
    var nodes=wrap.querySelectorAll('h1,h2,h3,h4,p,li,.d,.s,.reg,.q,.gterm b,.gterm span');
    var seen={}, out=[];
    Array.prototype.forEach.call(nodes,function(n){
      if(n.closest && n.closest('.top')) return;
      var t=(n.textContent||'').replace(/\s+/g,' ').trim();
      if(t.length<2) return; if(seen[t]) return; seen[t]=1; out.push(t);
    });
    return out;
  }
  function chunk(lines){
    var out=[];
    lines.forEach(function(line){
      if(line.length<=220){out.push(line);return;}
      var parts=line.split(/([.!?])\s+/), buf='';
      // reconstruye respetando la puntuación
      var sentences=[]; for(var i=0;i<parts.length;i+=2){ var s=parts[i]+(parts[i+1]||''); if(s.trim())sentences.push(s.trim()); }
      sentences.forEach(function(p){ if((buf+' '+p).length>220){ if(buf)out.push(buf.trim()); buf=p; } else { buf=buf?buf+' '+p:p; } });
      if(buf.trim())out.push(buf.trim());
    });
    return out;
  }
  function pickVoice(){
    var vs=(speechSynthesis.getVoices()||[]);
    return vs.filter(function(v){return /es[-_]?(PE|419|MX|US|ES)/i.test(v.lang)})[0]
        || vs.filter(function(v){return /^es/i.test(v.lang)})[0] || null;
  }
  function setUI(){
    if(state==='playing'){ ic.textContent='⏸'; lbl.textContent='Leyendo'; prog.style.display='inline'; stop.style.display='inline-flex'; }
    else if(state==='paused'){ ic.textContent='▶'; lbl.textContent='Pausado'; prog.style.display='inline'; stop.style.display='inline-flex'; }
    else { ic.textContent='🎧'; lbl.textContent='Escuchar'; prog.style.display='none'; stop.style.display='none'; }
  }
  function speakNext(){
    if(state!=='playing') return;
    if(idx>=chunks.length){ state='idle'; idx=0; setUI(); return; }
    prog.textContent=(idx+1)+'/'+chunks.length;
    var u=new SpeechSynthesisUtterance(chunks[idx]);
    u.lang='es-ES'; if(voice)u.voice=voice; u.rate=1; u.pitch=1;
    u.onend=function(){ if(state==='playing'){ idx++; speakNext(); } };
    u.onerror=function(){ if(state==='playing'){ idx++; speakNext(); } };
    speechSynthesis.speak(u);
  }
  function start(){ chunks=chunk(gather()); idx=0; voice=pickVoice(); state='playing'; setUI(); speechSynthesis.cancel(); speakNext(); }

  pill.addEventListener('click',function(e){
    if(e.target===stop){ state='idle'; speechSynthesis.cancel(); idx=0; setUI(); return; }
    if(state==='idle'){ start(); }
    else if(state==='playing'){ speechSynthesis.pause(); state='paused'; setUI(); }
    else if(state==='paused'){ speechSynthesis.resume(); state='playing'; setUI(); }
  });
  if(typeof speechSynthesis.onvoiceschanged!=='undefined'){ speechSynthesis.onvoiceschanged=function(){ if(!voice)voice=pickVoice(); }; }
  window.addEventListener('beforeunload',function(){ try{speechSynthesis.cancel();}catch(e){} });
})();
