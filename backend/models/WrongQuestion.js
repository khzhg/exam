const database = require('../config/database');

class WrongQuestion {
    // 添加错题
    static async add(userId, questionId) {
        const sql = `
            INSERT OR REPLACE INTO wrong_questions (user_id, question_id, wrong_count, last_wrong_time, is_mastered)
            VALUES (?, ?, 
                COALESCE((SELECT wrong_count FROM wrong_questions WHERE user_id = ? AND question_id = ?), 0) + 1,
                CURRENT_TIMESTAMP, 0)
        `;
        
        const result = await database.run(sql, [userId, questionId, userId, questionId]);
        return result.lastID;
    }

    // 批量添加错题
    static async batchAdd(wrongAnswers) {
        const results = [];
        
        for (const answer of wrongAnswers) {
            try {
                await this.add(answer.user_id, answer.question_id);
                results.push({ success: true, questionId: answer.question_id });
            } catch (error) {
                results.push({ success: false, error: error.message, questionId: answer.question_id });
            }
        }
        
        return results;
    }

    // 获取用户错题列表
    static async getUserWrongQuestions(userId, page = 1, limit = 10, filters = {}) {
        let whereConditions = ['wq.user_id = ?'];
        let params = [userId];
        
        if (filters.subject) {
            whereConditions.push('q.subject LIKE ?');
            params.push(`%${filters.subject}%`);
        }
        
        if (filters.type) {
            whereConditions.push('q.type = ?');
            params.push(filters.type);
        }
        
        if (filters.isMastered !== undefined) {
            whereConditions.push('wq.is_mastered = ?');
            params.push(filters.isMastered ? 1 : 0);
        }
        
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        
        // 获取总数
        const countSql = `
            SELECT COUNT(*) as total 
            FROM wrong_questions wq
            LEFT JOIN questions q ON wq.question_id = q.id
            ${whereClause}
        `;
        const countResult = await database.get(countSql, params);
        
        // 获取分页数据
        const offset = (page - 1) * limit;
        const dataSql = `
            SELECT wq.*, q.type, q.title, q.content, q.options, q.correct_answer, 
                   q.explanation, q.subject, q.difficulty
            FROM wrong_questions wq
            LEFT JOIN questions q ON wq.question_id = q.id
            ${whereClause}
            ORDER BY wq.last_wrong_time DESC
            LIMIT ? OFFSET ?
        `;
        
        const wrongQuestions = await database.query(dataSql, [...params, limit, offset]);
        
        // 解析options字段并添加掌握状态
        wrongQuestions.forEach(question => {
            if (question.options) {
                try {
                    question.options = JSON.parse(question.options);
                } catch (e) {
                    question.options = [];
                }
            }
            
            // 转换掌握状态
            if (question.is_mastered === 1) {
                question.mastery_status = 'mastered';
            } else if (question.wrong_count >= 3) {
                question.mastery_status = 'not_mastered';
            } else {
                question.mastery_status = 'partially_mastered';
            }
            
            // 计算正确率 (这里是模拟数据，实际应该基于练习记录)
            question.correct_rate = Math.max(0, 100 - (question.wrong_count * 20));
            question.practice_count = question.wrong_count + Math.floor(Math.random() * 3);
        });
        
        return {
            total: countResult.total,
            page,
            limit,
            wrongQuestions
        };
    }

    // 标记错题为已掌握
    static async markAsMastered(userId, questionId) {
        const sql = `
            UPDATE wrong_questions 
            SET is_mastered = 1 
            WHERE user_id = ? AND question_id = ?
        `;
        
        const result = await database.run(sql, [userId, questionId]);
        return result.changes > 0;
    }

    // 重置错题掌握状态
    static async resetMastered(userId, questionId) {
        const sql = `
            UPDATE wrong_questions 
            SET is_mastered = 0, last_wrong_time = CURRENT_TIMESTAMP,
                wrong_count = wrong_count + 1
            WHERE user_id = ? AND question_id = ?
        `;
        
        const result = await database.run(sql, [userId, questionId]);
        return result.changes > 0;
    }

    // 删除错题记录
    static async delete(userId, questionId) {
        const sql = 'DELETE FROM wrong_questions WHERE user_id = ? AND question_id = ?';
        const result = await database.run(sql, [userId, questionId]);
        return result.changes > 0;
    }

    // 获取错题统计
    static async getStatistics(userId) {
        const sql = `
            SELECT 
                COUNT(*) as total_wrong,
                COUNT(CASE WHEN is_mastered = 1 THEN 1 END) as mastered_count,
                COUNT(CASE WHEN is_mastered = 0 THEN 1 END) as unmastered_count,
                q.type,
                q.subject
            FROM wrong_questions wq
            LEFT JOIN questions q ON wq.question_id = q.id
            WHERE wq.user_id = ?
            GROUP BY q.type, q.subject
        `;
        
        return await database.query(sql, [userId]);
    }

    // 获取用户错题总数
    static async getUserWrongCount(userId) {
        const sql = `
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN is_mastered = 0 THEN 1 END) as unmastered
            FROM wrong_questions 
            WHERE user_id = ?
        `;
        
        return await database.get(sql, [userId]);
    }

    // 统计用户错题数量
    static async countByUser(userId) {
        const sql = 'SELECT COUNT(*) as count FROM wrong_questions WHERE user_id = ?';
        const result = await database.get(sql, [userId]);
        return result.count;
    }

    // 获取用户错题 (for StudentController)
    static async getByUser(userId, options = {}) {
        const { page = 1, limit = 10, questionType, difficulty, subject, mastery_status } = options;
        let whereConditions = ['wq.user_id = ?'];
        let params = [userId];
        
        if (questionType) {
            whereConditions.push('q.type = ?');
            params.push(questionType);
        }
        
        if (difficulty) {
            whereConditions.push('q.difficulty = ?');
            params.push(difficulty);
        }
        
        if (subject) {
            whereConditions.push('q.subject LIKE ?');
            params.push(`%${subject}%`);
        }
        
        if (mastery_status === 'mastered') {
            whereConditions.push('wq.is_mastered = 1');
        } else if (mastery_status === 'need_review') {
            whereConditions.push('wq.is_mastered = 0');
        }
        
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        const offset = (page - 1) * limit;
        
        // 获取总数
        const countSql = `
            SELECT COUNT(*) as total
            FROM wrong_questions wq
            LEFT JOIN questions q ON wq.question_id = q.id
            ${whereClause}
        `;
        const totalResult = await database.get(countSql, params);
        const total = totalResult.total;
        
        // 获取分页数据
        const sql = `
            SELECT wq.*, q.type, q.title, q.content, q.options, q.correct_answer, 
                   q.explanation, q.subject, q.difficulty,
                   CASE WHEN wq.is_mastered = 1 THEN 'mastered' ELSE 'need_review' END as mastery_status
            FROM wrong_questions wq
            LEFT JOIN questions q ON wq.question_id = q.id
            ${whereClause}
            ORDER BY wq.last_wrong_time DESC
            LIMIT ? OFFSET ?
        `;
        
        const wrongQuestions = await database.query(sql, [...params, limit, offset]);
        
        // 解析options字段
        wrongQuestions.forEach(question => {
            if (question.options) {
                try {
                    question.options = JSON.parse(question.options);
                } catch (e) {
                    question.options = [];
                }
            }
        });
        
        return {
            questions: wrongQuestions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    // 检查是否为错题
    static async isWrongQuestion(userId, questionId) {
        const sql = `
            SELECT COUNT(*) as count 
            FROM wrong_questions 
            WHERE user_id = ? AND question_id = ?
        `;
        
        const result = await database.get(sql, [userId, questionId]);
        return result.count > 0;
    }

    // 获取错题练习题目
    static async getWrongQuestionsForPractice(userId, count = 10, filters = {}) {
        let whereConditions = ['wq.user_id = ?', 'wq.is_mastered = 0'];
        let params = [userId];
        
        if (filters.subject) {
            whereConditions.push('q.subject LIKE ?');
            params.push(`%${filters.subject}%`);
        }
        
        if (filters.type) {
            whereConditions.push('q.type = ?');
            params.push(filters.type);
        }
        
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        
        const sql = `
            SELECT q.*, wq.wrong_count, wq.last_wrong_time
            FROM wrong_questions wq
            LEFT JOIN questions q ON wq.question_id = q.id
            ${whereClause}
            ORDER BY wq.wrong_count DESC, wq.last_wrong_time DESC
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

    // 获取错题详细信息
    static async getDetailById(userId, questionId) {
        const sql = `
            SELECT wq.*, q.type, q.title, q.content, q.options, q.correct_answer, 
                   q.explanation, q.subject, q.difficulty, wq.note
            FROM wrong_questions wq
            LEFT JOIN questions q ON wq.question_id = q.id
            WHERE wq.user_id = ? AND wq.question_id = ?
        `;
        
        const result = await database.get(sql, [userId, questionId]);
        
        if (result && result.options) {
            try {
                result.options = JSON.parse(result.options);
            } catch (e) {
                result.options = [];
            }
        }
        
        return result;
    }

    // 获取错题的练习历史
    static async getPracticeHistory(userId, questionId) {
        // 这里可以从答题记录表获取历史记录
        // 暂时返回模拟数据
        const sql = `
            SELECT ar.*, p.title as paper_title, er.start_time as exam_date
            FROM answer_records ar
            LEFT JOIN exam_records er ON ar.exam_record_id = er.id
            LEFT JOIN papers p ON er.paper_id = p.id
            WHERE er.user_id = ? AND ar.question_id = ? AND ar.is_correct = 0
            ORDER BY er.start_time DESC
            LIMIT 10
        `;
        
        try {
            const history = await database.query(sql, [userId, questionId]);
            return history.map(record => ({
                id: record.id,
                exam_title: record.paper_title || '未知考试',
                date: record.exam_date,
                my_answer: record.answer
            }));
        } catch (error) {
            console.error('获取练习历史失败:', error);
            return [];
        }
    }

    // 保存错题笔记
    static async saveNote(userId, questionId, note) {
        const sql = `
            UPDATE wrong_questions 
            SET note = ? 
            WHERE user_id = ? AND question_id = ?
        `;
        
        const result = await database.run(sql, [note, userId, questionId]);
        return result.changes > 0;
    }
}

module.exports = WrongQuestion;
