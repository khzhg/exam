const database = require('../config/database');

class Paper {
    // 创建试卷
    static async create(paperData) {
        const { 
            title, 
            subject, 
            description, 
            duration = 60, 
            total_score = 100, 
            pass_score = 60, 
            created_by,
            paper_type = 'both',
            exam_visible_time = null,
            practice_visible = 1
        } = paperData;
        
        const sql = `
            INSERT INTO papers (
                title, subject, description, duration, total_score, pass_score, 
                created_by, paper_type, exam_visible_time, practice_visible
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await database.run(sql, [
            title, subject, description, duration, total_score, pass_score, 
            created_by, paper_type, exam_visible_time, practice_visible
        ]);
        return result.lastID;
    }

    // 获取试卷列表
    static async getList(page = 1, limit = 10, isActive = null) {
        let whereClause = '';
        let params = [];
        
        if (isActive !== null) {
            whereClause = 'WHERE p.is_active = ?';
            params.push(isActive ? 1 : 0);
        }
        
        // 获取总数
        const countSql = `SELECT COUNT(*) as total FROM papers p ${whereClause}`;
        const countResult = await database.get(countSql, params);
        
        // 获取分页数据
        const offset = (page - 1) * limit;
        const dataSql = `
            SELECT p.*, u.real_name as creator_name,
                   COUNT(pq.id) as question_count
            FROM papers p
            LEFT JOIN users u ON p.created_by = u.id
            LEFT JOIN paper_questions pq ON p.id = pq.paper_id
            ${whereClause}
            GROUP BY p.id
            ORDER BY p.created_at DESC 
            LIMIT ? OFFSET ?
        `;
        
        const papers = await database.query(dataSql, [...params, limit, offset]);
        
        return {
            total: countResult.total,
            page,
            limit,
            papers
        };
    }

    // 根据ID获取试卷
    static async getById(id) {
        const sql = `
            SELECT p.*, u.real_name as creator_name
            FROM papers p
            LEFT JOIN users u ON p.created_by = u.id
            WHERE p.id = ?
        `;
        
        return await database.get(sql, [id]);
    }

    // 获取试卷题目
    static async getQuestions(paperId) {
        const sql = `
            SELECT q.*, pq.score, pq.sort_order
            FROM questions q
            INNER JOIN paper_questions pq ON q.id = pq.question_id
            WHERE pq.paper_id = ?
            ORDER BY pq.sort_order ASC, pq.id ASC
        `;
        
        const questions = await database.query(sql, [paperId]);
        
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

    // 添加题目到试卷
    static async addQuestion(paperId, questionId, score = 5, sortOrder = 0) {
        const sql = `
            INSERT INTO paper_questions (paper_id, question_id, score, sort_order)
            VALUES (?, ?, ?, ?)
        `;
        
        const result = await database.run(sql, [paperId, questionId, score, sortOrder]);
        return result.lastID;
    }

    // 批量添加题目到试卷
    static async addQuestions(paperId, questions) {
        const results = [];
        
        for (let i = 0; i < questions.length; i++) {
            const { questionId, score = 5 } = questions[i];
            try {
                const id = await this.addQuestion(paperId, questionId, score, i + 1);
                results.push({ success: true, id });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        
        return results;
    }

    // 从试卷中移除题目
    static async removeQuestion(paperId, questionId) {
        const sql = 'DELETE FROM paper_questions WHERE paper_id = ? AND question_id = ?';
        const result = await database.run(sql, [paperId, questionId]);
        return result.changes > 0;
    }

    // 清空试卷的所有题目
    static async clearQuestions(paperId) {
        const sql = 'DELETE FROM paper_questions WHERE paper_id = ?';
        const result = await database.run(sql, [paperId]);
        return result.changes;
    }

    // 更新试卷
    static async update(id, paperData) {
        const { 
            title, 
            subject, 
            description, 
            duration, 
            total_score, 
            pass_score, 
            is_active,
            paper_type,
            exam_visible_time,
            practice_visible
        } = paperData;
        
        const sql = `
            UPDATE papers 
            SET title = ?, subject = ?, description = ?, duration = ?, total_score = ?, 
                pass_score = ?, is_active = ?, paper_type = ?, exam_visible_time = ?, 
                practice_visible = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const result = await database.run(sql, [
            title, subject, description, duration, total_score, pass_score, is_active,
            paper_type, exam_visible_time, practice_visible, id
        ]);
        return result.changes > 0;
    }

    // 更新试卷状态
    static async updateStatus(id, isActive) {
        const sql = `
            UPDATE papers 
            SET is_active = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const result = await database.run(sql, [isActive ? 1 : 0, id]);
        return result.changes > 0;
    }

    // 删除试卷
    static async delete(id, force = false) {
        try {
            console.log('开始删除试卷，ID:', id, 'force:', force);
            
            // 检查试卷是否存在
            const existPaper = await this.getById(id);
            if (!existPaper) {
                throw new Error('试卷不存在');
            }
            console.log('找到试卷:', existPaper.title);
            
            if (force) {
                // 强制删除模式：先删除所有相关记录
                console.log('执行强制删除模式...');
                
                // 临时禁用外键约束
                await database.run('PRAGMA foreign_keys = OFF');
                console.log('已禁用外键约束进行强制删除');
                
                try {
                    // 1. 删除考试参与者记录
                    const deleteParticipantsResult = await database.run(`
                        DELETE FROM exam_participants 
                        WHERE schedule_id IN (
                            SELECT id FROM exam_schedules WHERE paper_id = ?
                        )
                    `, [id]);
                    console.log('删除考试参与者记录数量:', deleteParticipantsResult.changes);
                    
                    // 2. 删除所有相关的答案记录
                    const deleteAnswersResult = await database.run(`
                        DELETE FROM answer_records 
                        WHERE exam_record_id IN (
                            SELECT id FROM exam_records WHERE paper_id = ?
                        )
                    `, [id]);
                    console.log('删除答案记录数量:', deleteAnswersResult.changes);
                    
                    // 3. 删除所有相关的考试记录
                    const deleteExamRecordsResult = await database.run('DELETE FROM exam_records WHERE paper_id = ?', [id]);
                    console.log('删除考试记录数量:', deleteExamRecordsResult.changes);
                    
                    // 4. 删除所有相关的考试安排
                    const deleteExamSchedulesResult = await database.run('DELETE FROM exam_schedules WHERE paper_id = ?', [id]);
                    console.log('删除考试安排数量:', deleteExamSchedulesResult.changes);
                    
                    // 5. 删除关联的题目
                    const deleteQuestionsResult = await database.run('DELETE FROM paper_questions WHERE paper_id = ?', [id]);
                    console.log('删除关联题目数量:', deleteQuestionsResult.changes);
                    
                    // 6. 最后删除试卷
                    const sql = 'DELETE FROM papers WHERE id = ?';
                    const result = await database.run(sql, [id]);
                    console.log('删除试卷结果 - changes:', result.changes);
                    
                    if (result.changes === 0) {
                        throw new Error('试卷删除失败，可能已被其他操作删除');
                    }
                    
                    console.log('强制删除试卷成功');
                    return true;
                } finally {
                    // 重新启用外键约束
                    await database.run('PRAGMA foreign_keys = ON');
                    console.log('已重新启用外键约束');
                }
            } else {
                // 正常删除模式：先检查依赖关系
                
                // 检查是否有相关的考试记录
                const examRecordsSql = 'SELECT COUNT(*) as count FROM exam_records WHERE paper_id = ?';
                const examRecordsResult = await database.get(examRecordsSql, [id]);
                console.log('相关考试记录数量:', examRecordsResult.count);
                
                if (examRecordsResult.count > 0) {
                    throw new Error('无法删除试卷：该试卷存在考试记录，请先处理相关考试记录或使用强制删除');
                }
                
                // 检查是否有相关的考试安排
                const examSchedulesSql = 'SELECT COUNT(*) as count FROM exam_schedules WHERE paper_id = ?';
                const examSchedulesResult = await database.get(examSchedulesSql, [id]);
                console.log('相关考试安排数量:', examSchedulesResult.count);
                
                if (examSchedulesResult.count > 0) {
                    throw new Error('无法删除试卷：该试卷存在考试安排，请先删除相关考试安排或使用强制删除');
                }
                
                // 先删除关联的题目
                const deleteQuestionsResult = await database.run('DELETE FROM paper_questions WHERE paper_id = ?', [id]);
                console.log('删除关联题目数量:', deleteQuestionsResult.changes);
                
                // 再删除试卷
                const sql = 'DELETE FROM papers WHERE id = ?';
                const result = await database.run(sql, [id]);
                console.log('删除试卷结果 - changes:', result.changes);
                
                if (result.changes === 0) {
                    throw new Error('试卷删除失败，可能已被其他操作删除');
                }
                
                console.log('试卷删除成功');
                return true;
            }
            
        } catch (error) {
            console.error('Delete paper error:', error);
            throw error;
        }
    }

    // 获取可用的试卷(供学生考试使用)
    static async getActivePapers() {
        const sql = `
            SELECT p.id, p.title, p.description, p.duration, p.total_score, p.pass_score,
                   COUNT(pq.id) as question_count
            FROM papers p
            LEFT JOIN paper_questions pq ON p.id = pq.paper_id
            WHERE p.is_active = 1
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `;
        
        return await database.query(sql);
    }

    // 更新试卷题目分数
    static async updateQuestionScore(paperId, questionId, score) {
        const sql = `
            UPDATE paper_questions 
            SET score = ? 
            WHERE paper_id = ? AND question_id = ?
        `;
        
        const result = await database.run(sql, [score, paperId, questionId]);
        return result.changes > 0;
    }

    // 统计试卷总数
    static async countAll() {
        const sql = 'SELECT COUNT(*) as count FROM papers WHERE is_active = 1';
        const result = await database.get(sql);
        return result.count;
    }

    // 获取适用于练习的试卷列表
    static async getPracticeList(page = 1, limit = 10) {
        // 获取总数
        const countSql = `
            SELECT COUNT(*) as total 
            FROM papers p 
            WHERE p.is_active = 1 
            AND (p.paper_type = 'practice' OR p.paper_type = 'both')
            AND p.practice_visible = 1
        `;
        const countResult = await database.get(countSql);
        
        // 获取分页数据
        const offset = (page - 1) * limit;
        const dataSql = `
            SELECT p.*, u.real_name as creator_name,
                   COUNT(pq.id) as question_count
            FROM papers p
            LEFT JOIN users u ON p.created_by = u.id
            LEFT JOIN paper_questions pq ON p.id = pq.paper_id
            WHERE p.is_active = 1 
            AND (p.paper_type = 'practice' OR p.paper_type = 'both')
            AND p.practice_visible = 1
            GROUP BY p.id
            ORDER BY p.created_at DESC 
            LIMIT ? OFFSET ?
        `;
        
        const papers = await database.query(dataSql, [limit, offset]);
        
        return {
            total: countResult.total,
            page,
            limit,
            papers
        };
    }

    // 获取适用于考试的试卷列表
    static async getExamList(page = 1, limit = 10, includeScheduled = false) {
        let whereConditions = [
            'p.is_active = 1',
            "(p.paper_type = 'exam' OR p.paper_type = 'both')"
        ];
        
        // 如果不包括已安排的考试，添加时间条件
        if (!includeScheduled) {
            whereConditions.push(`
                (p.exam_visible_time IS NULL OR p.exam_visible_time <= datetime('now'))
            `);
        }
        
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        
        // 获取总数
        const countSql = `
            SELECT COUNT(*) as total 
            FROM papers p 
            ${whereClause}
        `;
        const countResult = await database.get(countSql);
        
        // 获取分页数据
        const offset = (page - 1) * limit;
        const dataSql = `
            SELECT p.*, u.real_name as creator_name,
                   COUNT(pq.id) as question_count
            FROM papers p
            LEFT JOIN users u ON p.created_by = u.id
            LEFT JOIN paper_questions pq ON p.id = pq.paper_id
            ${whereClause}
            GROUP BY p.id
            ORDER BY p.created_at DESC 
            LIMIT ? OFFSET ?
        `;
        
        const papers = await database.query(dataSql, [limit, offset]);
        
        return {
            total: countResult.total,
            page,
            limit,
            papers
        };
    }
}

module.exports = Paper;
