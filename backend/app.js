require('dotenv').config({ path: require('path').join(__dirname, '.env') });

// 设置时区为北京时间（东八区）
process.env.TZ = 'Asia/Shanghai';

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const database = require('./config/database');
const { errorHandler, notFound } = require('./middleware/error');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/uploads', express.static('uploads'));

// 路由配置
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/admin'));
app.use('/api/admin', require('./routes/adminDashboard'));
app.use('/api/students', require('./routes/students'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/papers', require('./routes/papers'));
app.use('/api/exam', require('./routes/exam'));
app.use('/api/exam-schedules', require('./routes/examSchedules'));
app.use('/api/wrong-questions', require('./routes/wrongQuestions'));

// 健康检查
app.get('/api/health', (req, res) => {
    const now = new Date();
    res.json({
        success: true,
        message: '在线考试系统运行正常',
        timestamp: now.toISOString(),
        localTime: now.toLocaleString('zh-CN'),
        timezone: process.env.TZ || 'Not set',
        systemTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
});

// API文档
app.get('/api', (req, res) => {
    res.json({
        success: true,
        message: '在线考试系统 API',
        version: '1.0.0',
        endpoints: {
            auth: {
                'POST /api/auth/register': '用户注册',
                'POST /api/auth/login': '用户登录'
            },
            users: {
                'GET /api/users/profile': '获取用户信息',
                'PUT /api/users/profile': '更新用户信息',
                'PUT /api/users/password': '修改密码'
            },
            admin: {
                'GET /api/users/students': '获取学生列表(管理员)',
                'POST /api/users/students': '创建学生账号(管理员)',
                'DELETE /api/users/students/:id': '删除学生账号(管理员)',
                'GET /api/users/exam-records': '获取考试记录(管理员)',
                'GET /api/users/exam-statistics': '获取考试统计(管理员)'
            },
            questions: {
                'GET /api/questions': '获取题目列表',
                'GET /api/questions/:id': '获取题目详情',
                'POST /api/questions': '创建题目(管理员)',
                'PUT /api/questions/:id': '更新题目(管理员)',
                'DELETE /api/questions/:id': '删除题目(管理员)',
                'GET /api/questions/random/list': '随机获取题目',
                'POST /api/questions/import/excel': 'Excel批量导入(管理员)',
                'GET /api/questions/template/download': '下载Excel模板(管理员)',
                'GET /api/questions/subjects/list': '获取科目列表',
                'GET /api/questions/statistics/overview': '获取题目统计(管理员)'
            },
            papers: {
                'GET /api/papers': '获取试卷列表',
                'GET /api/papers/active/list': '获取可用试卷',
                'GET /api/papers/:id': '获取试卷详情',
                'POST /api/papers': '创建试卷(管理员)',
                'PUT /api/papers/:id': '更新试卷(管理员)',
                'DELETE /api/papers/:id': '删除试卷(管理员)',
                'POST /api/papers/:id/questions': '添加题目到试卷(管理员)',
                'POST /api/papers/:id/questions/batch': '批量添加题目到试卷(管理员)',
                'DELETE /api/papers/:id/questions/:questionId': '从试卷中移除题目(管理员)',
                'PUT /api/papers/:id/questions/:questionId/score': '更新题目分数(管理员)',
                'POST /api/papers/auto/generate': '自动组卷(管理员)'
            },
            exam: {
                'POST /api/exam/start': '开始考试',
                'POST /api/exam/answer': '提交答案',
                'POST /api/exam/finish': '完成考试',
                'GET /api/exam/:examRecordId/progress': '获取考试进度',
                'GET /api/exam/:examRecordId/result': '查看考试结果',
                'GET /api/exam/history/user': '获取用户考试历史',
                'GET /api/exam/practice/random': '随机练习'
            },
            wrongQuestions: {
                'GET /api/wrong-questions': '获取错题列表',
                'PUT /api/wrong-questions/:questionId/mastered': '标记错题为已掌握',
                'DELETE /api/wrong-questions/:questionId': '删除错题记录',
                'GET /api/wrong-questions/statistics/overview': '获取错题统计',
                'GET /api/wrong-questions/practice/start': '错题练习'
            }
        }
    });
});

// 404处理
app.use(notFound);

// 错误处理
app.use(errorHandler);

// 数据库初始化
async function initDatabase() {
    try {
        await database.connect();
        console.log('数据库连接成功');
        
        // 读取并执行初始化SQL
        const fs = require('fs');
        const path = require('path');
        const initSqlPath = path.join(__dirname, '../database/init.sql');
        
        if (fs.existsSync(initSqlPath)) {
            // 检查数据库是否已经初始化过（检查users表是否有数据）
            const userCount = await database.get('SELECT COUNT(*) as count FROM users');
            
            if (userCount.count === 0) {
                console.log('检测到空数据库，开始初始化...');
                
                // 临时禁用外键约束执行初始化
                await database.run('PRAGMA foreign_keys = OFF');
                console.log('临时禁用外键约束进行初始化...');
                
                const initSql = fs.readFileSync(initSqlPath, 'utf8');
                // 分割SQL语句并执行
                const statements = initSql.split(';').filter(stmt => stmt.trim());
                
                for (const statement of statements) {
                    if (statement.trim()) {
                        try {
                            await database.run(statement);
                        } catch (sqlError) {
                            // 忽略OR IGNORE语句的重复插入错误
                            if (!sqlError.message.includes('UNIQUE constraint failed')) {
                                console.error('SQL执行错误:', statement.slice(0, 100), sqlError.message);
                            }
                        }
                    }
                }
                
                // 重新启用外键约束
                await database.run('PRAGMA foreign_keys = ON');
                console.log('数据库初始化完成，外键约束已重新启用');
            } else {
                console.log(`数据库已存在 ${userCount.count} 个用户，跳过初始化`);
            }
        }
    } catch (error) {
        console.error('数据库初始化失败:', error);
        process.exit(1);
    }
}

// 启动服务器
async function startServer() {
    try {
        await initDatabase();
        
        app.listen(PORT, () => {
            console.log(`=================================`);
            console.log(`  在线考试系统后端服务已启动`);
            console.log(`  端口: ${PORT}`);
            console.log(`  环境: ${process.env.NODE_ENV || 'development'}`);
            console.log(`  API文档: http://localhost:${PORT}/api`);
            console.log(`  健康检查: http://localhost:${PORT}/api/health`);
            console.log(`=================================`);
        });
    } catch (error) {
        console.error('服务器启动失败:', error);
        process.exit(1);
    }
}

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    database.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n正在关闭服务器...');
    database.close();
    process.exit(0);
});

// 启动应用
startServer();

module.exports = app;
