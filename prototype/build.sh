#!/bin/sh
# Builds ../letstransport-ops-prototype.html (single self-contained file)
cd "$(dirname "$0")" && npx vite build --config vite.config.ts >/dev/null && python3 - <<'PY'
import re,glob
html=open("dist/index.html").read()
css=open(glob.glob("dist/assets/*.css")[0]).read()
js=open(glob.glob("dist/assets/*.js")[0]).read().replace("</script","<\\/script")
html=re.sub(r'<link rel="stylesheet"[^>]*>',lambda m:"<style>"+css+"</style>",html)
html=re.sub(r'<script type="module"[^>]*></script>',"",html)
html=html.replace("</body>",'<script type="module">'+js+"</script></body>")
open("../letstransport-ops-prototype.html","w").write(html)
PY
