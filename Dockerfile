FROM node:20-alpine AS base

WORKDIR /usr/src/app

# 安装系统依赖（如后续需要，可在这里扩展）
RUN apk add --no-cache bash

COPY package.json package-lock.json* ./

# 使用 npm install，避免锁文件未及时更新导致 npm ci 失败
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]


