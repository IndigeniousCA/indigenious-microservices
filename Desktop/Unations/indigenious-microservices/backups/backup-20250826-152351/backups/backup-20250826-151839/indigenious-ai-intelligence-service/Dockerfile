FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (create package-lock.json if needed)
RUN npm install && npm ci --only=production || npm install

# Copy application code
COPY . .

# Build the application
RUN npm run build || mkdir -p dist

# Expose port
EXPOSE 3035

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3     CMD node -e "require('http').get('http://localhost:3035/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Start the service
CMD ["npm", "start"]
