# Synapse — Dein Second Brain für ADHS

Synapse verwandelt dein ADHS in deine Superkraft: Gedanken sofort erfassen, aus Chaos Klarheit machen. Eine Vite + React + TypeScript PWA mit Supabase-Backend.

## Features

- **Impulse-Catcher** — Gedanken in Sekunden festhalten, bevor sie verloren gehen
- **Kanban-Projekte** — Projektboards mit Drag & Drop (dnd-kit)
- **Pomodoro-Timer** — Fokus-Sprints und Pausen
- **Hierarchical Project List** — verschachtelte Projekte & Räume (spaces)
- **Realtime Sync** — Supabase Realtime, über Geräte hinweg
- **PWA** — installierbar, offline-Fähigkeit via Workbox, Share-Target
- **Multi-Tier Billing** — Free / Pro / Power / Enterprise, Stripe-verarbeitet
- **Admin & Audit** — Rollen, API-Tokens, Audit-Log (append-only)

## Stack

- React 18 + TypeScript
- Vite (SWC) + VitePWA
- Tailwind CSS + shadcn/ui (Radix)
- Supabase (Auth, Postgres, Realtime, Edge Functions)
- Stripe (Checkout, Webhooks, Customer Portal)
- TanStack Query / React Router / Zod

## Lokale Entwicklung

```sh
npm install
# lege .env an (siehe .env.example) — niemals echte Werte committen
npm run dev
```

## Qualitätssicherung

```sh
npm test          # Vitest
npx tsc --noEmit  # Typecheck
npm run lint      # ESLint
npm run build     # Production-Build
```

## Deployment

Das Produkt läuft auf der eigenen Infrastruktur (VPS/nginx + systemd). Runtime-Konfiguration (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_APP_ENV`, `VITE_BILLING_ENABLED`) wird vom Deployment-Host gesetzt — niemals committed.

## License

© Maximiliano Coloma-Seegers. All rights reserved. Quellcode ist öffentlich sichtbar; die Nutzungsrechte liegen beim Rechteinhaber. Siehe [LICENSE](./LICENSE).
