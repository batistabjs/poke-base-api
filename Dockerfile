FROM node:22-alpine

WORKDIR /app

COPY package.json ./
COPY . .

RUN chown -R node:node /app

ENV PORT=9192
EXPOSE 9192

USER node

CMD ["node", "server.js"]
