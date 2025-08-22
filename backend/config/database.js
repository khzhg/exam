require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 智能数据库路径解析
function resolveDbPath() {
    const envPath = process.env.DB_PATH;
    
    if (!envPath) {
        // 默认路径
        return path.join(__dirname, '../../database/exam.db');
    }
    
    // 如果是绝对路径，直接使用
    if (path.isAbsolute(envPath)) {
        return envPath;
    }
    
    // 相对路径，相对于backend目录解析
    return path.resolve(__dirname, '..', envPath);
}

const DB_PATH = resolveDbPath();

console.log('数据库路径:', DB_PATH);

class Database {
    constructor() {
        this.db = null;
    }

    // 初始化数据库连接
    async connect() {
        return new Promise((resolve, reject) => {
            // 确保数据库目录存在
            const dbDir = path.dirname(DB_PATH);
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true });
            }
            
            this.db = new sqlite3.Database(DB_PATH, async (err) => {
                if (err) {
                    console.error('数据库连接失败:', err.message);
                    reject(err);
                } else {
                    console.log('数据库连接成功');
                    
                    try {
                        // 先清理数据一致性问题
                        await this.cleanupDatabaseIntegrity();
                        
                        // 启用外键约束
                        this.db.run('PRAGMA foreign_keys = ON', (err) => {
                            if (err) {
                                console.error('启用外键约束失败:', err.message);
                                reject(err);
                            } else {
                                console.log('外键约束已启用');
                                resolve();
                            }
                        });
                    } catch (cleanupErr) {
                        console.error('数据库清理失败:', cleanupErr.message);
                        reject(cleanupErr);
                    }
                }
            });
        });
    }

    // 执行查询
    async query(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    console.error('SQL执行错误:', err.message);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 清理数据库一致性问题
    async cleanupDatabaseIntegrity() {
        return new Promise((resolve, reject) => {
            console.log('开始清理数据库一致性问题...');
            
            // 先禁用外键约束进行清理
            this.db.run('PRAGMA foreign_keys = OFF', (err) => {
                if (err) {
                    console.error('禁用外键约束失败:', err.message);
                    reject(err);
                    return;
                }
                
                // 执行一系列清理操作
                const cleanupOperations = [
                    // 清理answer_records中引用不存在exam_record_id的记录
                    `DELETE FROM answer_records 
                     WHERE exam_record_id NOT IN (SELECT id FROM exam_records WHERE exam_records.id IS NOT NULL)`,
                    
                    // 清理exam_records中引用不存在paper_id的记录
                    `DELETE FROM exam_records 
                     WHERE paper_id IS NOT NULL AND paper_id NOT IN (SELECT id FROM papers WHERE papers.id IS NOT NULL)`,
                     
                    // 清理exam_records中引用不存在schedule_id的记录
                    `DELETE FROM exam_records 
                     WHERE schedule_id IS NOT NULL AND schedule_id NOT IN (SELECT id FROM exam_schedules WHERE exam_schedules.id IS NOT NULL)`,
                     
                    // 清理exam_participants中引用不存在schedule_id的记录
                    `DELETE FROM exam_participants 
                     WHERE schedule_id NOT IN (SELECT id FROM exam_schedules WHERE exam_schedules.id IS NOT NULL)`,
                     
                    // 清理exam_participants中引用不存在exam_record_id的记录
                    `DELETE FROM exam_participants 
                     WHERE exam_record_id IS NOT NULL AND exam_record_id NOT IN (SELECT id FROM exam_records WHERE exam_records.id IS NOT NULL)`,
                     
                    // 清理paper_questions中引用不存在paper_id的记录
                    `DELETE FROM paper_questions 
                     WHERE paper_id NOT IN (SELECT id FROM papers WHERE papers.id IS NOT NULL)`,
                     
                    // 清理paper_questions中引用不存在question_id的记录
                    `DELETE FROM paper_questions 
                     WHERE question_id NOT IN (SELECT id FROM questions WHERE questions.id IS NOT NULL)`
                ];
                
                // 执行所有清理操作
                let completed = 0;
                let hasError = false;
                
                cleanupOperations.forEach((sql, index) => {
                    this.db.run(sql, (cleanupErr, result) => {
                        if (cleanupErr && !hasError) {
                            console.error(`清理操作${index + 1}失败:`, cleanupErr.message);
                            hasError = true;
                            reject(cleanupErr);
                        } else {
                            completed++;
                            console.log(`清理操作${index + 1}完成`);
                            
                            if (completed === cleanupOperations.length && !hasError) {
                                console.log('所有数据库清理操作完成');
                                resolve();
                            }
                        }
                    });
                });
                
                // 如果没有清理操作，直接完成
                if (cleanupOperations.length === 0) {
                    resolve();
                }
            });
        });
    }

    // 执行单行查询
    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    console.error('SQL执行错误:', err.message);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // 执行更新/插入/删除
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    console.error('SQL执行错误:', err.message);
                    reject(err);
                } else {
                    resolve({
                        lastID: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }

    // 关闭数据库连接
    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('关闭数据库连接失败:', err.message);
                } else {
                    console.log('数据库连接已关闭');
                }
            });
        }
    }
}

// 创建数据库实例
const database = new Database();

module.exports = database;
