#!/usr/bin/env node
/* Genera los MP3 de todos los cursos llamando a la Edge Function generar-audio-curso.
 * Uso:
 *   export AUDIO_GEN_SECRET="tu-secreto"      (el mismo que pusiste en Supabase)
 *   node driver-audio.js                       (todos)
 *   node driver-audio.js cajero pisco          (solo algunos slugs)
 * Requiere Node 18+ (usa fetch nativo). Debe correr donde haya internet (tu Mac). */
const fs = require('fs');
const path = require('path');

const FN = 'https://jmkvphayyhwzootlybde.supabase.co/functions/v1/generar-audio-curso';
const APIKEY = 'sb_publishable_0-znERv1Ok0Dw-Re44eksw_QAOqDc8M';
const SECRET = process.env.AUDIO_GEN_SECRET;

if (!SECRET) {
  console.error('❌ Falta AUDIO_GEN_SECRET.  Corre primero:  export AUDIO_GEN_SECRET="tu-secreto"');
  process.exit(1);
}

const dir = path.join(__dirname, 'docs', 'guiones');
let files = fs.readdirSync(dir).filter(f => f.endsWith('.md'));
const only = process.argv.slice(2);
if (only.length) files = files.filter(f => only.includes(f.replace(/\.md$/, '')));

// quita el markdown (#, >) y deja la prosa
function texto(md) {
  return md.split('\n')
    .filter(l => { const t = l.trim(); return t && !t.startsWith('#') && !t.startsWith('>'); })
    .join(' ').replace(/\s+/g, ' ').trim();
}

(async () => {
  let ok = 0; const fail = [];
  console.log(`Generando ${files.length} audios…\n`);
  for (const f of files) {
    const slug = f.replace(/\.md$/, '');
    const t = texto(fs.readFileSync(path.join(dir, f), 'utf8'));
    if (t.length < 50) { console.log(`· ${slug}: (guion vacío, salto)`); continue; }
    process.stdout.write(`→ ${slug} (${t.length} car)… `);
    try {
      const r = await fetch(FN, {
        method: 'POST',
        headers: { 'apikey': APIKEY, 'x-gen-secret': SECRET, 'content-type': 'application/json' },
        body: JSON.stringify({ slug, texto: t }),
      });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.ok) { console.log(`✅ ${(j.bytes/1024/1024).toFixed(2)} MB`); ok++; }
      else { console.log(`❌ ${r.status} ${JSON.stringify(j).slice(0,200)}`); fail.push(slug); }
    } catch (e) { console.log(`❌ ${e.message}`); fail.push(slug); }
    await new Promise(r => setTimeout(r, 600)); // pausa suave entre cursos
  }
  console.log(`\nListo: ${ok}/${files.length} generados.  Fallidos: ${fail.join(', ') || 'ninguno'}`);
  console.log('Los MP3 quedaron en el bucket "curso-audio" de Supabase.');
})();
