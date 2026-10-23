FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY . .

RUN chown -R node:node /app

EXPOSE 8082

USER node

CMD ["node", "server.js"]
