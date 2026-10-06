FROM mcr.microsoft.com/playwright:v1.50.1-noble AS base

WORKDIR /app

# Enable Playwright shared browsers cache
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Install dependencies for both server and client
COPY server/package*.json ./server/
COPY client/package*.json ./client/

RUN cd server && npm install
RUN cd client && npm install

# Ensure Playwright Chromium is properly installed for host architecture (ARM64 / x86_64)
RUN cd server && npx playwright install chromium

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
