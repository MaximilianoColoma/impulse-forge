# Synapse — Production Deployment (self-hosted, Cloudflare tunnel)

Synapse runs as a public SaaS on the owner's own VPS (`srv1364901`, Tailscale
`vps`), served as a static Docker container reached through the **existing
Cloudflare tunnel** — the same one that already serves `buzz.billionex.io`.
This means **no host port 80/443 binding** (those belong to the mailcow
container on this host); external HTTPS is terminated by Cloudflare.

## Architecture

```
internet -> Cloudflare (TLS, proxied) -> cloudflared tunnel (buzz-prod)
          -> docker network buzz-prod_buzz-net -> synapse:8080 (nginx static)
                                               -> dist/ (Vite SPA, supabase baked)
```

- **Static Vite SPA** built at build time with production `VITE_*` values from
  `/opt/synapse/.env` (Supabase config is embedded in the bundle).
- **nginx container** serves `dist/` with SPA fallback so `/reset-password`,
  `/auth` etc. resolve.
- **Supabase** is the backend (Auth/DB/Edge Functions), reached from the browser.
- **Cloudflare tunnel** routes `synapse.billionex.io -> http://synapse:8080`.

## One-time host setup (root on the VPS)

```sh
# 1. Env (real values, never committed)
mkdir -p /opt/synapse
cp deploy/env.production.example /opt/synapse/.env
nano /opt/synapse/.env   # fill VITE_SUPABASE_PUBLISHABLE_KEY, set BILLING_ENABLED=true

# 2. Build + run the container (pulls repo, builds with /opt/synapse/.env)
bash deploy/docker-deploy.sh

# 3. Add the tunnel ingress to the productive tunnel config
#    /opt/buzz/cloudflared-config.yml (before the catch-all 404):
#       - hostname: synapse.billionex.io
#         service: http://synapse:8080
#         originRequest: { connectTimeout: 10s }

# 4. Reload the tunnel (this config also serves buzz + pair — reload carefully)
#    docker exec buzz-prod-cloudflared-1 sh -c 'kill -HUP 1'  # or restart compose
```

## Verify

```sh
curl -sI https://synapse.billionex.io/              # 200 text/html
curl -sI https://synapse.billionex.io/reset-password  # 200 (SPA fallback)
docker ps --filter name=synapse                     # running
docker exec synapse-prod-1 wget -qO- http://127.0.0.1:8080/ >/dev/null && echo ok
```

## Notes / boundaries

- `VITE_BILLING_ENABLED=true` unlocks the billing UI. Stripe must be configured
  separately on the Supabase edge functions (test first, live last) or the
  checkout fails closed with "Payment configuration error".
- The earlier nginx/systemd deploy bundle is superseded by this Docker/tunnel
  approach; the Windows PWA recovery machinery stays out of the repo.
