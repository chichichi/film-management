FROM node:20-slim AS deps

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-slim

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY src ./src

EXPOSE 4000

CMD ["node", "src/index.js"]
