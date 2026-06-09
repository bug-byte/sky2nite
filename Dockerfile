# ── Stage 1: Build client ────────────────────────────────────────────────────
FROM node:22-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

# Copy shared source so Vite can resolve type-only imports
COPY shared/ /app/shared/

COPY client/ ./
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY
RUN npm run build

# ── Stage 2: Build server ────────────────────────────────────────────────────
FROM node:22-alpine AS server-builder
WORKDIR /app/server

COPY server/package*.json ./
RUN npm ci

# Copy shared and build it first so the server tsc project reference resolves
COPY shared/ /app/shared/
RUN node node_modules/typescript/bin/tsc --build --force /app/shared/tsconfig.json

COPY server/ ./
RUN npm run build

# ── Stage 3: Production image ────────────────────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# Install only production dependencies (includes the shared file: symlink)
COPY server/package*.json ./
COPY shared/ /shared/
RUN npm ci --omit=dev

# Copy compiled server
COPY --from=server-builder /app/server/dist ./dist

# Copy compiled shared library into the location node_modules/shared points to
COPY --from=server-builder /app/shared/dist /shared/dist

# Copy built client into the directory the server will serve
COPY --from=client-builder /app/client/dist ./public

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]
