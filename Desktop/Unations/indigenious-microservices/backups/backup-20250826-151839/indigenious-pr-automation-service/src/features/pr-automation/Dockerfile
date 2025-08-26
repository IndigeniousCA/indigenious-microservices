# Multi-stage Dockerfile for PR Automation Service
# Stage 1: Dependencies
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./
COPY src/features/pr-automation/package.json ./src/features/pr-automation/

# Install dependencies
RUN npm ci --only=production

# Stage 2: Builder
FROM node:18-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
RUN npm run build

# Stage 3: Runner
FROM node:18-alpine AS runner
WORKDIR /app

# Add non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Install production dependencies
RUN apk add --no-cache \
    curl \
    ca-certificates \
    tini

# Copy built application
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

# Copy PR automation specific files
COPY --chown=nextjs:nodejs src/features/pr-automation/config ./src/features/pr-automation/config
COPY --chown=nextjs:nodejs src/features/pr-automation/security ./src/features/pr-automation/security

# Create necessary directories
RUN mkdir -p /app/logs /app/keys && \
    chown -R nextjs:nodejs /app/logs /app/keys

# Security hardening
RUN rm -rf /var/cache/apk/* && \
    rm -rf /tmp/* && \
    chmod -R 550 /app && \
    chmod -R 770 /app/logs

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/api/pr/health || exit 1

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start the application
CMD ["node", "dist/features/pr-automation/server.js"]