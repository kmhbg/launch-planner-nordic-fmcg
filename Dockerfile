# Multi-stage build för optimal image size

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Kopiera package files
COPY package*.json ./
COPY prisma ./prisma/

# Installera dependencies
RUN npm ci

# Generera Prisma Client
RUN npx prisma generate

# Kopiera resten av koden
COPY . .

# Build appen
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS runner

WORKDIR /app

# Installera endast production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Kopiera Prisma files
COPY prisma ./prisma/
RUN npx prisma generate

# Kopiera build från builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Exponera port
EXPOSE 3000

# Starta appen
CMD ["node", "dist/server.js"]

# För statisk hosting (Vite build)
# CMD ["npx", "serve", "-s", "dist", "-l", "3000"]

