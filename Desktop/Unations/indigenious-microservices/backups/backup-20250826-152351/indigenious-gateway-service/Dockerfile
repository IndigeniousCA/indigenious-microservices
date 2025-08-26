FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production || npm install
COPY . .
RUN npm run build || mkdir -p dist
EXPOSE 3000
CMD ["npm", "start"]
