# Multi-stage Dockerfile for Border Safety - Railway Optimized
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --silent
COPY frontend/ ./
RUN npm run build

FROM node:20-alpine AS production
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++ sqlite

# Copy backend package files
COPY backend/package*.json ./

# Install ALL dependencies (including native modules like better-sqlite3)
RUN npm ci --silent

# Rebuild native modules to ensure they're compiled correctly
RUN npm rebuild better-sqlite3

# NOW remove build dependencies (after native modules are compiled)
RUN apk del python3 make g++

# Copy backend source
COPY backend/ ./

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./public

# Create data directory
RUN mkdir -p /data && chmod 755 /data

# Environment
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/data/database.sqlite

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app /data

USER nodejs

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

CMD ["node", "server.js"]
