# Stage 1: Build
FROM node:20.19-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

# Stage 2: Runtime
FROM node:20.19-alpine

WORKDIR /app

RUN apk add --no-cache dumb-init

COPY --from=builder /app/node_modules ./node_modules

COPY . .

ENV NODE_ENV=production

EXPOSE 5000

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http'); const req=http.get('http://localhost:5000/api/health', (res) => { res.resume(); res.on('end', () => process.exit(res.statusCode === 200 ? 0 : 1)); }); req.on('error', () => process.exit(1));"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
