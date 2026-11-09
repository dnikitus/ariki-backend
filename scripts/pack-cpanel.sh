#!/usr/bin/env bash
# Builds a slim Linux bundle for cPanel "Setup Node.js App" (no npm install on the server).
#
#   scripts/pack-cpanel.sh [node-version]     # default: 20, must match the cPanel app
#
# Output (in deploy/):
#   app.zip           -> extract into the app root (e.g. ~/ariki-backend)
#   node_modules.zip  -> extract into ~/nodevenv/<app-root>/<node-version>/lib/
set -euo pipefail

NODE_VERSION="${1:-20}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/deploy"

rm -rf "$OUT" && mkdir -p "$OUT"

docker run --rm --platform linux/amd64 \
  -v "$ROOT":/src:ro -v "$OUT":/out -w /work "node:$NODE_VERSION" sh -ec '
    cp -r /src/src /src/config /src/database /src/public /src/types \
      /src/package.json /src/package-lock.json /src/tsconfig.json /src/server.js /src/favicon.png .

    npm ci --no-audit --no-fund
    NODE_ENV=production npm run build
    npm prune --omit=dev --no-audit --no-fund

    cd node_modules
    # Build-time only: compilers, bundlers, type definitions, and the SQLite driver (Postgres is used)
    rm -rf better-sqlite3 typescript vite @vitejs @swc esbuild @esbuild @types fork-ts-checker-webpack-plugin
    # cPanel servers are glibc, not musl (Alpine)
    rm -rf @img/*musl*
    # Admin panel browser code; the panel is already prebuilt into dist/build
    find @strapi -maxdepth 3 -type d -path "*/dist/admin" -prune -exec rm -rf {} +
    rm -rf hls.js @formatjs/intl-displaynames core-js-pure @shikijs @codemirror
    # Source maps, typings, docs, tests
    find . -type f \( -name "*.map" -o -name "*.d.ts" -o -name "*.d.mts" -o -name "*.d.cts" -o -iname "*.md" -o -name "*.markdown" \) -delete
    find . -type d \( -name test -o -name tests -o -name __tests__ -o -name docs -o -name example -o -name examples -o -name .github \) -prune -exec rm -rf {} +
    cd ..

    mkdir -p /out/app
    cp -r dist public database server.js package.json package-lock.json tsconfig.json favicon.png /out/app/
    mv node_modules /out/node_modules
  '

cd "$OUT/app" && zip -qr9 ../app.zip . -x "*.DS_Store"
cd "$OUT" && zip -qr9 node_modules.zip node_modules -x "*.DS_Store"
rm -rf "$OUT/app" "$OUT/node_modules"

ls -lh "$OUT"/*.zip
