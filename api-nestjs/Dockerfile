# syntax=docker/dockerfile:1
# OPS-001 : multi-stage, image de base minimale épinglée, utilisateur non-root.
# Renovate met à jour la version (et le digest si on l'ajoute : node:26-slim@sha256:...).

FROM node:26-slim AS base
WORKDIR /app

# --- Dépendances complètes + build ---
FROM base AS build
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npm run build

# --- Dépendances de production uniquement ---
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev --ignore-scripts

# --- Image finale ---
FROM node:26-slim AS runtime
ARG APP_VERSION=dev
ENV NODE_ENV=production APP_VERSION=$APP_VERSION
WORKDIR /app
COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node package.json ./
USER node
EXPOSE 3000
# BE-003 / OPS-004 : l'API applique ses migrations au démarrage, sous verrou.
# node dist/database/migrate.js reste disponible pour une intervention manuelle.
CMD ["node", "--import", "./dist/instrument.js", "dist/main.js"]
