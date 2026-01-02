#!/bin/bash

# Docker镜像导出脚本 - 用于外网环境打包
# 用法: ./export-image.sh [版本号]

set -e

# 默认版本号
VERSION=${1:-"v1.0.0"}
IMAGE_NAME="fileupdate-server"
EXPORT_DIR="export"

echo "🚀 开始导出 $IMAGE_NAME:$VERSION"
echo "=================================="

# 检查Docker是否可用
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    exit 1
fi

# 检查镜像是否存在
if ! docker images "$IMAGE_NAME:latest" | grep -q "$IMAGE_NAME"; then
    echo "❌ 镜像 $IMAGE_NAME:latest 不存在，请先构建镜像"
    echo "运行: docker build -t $IMAGE_NAME:latest ."
    exit 1
fi

# 创建导出目录
echo "📁 创建导出目录..."
mkdir -p "$EXPORT_DIR"

# 打标签
echo "🏷️  标记版本标签..."
docker tag "$IMAGE_NAME:latest" "$IMAGE_NAME:$VERSION"

# 导出镜像
echo "📦 导出镜像..."
TAR_FILE="$EXPORT_DIR/$IMAGE_NAME-$VERSION.tar"
docker save "$IMAGE_NAME:$VERSION" -o "$TAR_FILE"

# 生成校验和
echo "🔐 生成校验和..."
sha256sum "$TAR_FILE" > "$TAR_FILE.sha256"

# 显示文件信息
echo "📊 导出完成:"
echo "   文件: $TAR_FILE"
echo "   大小: $(ls -lh "$TAR_FILE" | awk '{print $5}')"
echo "   SHA256: $(cat "$TAR_FILE.sha256" | awk '{print $1}')"

# 复制配置文件
echo "📋 复制配置文件..."
cp docker-compose.yml "$EXPORT_DIR/"
cp .gitignore "$EXPORT_DIR/" 2>/dev/null || true

# 生成部署说明
cat > "$EXPORT_DIR/README-部署说明.md" << 'EOF'
# 内网部署说明

## 快速部署

1. 确保所有文件已传输到内网服务器
2. 验证文件完整性：
   ```bash
   sha256sum -c fileupdate-server-*.tar.sha256
   ```

3. 加载Docker镜像：
   ```bash
   docker load -i fileupdate-server-*.tar
   ```

4. 配置环境变量：
   编辑 docker-compose.yml，设置安全的密码和密钥

5. 启动服务：
   ```bash
   docker-compose up -d
   ```

6. 验证部署：
   ```bash
   curl http://localhost:3000/api/health
   ```

## 环境配置

在 docker-compose.yml 中设置以下环境变量：

```yaml
environment:
  - ADMIN_PASSWORD=your-secure-admin-password
  - JWT_SECRET=your-secure-jwt-secret
  - SESSION_SECRET=your-secure-session-secret
```

## 故障排除

- 如果启动失败，查看日志：`docker-compose logs`
- 如果端口冲突，修改 docker-compose.yml 中的端口映射
- 如果权限问题，确保数据目录有写入权限
EOF

echo "✅ 导出完成！"
echo ""
echo "📁 导出目录内容:"
ls -la "$EXPORT_DIR/"
echo ""
echo "📝 部署说明已生成: $EXPORT_DIR/README-部署说明.md"
echo ""
echo "🚀 下一步: 将 $EXPORT_DIR 目录传输到内网环境"
