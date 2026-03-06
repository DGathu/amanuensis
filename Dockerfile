# 1. Base image
FROM node:22-bookworm-slim AS base

# 2. Dependencies
FROM base AS deps
# NEW: Added the blacksmith tools (python3, make, g++) so SQLite can forge itself if the network drops!
RUN apt-get update && apt-get install -y openssl python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# Provide a dummy URL so Prisma 7 doesn't panic during build-time generation
RUN DATABASE_URL="file:./dev.db" npx prisma generate

# 3. Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Feed the Next.js inspector dummy keys so it doesn't crash during static analysis
RUN OPENAI_API_KEY="dummy_build_key" OPENROUTER_API_KEY="dummy_build_key" npm run build

# 4. Production Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apt-get update && apt-get install -y openssl

# Install Prisma CLI for runtime migrations
RUN npm install prisma

# Open the gates to outside traffic
ENV HOSTNAME="0.0.0.0"

# Create a directory for our persistent SQLite database vault
RUN mkdir -p /app/data

# Copy standalone output from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./

EXPOSE 3000
ENV PORT=3000

# Push the database schema, then start the server
CMD ["sh", "-c", "npx prisma db push && node server.js"]