FROM node:24.1-slim

WORKDIR /usr/src/app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./

# Use npm install to respect package.json when lockfile is out of sync
RUN npm install --production

COPY backend/ ./
COPY backend/prisma/ ./prisma/

RUN npx prisma generate

EXPOSE 3000

CMD ["npm", "start"]