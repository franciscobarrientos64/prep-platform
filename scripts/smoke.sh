#!/usr/bin/env bash
# Smoke test de Prep!: revisa la sintaxis de TODO el JavaScript de los módulos del turno
# y de los .js compartidos. Lo corre el hook pre-push; también se puede correr a mano:
#   bash scripts/smoke.sh
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
command -v node >/dev/null || { echo "smoke: falta node"; exit 1; }
tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
HTML="pos-v2.html kds.html mercado.html bienvenida.html el-libro.html directorio.html hub.html index.html casa-italia.html login.html inventario.html recetas.html portal.html carta.html"
JS="auth-guard.js tenant.js client-name.js role-view.js offline.js prep-sync.js sw.js"
fail=0
for f in $HTML; do
  [ -f "$f" ] || continue
  python3 - "$f" "$tmp" <<'PY' || fail=1
import re,sys,os
f,tmp=sys.argv[1],sys.argv[2]
s=open(f,encoding='utf-8').read()
# solo <script> sin src y sin type de módulo/json/babel
bl=[m.group(2) for m in re.finditer(r'<script(\s[^>]*)?>(.*?)</script>',s,re.S)
    if not re.search(r'\bsrc=',m.group(1) or '') and not re.search(r'type=["\'](module|application/json|text/babel|application/ld\+json|text/template)',m.group(1) or '')]
mods=[m.group(2) for m in re.finditer(r'<script(\s[^>]*type=["\']module["\'][^>]*)>(.*?)</script>',s,re.S)]
base=os.path.join(tmp,os.path.basename(f))
for i,b in enumerate(bl): open(f'{base}.{i}.js','w').write(b)
for i,b in enumerate(mods): open(f'{base}.m{i}.mjs','w').write(b)
PY
done
for j in "$tmp"/*.js "$tmp"/*.mjs $JS; do
  [ -f "$j" ] || continue
  if ! out=$(node --check "$j" 2>&1); then
    echo "✗ $(basename "$j"): $(echo "$out" | grep -m1 -E 'Error' )"; fail=1
  fi
done
[ $fail -eq 0 ] && echo "smoke: OK ($(ls "$tmp" | wc -l | tr -d ' ') bloques + $(echo $JS | wc -w | tr -d ' ') .js)" || { echo "smoke: FALLÓ — no se publica"; exit 1; }
