FROM mcr.microsoft.com/playwright:v1.50.1-noble AS base

WORKDIR /app

# Install dependencies for both server and client
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN cd server && npm install
RUN cd client && npm install

# Copy source files
COPY server ./server
COPY client ./client

# Build client and server
RUN cd client && npm run build
RUN cd server && npm run build

# Expose web server port
EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "server/dist/index.js"]
