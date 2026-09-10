FROM node:24.1-slim

WORKDIR /usr/src/app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./

RUN npm ci

COPY backend/ ./
COPY prisma/ ./prisma/

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]