@echo off
REM Docker镜像导出脚本 - Windows版本
REM 用法: export-image.bat [版本号]

setlocal enabledelayedexpansion

REM 默认版本号
set VERSION=%1
if "%VERSION%"=="" set VERSION=v1.0.0

set IMAGE_NAME=fileupdate-server
set EXPORT_DIR=export

echo 🚀 开始导出 %IMAGE_NAME%:%VERSION%
echo ==================================

REM 检查Docker是否可用
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker未运行，请先启动Docker
    exit /b 1
)

REM 检查镜像是否存在
docker images %IMAGE_NAME%:latest | findstr %IMAGE_NAME% >nul
if errorlevel 1 (
    echo ❌ 镜像 %IMAGE_NAME%:latest 不存在，请先构建镜像
    echo 运行: docker build -t %IMAGE_NAME%:latest .
    exit /b 1
)

REM 创建导出目录
echo 📁 创建导出目录...
if not exist "%EXPORT_DIR%" mkdir "%EXPORT_DIR%"

REM 打标签
echo 🏷️  标记版本标签...
docker tag %IMAGE_NAME%:latest %IMAGE_NAME%:%VERSION%

REM 导出镜像
echo 📦 导出镜像...
set TAR_FILE=%EXPORT_DIR%\%IMAGE_NAME%-%VERSION%.tar
docker save %IMAGE_NAME%:%VERSION% -o "%TAR_FILE%"

REM 生成校验和
echo 🔐 生成校验和...
if exist "%TAR_FILE%" (
    for /f "tokens=*" %%i in ('powershell -command "Get-FileHash -Algorithm SHA256 '%TAR_FILE%' | Select-Object -ExpandProperty Hash"') do set SHA256=%%i
    echo %SHA256% *%IMAGE_NAME%-%VERSION%.tar > "%TAR_FILE%.sha256"
)

REM 显示文件信息
echo 📊 导出完成:
echo    文件: %TAR_FILE%
powershell -command "Write-Host '   大小:' (Get-Item '%TAR_FILE%').Length"
echo    SHA256: %SHA256%

REM 复制配置文件
echo 📋 复制配置文件...
copy docker-compose.yml "%EXPORT_DIR%\" >nul
if exist .gitignore copy .gitignore "%EXPORT_DIR%\" >nul

REM 生成部署说明
echo # 内网部署说明 > "%EXPORT_DIR%\README-部署说明.md"
echo. >> "%EXPORT_DIR%\README-部署说明.md"
echo ## 快速部署 >> "%EXPORT_DIR%\README-部署说明.md"
echo. >> "%EXPORT_DIR%\README-部署说明.md"
echo 1. 确保所有文件已传输到内网服务器 >> "%EXPORT_DIR%\README-部署说明.md"
echo 2. 验证文件完整性： >> "%EXPORT_DIR%\README-部署说明.md"
echo    sha256sum -c fileupdate-server-*.tar.sha256 >> "%EXPORT_DIR%\README-部署说明.md"
echo. >> "%EXPORT_DIR%\README-部署说明.md"
echo 3. 加载Docker镜像： >> "%EXPORT_DIR%\README-部署说明.md"
echo    docker load -i fileupdate-server-*.tar >> "%EXPORT_DIR%\README-部署说明.md"
echo. >> "%EXPORT_DIR%\README-部署说明.md"
echo 4. 配置环境变量： >> "%EXPORT_DIR%\README-部署说明.md"
echo    编辑 docker-compose.yml，设置安全的密码和密钥 >> "%EXPORT_DIR%\README-部署说明.md"
echo. >> "%EXPORT_DIR%\README-部署说明.md"
echo 5. 启动服务： >> "%EXPORT_DIR%\README-部署说明.md"
echo    docker-compose up -d >> "%EXPORT_DIR%\README-部署说明.md"
echo. >> "%EXPORT_DIR%\README-部署说明.md"
echo 6. 验证部署： >> "%EXPORT_DIR%\README-部署说明.md"
echo    curl http://localhost:3000/api/health >> "%EXPORT_DIR%\README-部署说明.md"

echo ✅ 导出完成！
echo.
echo 📁 导出目录内容:
dir "%EXPORT_DIR%"
echo.
echo 📝 部署说明已生成: %EXPORT_DIR%\README-部署说明.md
echo.
echo 🚀 下一步: 将 %EXPORT_DIR% 目录传输到内网环境

goto :eof
