FROM node:20-alpine AS base

WORKDIR /usr/src/app

# 安装构建依赖：bash + python + 编译工具链（为 better-sqlite3 等原生模块编译用）
RUN apk add --no-cache bash python3 make g++ musl-locales

# 设置UTF-8字符编码
ENV LANG=en_US.UTF-8 \
    LANGUAGE=en_US.UTF-8 \
    LC_ALL=en_US.UTF-8 \
    LC_CTYPE=UTF-8

COPY package.json package-lock.json* ./

# 使用 npm install，避免锁文件未及时更新导致 npm ci 失败
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production \
    PORT=3000

EXPOSE 3000

CMD ["node", "server.js"]


