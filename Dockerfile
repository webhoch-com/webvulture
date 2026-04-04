# Stage 1: Build React frontend
FROM node:20-alpine AS builder
WORKDIR /app

COPY client/package*.json ./client/
RUN cd client && npm ci

COPY client/ ./client/
RUN cd client && npm run build

# Stage 2: Production server
FROM node:20-alpine
WORKDIR /app

# Server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Astro template — vorinstallieren damit Builds schnell sind
COPY server/astro-template/package*.json ./server/astro-template/
RUN cd server/astro-template && npm install

COPY server/ ./server/
COPY --from=builder /app/client/dist ./client/dist

# Temp-Verzeichnis für Astro-Builds
RUN mkdir -p /tmp/astro-builds

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/src/index.js"]
