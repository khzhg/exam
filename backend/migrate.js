/**
 * 数据库迁移脚本
 * 用途：为现有生产环境添加 answer_time 字段
 * 
 * 使用方法：
 * node migrate.js
 * 
 * 功能：
 * - 安全地为 answer_records 表添加 answer_time 字段
 * - 支持重复执行（幂等性）
 * - 向后兼容现有数据
 */

const database = require('./config/database');

async function runMigration() {
    try {
        console.log('开始数据库迁移...');
        
        // 连接数据库
        await database.connect();
        
        // 检查 answer_time 字段是否已存在
        const tableInfo = await database.query("PRAGMA table_info(answer_records)");
        const hasAnswerTimeColumn = tableInfo.some(column => column.name === 'answer_time');
        
        if (!hasAnswerTimeColumn) {
            console.log('添加 answer_time 字段...');
            await database.run("ALTER TABLE answer_records ADD COLUMN answer_time INTEGER DEFAULT NULL");
            console.log('✅ 成功添加 answer_time 字段');
        } else {
            console.log('ℹ️  answer_time 字段已存在，跳过迁移');
        }
        
        console.log('✅ 数据库迁移完成');
        database.close();
    } catch (error) {
        console.error('❌ 数据库迁移失败:', error);
        database.close();
        process.exit(1);
    }
}

// 如果直接运行此文件，执行迁移
if (require.main === module) {
    runMigration();
}

module.exports = runMigration;
