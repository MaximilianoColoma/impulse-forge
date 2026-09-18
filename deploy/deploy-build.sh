#!/usr/bin/env bash
# Synapse production build + deploy script.
# Intended to run on the production VPS (srv1364901) as the `synapse` user.
# It pulls main from the public GitHub repo, builds the Vite SPA with the
# production runtime values read from /srv/synapse/.env.production (which is
# NEVER committed and holds the real Supabase/Stripe values), then atomically
# publishes to /srv/synapse/current and reloads nginx.
#
# Usage: sudo -u synapse /srv/synapse/deploy-build.sh
#        (or via systemd: systemctl start synapse-build.service)
set -euo pipefail

REPO_DIR=/srv/synapse/repo
CURRENT=/srv/synapse/current
BUILDS_DIR=/srv/synapse/builds
ENV_FILE=/srv/synapse/.env.production
REPO_URL=https://github.com/MaximilianoColoma/impulse-forge.git

log() { echo "[synapse-deploy] $(date -Is) $*"; }

# 1. Environment for the build — fail closed if the real value source is absent.
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE missing. Copy deploy/env.production.example to it and fill real values." >&2
  exit 1
fi
set -a
# shellcheck disable=SC1091
source "$ENV_FILE"
set +a

# 2. Fetch latest main.
mkdir -p "$REPO_DIR" "$BUILDS_DIR"
if [[ -d "$REPO_DIR/.git" ]]; then
  git -C "$REPO_DIR" fetch --quiet origin main
  git -C "$REPO_DIR" checkout --quiet main
  git -C "$REPO_DIR" reset --hard --quiet origin/main
else
  git clone --quiet --branch main --single-branch "$REPO_URL" "$REPO_DIR"
fi

SHA="$(git -C "$REPO_DIR" rev-parse --short HEAD)"
log "building $SHA"

# 3. Install deps and build (VITE_* baked at build time, NOT runtime).
(
  cd "$REPO_DIR"
  npm ci --no-audit --no-fund
  npm run build
)

# 4. Publish built output to a versioned dir atomically.
BUILD_DIR="$BUILDS_DIR/$SHA"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cp -a "$REPO_DIR/dist/." "$BUILD_DIR/"

STAGING="$CURRENT.staging"
ln -sfn "$BUILD_DIR" "$STAGING"
mv -Tf "$STAGING" "$CURRENT"

log "published ${SHA} -> ${CURRENT}"

# 5. Reload nginx (config already in sites-enabled) if it runs as root.
if [[ "$(id -u)" -eq 0 ]]; then
  nginx -t && systemctl reload nginx
  log "nginx reloaded"
else
  log "not root; nginx reload skipped (run as root or reload manually)"
  exit 0
fi
