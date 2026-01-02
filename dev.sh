#!/bin/bash

# 开发环境快速启动脚本

echo "🚀 启动应用发布服务器 - 开发环境"
echo "=================================="

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    exit 1
fi

# 创建必要的目录
mkdir -p data uploads logs

echo "📦 构建开发镜像..."
docker-compose -f docker-compose.dev.yml build

echo "🔥 启动开发环境（支持热重载）..."
echo "   - 服务地址: http://localhost:3000"
echo "   - 实时日志: 已在下方显示"
echo "   - 热重载: 修改代码后自动重启"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

docker-compose -f docker-compose.dev.yml up
