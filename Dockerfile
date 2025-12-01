FROM node:20-alpine AS base

WORKDIR /usr/src/app

# 安装系统依赖（如后续需要，可在这里扩展）
RUN apk add --no-cache bash

COPY package.json package-lock.json* ./

RUN npm ci --only=production

COPY . .

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]


