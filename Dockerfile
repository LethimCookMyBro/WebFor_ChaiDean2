# Force rebuild v4 - Fix npm install
# Multi-stage Dockerfile for Border Safety - Railway Optimized

# ============================================
# Stage 1: Build frontend
# ============================================
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --silent
COPY frontend/ ./
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine AS production
WORKDIR /app

# Install build dependencies (required for better-sqlite3)
RUN apk add --no-cache python3 make g++ sqlite

# Copy backend package files
COPY backend/package*.json ./

# Install dependencies
RUN npm install --silent

# Rebuild better-sqlite3 native module
RUN npm rebuild better-sqlite3 || echo "Rebuild attempted"

# Remove build dependencies to reduce image size
RUN apk del python3 make g++

# Copy backend source code
COPY backend/ ./

# Copy frontend build from stage 1
COPY --from=frontend-build /app/frontend/dist ./public

# Create data directory for SQLite
RUN mkdir -p /data && chmod 755 /data

# Environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=/data/database.sqlite

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    chown -R nodejs:nodejs /app /data

USER nodejs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Start server
CMD ["node", "server.js"]
