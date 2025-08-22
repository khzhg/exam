#!/bin/bash

# 在线考试系统部署脚本
# 使用方法: ./deploy.sh [development|production]

ENV=${1:-development}

echo "开始部署在线考试系统 - 环境: $ENV"

# 检查Node.js版本
NODE_VERSION=$(node --version 2>/dev/null)
if [ $? -ne 0 ]; then
    echo "错误: 请先安装 Node.js (>=14.0.0)"
    exit 1
fi

echo "Node.js 版本: $NODE_VERSION"

# 安装后端依赖
echo "安装后端依赖..."
cd backend
npm install --production

# 复制环境配置文件
if [ ! -f .env ]; then
    cp .env.example .env
    echo "已创建 .env 配置文件，请根据实际情况修改"
fi

# 确保数据库目录存在
mkdir -p ../database
mkdir -p uploads
mkdir -p logs

cd ..

# 安装前端依赖并构建
echo "构建前端项目..."
cd frontend
npm install

if [ "$ENV" = "production" ]; then
    npm run build
    echo "前端构建完成，构建文件位于 dist/ 目录"
else
    echo "开发环境，跳过前端构建"
fi

cd ..

# 设置文件权限
chmod +x backend/app.js
chmod 755 database
chmod 755 backend/uploads

echo "部署完成！"

if [ "$ENV" = "development" ]; then
    echo ""
    echo "开发环境启动命令:"
    echo "  后端: cd backend && npm run dev"
    echo "  前端: cd frontend && npm run dev"
    echo ""
    echo "访问地址:"
    echo "  前端: http://localhost:8080"
    echo "  后端API: http://localhost:3001/api"
else
    echo ""
    echo "生产环境启动建议:"
    echo "  使用 PM2: pm2 start backend/app.js --name exam-backend"
    echo "  使用 systemd: 创建 systemd 服务文件"
    echo "  使用 Docker: docker-compose up -d"
    echo ""
    echo "Nginx 配置示例位于 nginx.conf.example"
fi
