FROM node:20-bookworm-slim

WORKDIR /app

# Prisma needs OpenSSL available in the runtime image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma

RUN npm ci

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && ./node_modules/.bin/tsx server/index.ts"]
