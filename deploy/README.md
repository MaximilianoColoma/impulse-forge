# Synapse — Production Deployment (self-hosted, own infrastructure)

Synapse runs as a public SaaS on the owner's own VPS behind nginx + TLS,
against the Supabase project `edgpqsjqlrnuqwikfwjh` and Stripe billing.
This directory holds deployment artifacts; nothing here activates anything —
all steps are run manually (or via systemd) on the production host.

## Architecture

- **Static Vite SPA** built with production `VITE_*` values **at build time**
  (Supabase config is embedded into the bundle).
- **nginx** serves `dist/` and provides the SPA fallback + TLS.
- **Supabase** is the backend (Auth/DB/Edge Functions), reached from the
  browser. The edge functions run Supabase-hosted.
- **systemd** runs the one-shot build+publish and an optional timer.

## One-time host setup (root on the VPS)

```sh
# 1. Dedicated user + directories
useradd -r -m -s /bin/bash synapse
mkdir -p /srv/synapse/{repo,builds}
chown -R synapse:synapse /srv/synapse

# 2. Env (real values, never committed)
cp deploy/env.production.example /srv/synapse/.env.production
nano /srv/synapse/.env.production   # fill VITE_SUPABASE_* and set BILLING_ENABLED

# 3. nginx site
cp deploy/nginx/synapse.billionex.io.conf /etc/nginx/sites-available/
ln -s ../sites-available/synapse.billionex.io.conf /etc/nginx/sites-enabled/
nginx -t

# 4. TLS (certbot against the domain — DNS must already resolve)
certbot --nginx -d synapse.billionex.io

# 5. systemd build+deploy unit
cp deploy/systemd/synapse-build.service  /etc/systemd/system/
cp deploy/systemd/synapse-build.timer    /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now synapse-build.timer
```

## Deploy / redeploy

```sh
systemctl start synapse-build.service     # one-shot, pulls main, builds, publishes
systemctl status synapse-build.service    # verify
```

## Verify

```sh
curl -Is https://synapse.billionex.io/            # 200 HTML
curl -Is https://synapse.billionex.io/reset-password   # 200 (SPA fallback)
nginx -t && systemctl reload nginx
```

## Notes / boundaries

- `VITE_BILLING_ENABLED=true` unlocks the billing UI. Stripe must actually be
  configured on the Supabase edge functions separately (live keys/prices) or
  the checkout call fails closed with "Payment configuration error".
- The Windows PWA deployment machinery is deliberately **not** in this repo.
