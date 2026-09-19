# Synapse production image: build the Vite SPA with build-time runtime values,
# then serve the static bundle with nginx over the internal (tunnel) port.
#
# Runtime values (Supabase URL/publishable key, billing flag) are baked at
# BUILD time via ARG/ENV because the app reads import.meta.env. They are passed
# as --build-arg from /opt/synapse/.env (never committed) by deploy/docker-deploy.sh.
#
# Build:  docker build --build-arg VITE_APP_ENV=production ... 
# Image exposes 8080 internally; external HTTPS is terminated by the
# Cloudflare tunnel, so the container stays a plain HTTP static server.

# ---- build stage ----
FROM node:22-alpine AS build
WORKDIR /app

# Install deps first for layer caching.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy the whole source tree (includes docs/v2/petri build inputs).
COPY . .

# Build-time runtime values.
ARG VITE_APP_ENV
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_BILLING_ENABLED
ENV VITE_APP_ENV=$VITE_APP_ENV \
    VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_BILLING_ENABLED=$VITE_BILLING_ENABLED

RUN npm run build

# ---- serve stage ----
FROM nginx:stable-alpine
COPY deploy/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
