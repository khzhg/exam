const database = require('../config/database');

class Question {
    // 创建题目
    static async create(questionData) {
        const { type, title, content, options, correct_answer, explanation, difficulty = 1, subject, chapter } = questionData;
        
        const sql = `
            INSERT INTO questions (type, title, content, options, correct_answer, explanation, difficulty, subject, chapter)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await database.run(sql, [
            type, title, content, 
            JSON.stringify(options), 
            correct_answer, explanation, difficulty, subject, chapter
        ]);
        
        return result.lastID;
    }

    // 获取题目列表
    static async getList(page = 1, limit = 10, filters = {}) {
        let whereConditions = [];
        let params = [];
        
        if (filters.type) {
            whereConditions.push('type = ?');
            params.push(filters.type);
        }
        
        if (filters.subject) {
            whereConditions.push('subject LIKE ?');
            params.push(`%${filters.subject}%`);
        }
        
        if (filters.difficulty) {
            whereConditions.push('difficulty = ?');
            params.push(filters.difficulty);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // 获取总数
        const countSql = `SELECT COUNT(*) as total FROM questions ${whereClause}`;
        const countResult = await database.get(countSql, params);
        
        // 获取分页数据
        const offset = (page - 1) * limit;
        const dataSql = `
            SELECT * FROM questions 
            ${whereClause}
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;
        
        const questions = await database.query(dataSql, [...params, limit, offset]);
        
        // 解析options字段
        questions.forEach(question => {
            if (question.options) {
                try {
                    question.options = JSON.parse(question.options);
                } catch (e) {
                    question.options = [];
                }
            }
        });
        
        return {
            total: countResult.total,
            page,
            limit,
            questions
        };
    }

    // 根据ID获取题目
    static async getById(id) {
        const sql = 'SELECT * FROM questions WHERE id = ?';
        const question = await database.get(sql, [id]);
        
        if (question && question.options) {
            try {
                question.options = JSON.parse(question.options);
            } catch (e) {
                question.options = [];
            }
        }
        
        return question;
    }

    // 随机获取题目
    static async getRandomQuestions(count = 10, filters = {}) {
        let whereConditions = [];
        let params = [];
        
        if (filters.type) {
            whereConditions.push('type = ?');
            params.push(filters.type);
        }
        
        if (filters.subject) {
            whereConditions.push('subject LIKE ?');
            params.push(`%${filters.subject}%`);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        const sql = `
            SELECT * FROM questions 
            ${whereClause}
            ORDER BY RANDOM() 
            LIMIT ?
        `;
        
        const questions = await database.query(sql, [...params, count]);
        
        // 解析options字段
        questions.forEach(question => {
            if (question.options) {
                try {
                    question.options = JSON.parse(question.options);
                } catch (e) {
                    question.options = [];
                }
            }
        });
        
        return questions;
    }

    // 更新题目
    static async update(id, questionData) {
        const { title, content, options, correct_answer, explanation, difficulty, subject, chapter } = questionData;
        
        const sql = `
            UPDATE questions 
            SET title = ?, content = ?, options = ?, correct_answer = ?, 
                explanation = ?, difficulty = ?, subject = ?, chapter = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const result = await database.run(sql, [
            title, content, JSON.stringify(options), correct_answer, 
            explanation, difficulty, subject, chapter, id
        ]);
        
        return result.changes > 0;
    }

    // 删除题目
    static async delete(id) {
        // 开始事务，确保所有删除操作的原子性
        await database.run('BEGIN TRANSACTION');
        
        try {
            // 1. 删除相关的错题记录
            await database.run('DELETE FROM wrong_questions WHERE question_id = ?', [id]);
            
            // 2. 删除相关的答题记录
            await database.run('DELETE FROM answer_records WHERE question_id = ?', [id]);
            
            // 3. 删除试卷题目关联（虽然应该已经通过CASCADE删除了，但为了保险起见）
            await database.run('DELETE FROM paper_questions WHERE question_id = ?', [id]);
            
            // 4. 最后删除题目本身
            const result = await database.run('DELETE FROM questions WHERE id = ?', [id]);
            
            // 提交事务
            await database.run('COMMIT');
            
            return result.changes > 0;
        } catch (error) {
            // 回滚事务
            await database.run('ROLLBACK');
            throw error;
        }
    }

    // 批量删除题目
    static async batchDelete(ids) {
        if (!ids || ids.length === 0) {
            return { success: 0, failed: 0, errors: [] };
        }

        const results = { success: 0, failed: 0, errors: [] };
        
        for (const id of ids) {
            try {
                const deleted = await this.delete(id);
                if (deleted) {
                    results.success++;
                } else {
                    results.failed++;
                    results.errors.push(`题目ID ${id} 不存在或删除失败`);
                }
            } catch (error) {
                results.failed++;
                results.errors.push(`删除题目ID ${id} 时发生错误: ${error.message}`);
            }
        }
        
        return results;
    }

    // 批量创建题目(Excel导入)
    static async batchCreate(questionsData) {
        const results = [];
        
        for (const questionData of questionsData) {
            try {
                const id = await this.create(questionData);
                results.push({ success: true, id, data: questionData });
            } catch (error) {
                results.push({ success: false, error: error.message, data: questionData });
            }
        }
        
        return results;
    }

    // 获取科目列表
    static async getSubjects() {
        const sql = 'SELECT DISTINCT subject FROM questions WHERE subject IS NOT NULL ORDER BY subject';
        const result = await database.query(sql);
        return result.map(row => row.subject);
    }

    // 获取题目统计
    static async getStatistics() {
        const sql = `
            SELECT 
                type,
                COUNT(*) as count,
                AVG(difficulty) as avg_difficulty
            FROM questions 
            GROUP BY type
        `;
        
        return await database.query(sql);
    }

    // 统计题目总数
    static async countAll() {
        const sql = 'SELECT COUNT(*) as count FROM questions';
        const result = await database.get(sql);
        return result.count;
    }

    // 按类型统计题目数量
    static async countByType() {
        const sql = `
            SELECT type, COUNT(*) as count 
            FROM questions 
            GROUP BY type
        `;
        return await database.query(sql);
    }
}

module.exports = Question;
