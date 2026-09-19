#!/usr/bin/env bash
# Synapse production deploy on the owner's VPS behind the Cloudflare tunnel.
#
# Run on srv1364901 (as root or via sudo) from /opt/synapse.
# 1) pulls the repo to /opt/synapse/repo
# 2) builds the Docker image with build-time VITE_* values from /opt/synapse/.env
# 3) (re)creates the synapse-prod container in the shared buzz-prod_buzz-net
# 4) prints the cloudflared ingress snippet to add /opt/buzz/cloudflared-config.yml
#    and how to reload the tunnel (touched by the operator/cloudflare session).
#
# The tunnel reload itself is done after the operator adds the ingress to the
# productive /opt/buzz/cloudflared-config.yml (which also serves buzz + pair).
set -euo pipefail

REPO_URL=https://github.com/MaximilianoColoma/impulse-forge.git
ROOT=/opt/synapse
REPO="$ROOT/repo"
ENV_FILE="$ROOT/.env"
TUNNEL_CONFIG=/opt/buzz/cloudflared-config.yml

log() { echo "[synapse-deploy] $(date -Is) $*"; }

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE missing. Create it from deploy/env.production.example with real values." >&2
  exit 1
fi

mkdir -p "$REPO"
if [[ -d "$REPO/.git" ]]; then
  git -C "$REPO" fetch --quiet origin main
  git -C "$REPO" checkout --quiet main
  git -C "$REPO" reset --hard --quiet origin/main
else
  git clone --quiet --branch main --single-branch "$REPO_URL" "$REPO"
fi
SHA="$(git -C "$REPO" rev-parse --short HEAD)"
log "repo pinned to ${SHA}"

log "building image with /opt/synapse/.env values..."
set -a; # shellcheck disable=SC1091
source "$ENV_FILE"; set +a

docker compose \
  -f /opt/synapse/repo/deploy/docker/compose.yml \
  --env-file "$ENV_FILE" \
  up -d --build --force-recreate synapse

log "container up. Now add the tunnel ingress:"
cat <<'SNIPPET'
#
# Add to /opt/buzz/cloudflared-config.yml under ingress (before the catch-all
# "- service: http_status:404"):
#
#   - hostname: synapse.billionex.io
#     service: http://synapse:8080
#     originRequest:
#       connectTimeout: 10s
#
# Then reload the tunnel (this is a productive config; reload after the operator
# adds the entry). Cloudflare DNS already points synapse.billionex.io at the
# tunnel. Verify: curl -sI https://synapse.billionex.io/  -> 200
SNIPPET
log "done."
