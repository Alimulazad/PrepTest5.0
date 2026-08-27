# ==========================================
# 🐳 JACHAI (যাচাই) — Production Dockerfile
# Multi-stage build for ultra-lightweight image
# ==========================================

# Stage 1: Build Frontend and Server
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy application source files
COPY . .

# Build Vite client SPA and bundle Express backend to dist/server.cjs
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled build artifacts from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Expose HTTP port
EXPOSE 3000

# Start production server
CMD ["node", "dist/server.cjs"]
