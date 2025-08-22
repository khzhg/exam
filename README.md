# 在线考试系统

一个基于 Node.js 和 Vue.js 的现代化在线考试系统，支持多种题型、自动阅卷、成绩统计等功能。

## 🚀 项目特性

### 核心功能

- **多种题型支持**：单选题、多选题、判断题、简答题
- **在线考试**：定时考试、自动提交、实时监控
- **练习模式**：随机抽题练习、错题重做
- **成绩管理**：自动阅卷、成绩统计、历史记录
- **题库管理**：题目增删改查、Excel批量导入
- **试卷管理**：手动组卷、自动组卷
- **错题本**：错题收集、重点练习
- **用户管理**：学生账户管理、权限控制

### 技术特性

- **前后端分离**：RESTful API设计
- **响应式设计**：支持PC和移动端
- **实时更新**：考试状态实时同步
- **数据安全**：JWT认证、SQL注入防护
- **易于部署**：单机部署、支持20+并发

## 🛠️ 技术栈

### 后端

- **框架**：Node.js + Express
- **数据库**：SQLite（可扩展为MySQL）
- **认证**：JWT + bcrypt
- **文件处理**：multer + xlsx
- **验证**：express-validator

### 前端

- **框架**：Vue 3 + Composition API
- **UI库**：Element Plus
- **路由**：Vue Router 4
- **HTTP客户端**：Axios
- **构建工具**：Vite

## 📁 项目结构

```ba
exam-system/
├── backend/                 # 后端服务
│   ├── app.js              # 应用入口
│   ├── config/             # 配置文件
│   │   └── database.js     # 数据库配置
│   ├── controllers/        # 控制器
│   ├── models/             # 数据模型
│   ├── routes/             # 路由定义
│   ├── middleware/         # 中间件
│   └── uploads/            # 文件上传目录
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── views/          # 页面
│   │   ├── api/            # API接口
│   │   ├── router/         # 路由配置
│   │   ├── store/          # 状态管理
│   │   └── utils/          # 工具函数
│   ├── public/             # 静态资源
│   └── index.html          # HTML模板
├── database/               # 数据库文件
│   └── init.sql           # 初始化脚本
└── README.md              # 项目说明
```

## 🚀 快速开始

### 安装步骤

1. **克隆项目**

```bash
git clone <repository-url>
cd exam-system
```

2.**安装后端依赖**

```bash
cd backend
npm install
```

3.**配置环境变量**

```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库和JWT密钥
```

4.**启动后端服务**

```bash
npm run dev     # 开发模式
npm start       # 生产模式
```

5.**安装前端依赖**

```bash
cd ../frontend
npm install
```

6.**启动前端服务**

```bash
npm run dev     # 开发模式
npm run build   # 构建生产版本
```

### 访问应用

- 前端地址：[http://localhost:8080]
- 后端API：[http://localhost:3001/api]
- API文档：[http://localhost:3001/api]

### 默认账户

- **管理员**：用户名 `admin`，密码 `123456`
- **学生**：用户名 `student`，密码 `123456`

## 📖 使用说明

### 管理员功能

1. **题库管理**
   - 手动添加题目（支持四种题型）
   - Excel批量导入题目
   - 题目分类和难度设置

2. **试卷管理**
   - 手动选择题目组卷
   - 按条件自动组卷
   - 设置考试时间和分值

3. **学生管理**
   - 创建学生账户
   - 重置学生密码
   - 查看学生信息

4. **考试管理**
   - 查看考试记录
   - 成绩统计分析
   - 导出成绩报表

### 学生功能

1. **在线考试**
   - 选择试卷开始考试
   - 倒计时提醒
   - 自动保存答案

2. **练习模式**
   - 随机抽题练习
   - 不限时间
   - 即时查看答案

3. **错题管理**
   - 自动收集错题
   - 错题分类浏览
   - 错题重做练习

4. **成绩查询**
   - 查看考试历史
   - 详细答题情况
   - 成绩趋势分析

## 🔧 配置说明

### 后端配置 (.env)

```bash
PORT=3001                                    # 服务端口
DB_PATH=../database/exam.db                 # 数据库路径
JWT_SECRET=your-super-secret-jwt-key         # JWT密钥
JWT_EXPIRE=24h                              # Token过期时间
BCRYPT_ROUNDS=10                            # 密码加密轮数
MAX_FILE_SIZE=5242880                       # 文件上传大小限制(5MB)
UPLOAD_PATH=./uploads                       # 文件上传路径
```

### 前端配置 (vite.config.js)

```javascript
export default defineConfig({
  server: {
    port: 8080,                             # 前端端口
    proxy: {
      '/api': {
        target: 'http://localhost:3001',    # 后端API地址
        changeOrigin: true
      }
    }
  }
})
```

## 📝 API文档

### 认证接口

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录

### 题目接口

- `GET /api/questions` - 获取题目列表
- `POST /api/questions` - 创建题目
- `PUT /api/questions/:id` - 更新题目
- `DELETE /api/questions/:id` - 删除题目
- `POST /api/questions/import/excel` - Excel导入

### 试卷接口

- `GET /api/papers` - 获取试卷列表
- `POST /api/papers` - 创建试卷
- `POST /api/papers/:id/questions` - 添加题目到试卷
- `POST /api/papers/auto/generate` - 自动组卷

### 考试接口

- `POST /api/exam/start` - 开始考试
- `POST /api/exam/answer` - 提交答案
- `POST /api/exam/finish` - 完成考试
- `GET /api/exam/history/user` - 考试历史

## 🐛 常见问题

### 1. 数据库连接失败

确保数据库文件路径正确，检查文件权限。

### 2. 前端API请求失败

检查后端服务是否启动，确认API地址配置正确。

### 3. Excel导入失败

确保Excel文件格式正确，参考提供的模板。

### 4. 考试时间异常

检查系统时间设置，确保前后端时间同步。

## 🚀 部署指南

### 环境要求

- **Node.js**: >= 14.0.0
- **npm**: >= 6.0.0
- **操作系统**: Linux/Windows/macOS
- **内存**: >= 512MB
- **存储**: >= 500MB

### 开发环境部署

1. **一键部署脚本**

```bash
# 克隆项目后，使用部署脚本
./deploy.sh development

# 或者手动安装
cd backend && npm install
cd ../frontend && npm install
```

2.**启动开发服务**

```bash
# 启动后端 (端口3001)
cd backend && npm run dev

# 启动前端 (端口8080)
cd frontend && npm run dev
```

3 **访问应用**

- 前端地址：[http://localhost:8080]
- 后端API：[http://localhost:3001/api]
- 默认账户：admin/admin, student/student

### 生产环境部署

1. **自动部署**

```bash
# 使用部署脚本
./deploy.sh production
```

2.**手动部署步骤**

```bash
# 1. 安装依赖
cd backend && npm install --production
cd ../frontend && npm install

# 2. 构建前端
cd frontend && npm run build

# 3. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 .env 文件，设置生产环境配置

# 4. 启动服务
cd backend && npm start
```

3.**使用PM2管理进程**

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start backend/app.js --name exam-backend

# 设置开机自启
pm2 startup
pm2 save
```

4.**Nginx反向代理**

```bash
# 复制配置文件
sudo cp nginx.conf.example /etc/nginx/sites-available/exam-system
sudo ln -s /etc/nginx/sites-available/exam-system /etc/nginx/sites-enabled/

# 修改配置文件中的路径和域名
sudo nano /etc/nginx/sites-available/exam-system

# 重启Nginx
sudo systemctl restart nginx
```

### Docker部署

1. **创建Dockerfile**

```dockerfile
# 多阶段构建
FROM node:16-alpine as build-stage
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

FROM node:16-alpine as production-stage
WORKDIR /app
COPY backend/package*.json ./
RUN npm install --production
COPY backend/ .
COPY --from=build-stage /app/dist ./public
COPY database/ ./database/
EXPOSE 3001
CMD ["node", "app.js"]
```

2.**使用Docker Compose**

```yaml
version: '3.8'
services:
  exam-system:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./database:/app/database
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

### 配置说明

#### 环境变量配置 (.env)

```bash
# 基础配置
PORT=3000                    # 服务端口
DB_PATH=../database/exam.db  # 数据库路径(相对路径，便于部署)

# 安全配置
JWT_SECRET=your-secret-key   # JWT密钥(生产环境必须修改)
JWT_EXPIRE=24h              # Token过期时间
BCRYPT_ROUNDS=12            # 密码加密强度(生产环境建议12)

# 文件上传配置
MAX_FILE_SIZE=5242880       # 最大上传文件大小(5MB)
UPLOAD_PATH=./uploads       # 上传文件目录

# 其他配置
LOG_LEVEL=info              # 日志级别
```

#### 数据库路径解析规则

1. **开发环境**: 使用相对路径 `../database/exam.db`
2. **生产环境**:
   - 相对路径：相对于backend目录解析
   - 绝对路径：直接使用指定路径
   - 自动创建：不存在的目录会自动创建

#### 前端代理配置 (vite.config.js)

```javascript
export default defineConfig({
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})
```

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支
3. 提交改动
4. 推送到分支
5. 创建 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 👥 开发团队

- 后端开发：Node.js + Express + SQLite
- 前端开发：Vue 3 + Element Plus
- 数据库设计：关系型数据库设计
- 系统架构：前后端分离架构

## 📞 联系我们

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件
- 项目讨论区

---

⭐ 如果这个项目对您有帮助，请给我们一个星标！
