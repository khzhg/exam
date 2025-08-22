const database = require('../config/database');

class ExamRecord {
    // 创建考试记录
    static async create(examData) {
        const { user_id, paper_id, type = 'exam', schedule_id, start_time } = examData;
        
        // 如果提供了 start_time，使用它；否则使用当前时间
        const startTimeValue = start_time || new Date().toISOString();
        
        const sql = `
            INSERT INTO exam_records (user_id, paper_id, type, schedule_id, start_time, status)
            VALUES (?, ?, ?, ?, ?, 'ongoing')
        `;
        
        const result = await database.run(sql, [user_id, paper_id, type, schedule_id, startTimeValue]);
        return result.lastID;
    }

    // 根据ID获取考试记录
    static async getById(id) {
        const sql = `
            SELECT er.*, u.username, u.real_name, p.title as paper_title, p.duration as paper_duration, p.total_score as paper_total_score
            FROM exam_records er
            LEFT JOIN users u ON er.user_id = u.id
            LEFT JOIN papers p ON er.paper_id = p.id
            WHERE er.id = ?
        `;
        
        return await database.get(sql, [id]);
    }

    // 获取用户的考试记录
    static async getUserRecords(userId, page = 1, limit = 10, type = null) {
        let whereClause = 'WHERE er.user_id = ?';
        let params = [userId];
        
        if (type) {
            whereClause += ' AND er.type = ?';
            params.push(type);
        }
        
        // 获取总数
        const countSql = `SELECT COUNT(*) as total FROM exam_records er ${whereClause}`;
        const countResult = await database.get(countSql, params);
        
        // 获取分页数据
        const offset = (page - 1) * limit;
        const dataSql = `
            SELECT er.*, p.title as paper_title, p.total_score as paper_total_score, p.subject as paper_subject
            FROM exam_records er
            LEFT JOIN papers p ON er.paper_id = p.id
            ${whereClause}
            ORDER BY er.start_time DESC
            LIMIT ? OFFSET ?
        `;
        
        const records = await database.query(dataSql, [...params, limit, offset]);
        
        return {
            total: countResult.total,
            page,
            limit,
            records
        };
    }

    // 获取所有考试记录(管理员用)
    static async getAllRecords(page = 1, limit = 10, filters = {}) {
        let whereConditions = [];
        let params = [];
        
        if (filters.userId) {
            whereConditions.push('er.user_id = ?');
            params.push(filters.userId);
        }
        
        if (filters.paperId) {
            whereConditions.push('er.paper_id = ?');
            params.push(filters.paperId);
        }
        
        if (filters.type) {
            whereConditions.push('er.type = ?');
            params.push(filters.type);
        }
        
        if (filters.status) {
            whereConditions.push('er.status = ?');
            params.push(filters.status);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // 获取总数
        const countSql = `SELECT COUNT(*) as total FROM exam_records er ${whereClause}`;
        const countResult = await database.get(countSql, params);
        
        // 获取分页数据
        const offset = (page - 1) * limit;
        const dataSql = `
            SELECT er.*, u.username, u.real_name, p.title as paper_title, p.total_score as paper_total_score
            FROM exam_records er
            LEFT JOIN users u ON er.user_id = u.id
            LEFT JOIN papers p ON er.paper_id = p.id
            ${whereClause}
            ORDER BY er.start_time DESC
            LIMIT ? OFFSET ?
        `;
        
        const records = await database.query(dataSql, [...params, limit, offset]);
        
        return {
            total: countResult.total,
            page,
            limit,
            records
        };
    }

    // 完成考试
    static async complete(id, obtainedScore) {
        const sql = `
            UPDATE exam_records 
            SET end_time = CURRENT_TIMESTAMP, 
                duration = (strftime('%s', 'now') - strftime('%s', start_time)),
                obtained_score = ?,
                status = 'completed'
            WHERE id = ? AND status = 'ongoing'
        `;
        
        const result = await database.run(sql, [obtainedScore, id]);
        return result.changes > 0;
    }

    // 超时处理
    static async timeout(id) {
        const sql = `
            UPDATE exam_records 
            SET end_time = CURRENT_TIMESTAMP,
                duration = (strftime('%s', 'now') - strftime('%s', start_time)),
                status = 'timeout'
            WHERE id = ? AND status = 'ongoing'
        `;
        
        const result = await database.run(sql, [id]);
        return result.changes > 0;
    }

    // 检查是否可以开始考试
    static async canStartExam(userId, paperId, type = 'exam') {
        if (type === 'practice') {
            return true; // 练习模式可以重复
        }
        
        // 正式考试检查是否已经参加过
        const sql = `
            SELECT COUNT(*) as count 
            FROM exam_records 
            WHERE user_id = ? AND paper_id = ? AND type = 'exam' AND status IN ('completed', 'timeout')
        `;
        
        const result = await database.get(sql, [userId, paperId]);
        return result.count === 0;
    }

    // 获取正在进行的考试
    static async getOngoingExam(userId, paperId = null) {
        let sql = `
            SELECT er.*, p.title as paper_title, p.duration as paper_duration
            FROM exam_records er
            LEFT JOIN papers p ON er.paper_id = p.id
            WHERE er.user_id = ? AND er.status = 'ongoing'
        `;
        let params = [userId];
        
        if (paperId) {
            sql += ' AND er.paper_id = ?';
            params.push(paperId);
        }
        
        sql += ' ORDER BY er.start_time DESC LIMIT 1';
        
        return await database.get(sql, params);
    }

    // 获取考试统计
    static async getStatistics(filters = {}) {
        let whereConditions = [];
        let params = [];
        
        if (filters.paperId) {
            whereConditions.push('er.paper_id = ?');
            params.push(filters.paperId);
        }
        
        if (filters.startDate) {
            whereConditions.push('er.start_time >= ?');
            params.push(filters.startDate);
        }
        
        if (filters.endDate) {
            whereConditions.push('er.start_time <= ?');
            params.push(filters.endDate);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        const sql = `
            SELECT 
                COUNT(*) as total_exams,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_exams,
                COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timeout_exams,
                COUNT(CASE WHEN status = 'ongoing' THEN 1 END) as ongoing_exams,
                AVG(CASE WHEN status = 'completed' THEN obtained_score END) as avg_score,
                MAX(obtained_score) as max_score,
                MIN(obtained_score) as min_score
            FROM exam_records er
            ${whereClause}
        `;
        
        return await database.get(sql, params);
    }

    // 统计用户考试总数
    static async countByUser(userId) {
        const sql = 'SELECT COUNT(*) as count FROM exam_records WHERE user_id = ?';
        const result = await database.get(sql, [userId]);
        return result.count;
    }

    // 统计用户已完成考试数
    static async countCompletedByUser(userId) {
        const sql = 'SELECT COUNT(*) as count FROM exam_records WHERE user_id = ? AND status = "completed"';
        const result = await database.get(sql, [userId]);
        return result.count;
    }

    // 获取用户平均分
    static async getAverageScoreByUser(userId) {
        const sql = 'SELECT AVG(obtained_score) as avg_score FROM exam_records WHERE user_id = ? AND status = "completed"';
        const result = await database.get(sql, [userId]);
        return result.avg_score;
    }

    // 获取用户最近考试
    static async getRecentByUser(userId, limit = 5) {
        const sql = `
            SELECT er.*, p.title as paper_title
            FROM exam_records er
            LEFT JOIN papers p ON er.paper_id = p.id
            WHERE er.user_id = ?
            ORDER BY er.start_time DESC
            LIMIT ?
        `;
        return await database.query(sql, [userId, limit]);
    }

    // 获取用户考试列表
    static async getByUser(userId, options = {}) {
        const { page = 1, limit = 10, status } = options;
        let whereClause = 'WHERE er.user_id = ?';
        let params = [userId];
        
        if (status) {
            whereClause += ' AND er.status = ?';
            params.push(status);
        }
        
        const offset = (page - 1) * limit;
        const sql = `
            SELECT er.*, p.title as paper_title
            FROM exam_records er
            LEFT JOIN papers p ON er.paper_id = p.id
            ${whereClause}
            ORDER BY er.start_time DESC
            LIMIT ? OFFSET ?
        `;
        
        return await database.query(sql, [...params, limit, offset]);
    }

    // 获取用户考试结果
    static async getResultsByUser(userId, options = {}) {
        const { page = 1, limit = 10 } = options;
        const offset = (page - 1) * limit;
        
        // 获取总数
        const countSql = `
            SELECT COUNT(*) as total
            FROM exam_records er
            WHERE er.user_id = ? AND er.status = 'completed'
        `;
        const totalResult = await database.get(countSql, [userId]);
        const total = totalResult.total;
        
        // 获取分页数据
        const sql = `
            SELECT er.*, p.title as paper_title, p.total_score as paper_total_score
            FROM exam_records er
            LEFT JOIN papers p ON er.paper_id = p.id
            WHERE er.user_id = ? AND er.status = 'completed'
            ORDER BY er.start_time DESC
            LIMIT ? OFFSET ?
        `;
        
        const results = await database.query(sql, [userId, limit, offset]);
        
        return {
            results,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        };
    }

    // 统计所有考试数量
    static async countAll() {
        const sql = 'SELECT COUNT(*) as count FROM exam_records';
        const result = await database.get(sql);
        return result.count;
    }

    // 统计已完成考试数量
    static async countCompleted() {
        const sql = 'SELECT COUNT(*) as count FROM exam_records WHERE status = "completed"';
        const result = await database.get(sql);
        return result.count;
    }

    // 获取全局平均分
    static async getGlobalAverageScore() {
        const sql = 'SELECT AVG(obtained_score) as avg_score FROM exam_records WHERE status = "completed"';
        const result = await database.get(sql);
        return result.avg_score;
    }

    // 统计今日考试数量
    static async countToday() {
        const sql = `
            SELECT COUNT(*) as count 
            FROM exam_records 
            WHERE DATE(start_time) = DATE('now')
        `;
        const result = await database.get(sql);
        return result.count;
    }

    // 获取成绩统计
    static async getScoreStatistics(filters = {}) {
        let whereConditions = [];
        let params = [];
        
        if (filters.paperId) {
            whereConditions.push('er.paper_id = ?');
            params.push(filters.paperId);
        }
        
        if (filters.startDate) {
            whereConditions.push('er.start_time >= ?');
            params.push(filters.startDate);
        }
        
        if (filters.endDate) {
            whereConditions.push('er.start_time <= ?');
            params.push(filters.endDate);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')} AND` : 'WHERE';
        
        const sql = `
            SELECT 
                COUNT(*) as total_count,
                AVG(obtained_score) as avg_score,
                MAX(obtained_score) as max_score,
                MIN(obtained_score) as min_score,
                COUNT(CASE WHEN obtained_score >= 90 THEN 1 END) as excellent,
                COUNT(CASE WHEN obtained_score >= 80 AND obtained_score < 90 THEN 1 END) as good,
                COUNT(CASE WHEN obtained_score >= 70 AND obtained_score < 80 THEN 1 END) as fair,
                COUNT(CASE WHEN obtained_score >= 60 AND obtained_score < 70 THEN 1 END) as pass,
                COUNT(CASE WHEN obtained_score < 60 THEN 1 END) as fail
            FROM exam_records er
            ${whereClause} er.status = 'completed'
        `;
        
        return await database.get(sql, params);
    }

    // 获取学生详细考试记录
    static async getDetailsByUser(filters = {}) {
        let whereConditions = ['er.user_id = ?'];
        let params = [filters.userId];
        
        if (filters.startDate) {
            whereConditions.push('er.start_time >= ?');
            params.push(filters.startDate);
        }
        
        if (filters.endDate) {
            whereConditions.push('er.start_time <= ?');
            params.push(filters.endDate);
        }
        
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        
        const sql = `
            SELECT er.*, p.title as paper_title, p.total_score as paper_total_score,
                   p.subject as paper_subject, p.duration as paper_duration
            FROM exam_records er
            LEFT JOIN papers p ON er.paper_id = p.id
            ${whereClause}
            ORDER BY er.start_time DESC
        `;
        
        return await database.query(sql, params);
    }

    // 获取学生统计信息
    static async getStatisticsByUser(userId, filters = {}) {
        let whereConditions = ['er.user_id = ?', 'er.status = "completed"'];
        let params = [userId];
        
        if (filters.startDate) {
            whereConditions.push('er.start_time >= ?');
            params.push(filters.startDate);
        }
        
        if (filters.endDate) {
            whereConditions.push('er.start_time <= ?');
            params.push(filters.endDate);
        }
        
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        
        const sql = `
            SELECT 
                COUNT(*) as total_exams,
                AVG(obtained_score) as avg_score,
                MAX(obtained_score) as max_score,
                MIN(obtained_score) as min_score,
                COUNT(CASE WHEN obtained_score >= 60 THEN 1 END) as pass_count,
                COUNT(CASE WHEN obtained_score >= 90 THEN 1 END) as excellent_count,
                AVG(duration) as avg_duration
            FROM exam_records er
            ${whereClause}
        `;
        
        return await database.get(sql, params);
    }

    // 获取考试详细记录（按试卷）
    static async getDetailsByPaper(filters = {}) {
        let whereConditions = ['er.paper_id = ?'];
        let params = [filters.paperId];
        
        if (filters.startDate) {
            whereConditions.push('er.start_time >= ?');
            params.push(filters.startDate);
        }
        
        if (filters.endDate) {
            whereConditions.push('er.start_time <= ?');
            params.push(filters.endDate);
        }
        
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        
        const sql = `
            SELECT er.*, u.username, u.real_name, u.email
            FROM exam_records er
            LEFT JOIN users u ON er.user_id = u.id
            ${whereClause}
            ORDER BY er.start_time DESC
        `;
        
        return await database.query(sql, params);
    }

    // 获取考试统计信息（按试卷）
    static async getStatisticsByPaper(paperId, filters = {}) {
        let whereConditions = ['er.paper_id = ?', 'er.status = "completed"'];
        let params = [paperId];
        
        if (filters.startDate) {
            whereConditions.push('er.start_time >= ?');
            params.push(filters.startDate);
        }
        
        if (filters.endDate) {
            whereConditions.push('er.start_time <= ?');
            params.push(filters.endDate);
        }
        
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        
        const sql = `
            SELECT 
                COUNT(*) as total_participants,
                COUNT(DISTINCT er.user_id) as unique_participants,
                AVG(obtained_score) as avg_score,
                MAX(obtained_score) as max_score,
                MIN(obtained_score) as min_score,
                COUNT(CASE WHEN obtained_score >= 60 THEN 1 END) as pass_count,
                COUNT(CASE WHEN obtained_score >= 90 THEN 1 END) as excellent_count,
                AVG(duration) as avg_duration,
                MAX(duration) as max_duration,
                MIN(duration) as min_duration
            FROM exam_records er
            ${whereClause}
        `;
        
        return await database.get(sql, params);
    }

    // 获取分数分布
    static async getScoreDistribution(filters = {}) {
        let whereConditions = ['er.status = "completed"'];
        let params = [];
        
        if (filters.paperId) {
            whereConditions.push('er.paper_id = ?');
            params.push(filters.paperId);
        }
        
        if (filters.startDate) {
            whereConditions.push('er.start_time >= ?');
            params.push(filters.startDate);
        }
        
        if (filters.endDate) {
            whereConditions.push('er.start_time <= ?');
            params.push(filters.endDate);
        }
        
        const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
        
        const sql = `
            SELECT 
                CASE 
                    WHEN obtained_score >= 90 THEN '90-100'
                    WHEN obtained_score >= 80 THEN '80-89'
                    WHEN obtained_score >= 70 THEN '70-79'
                    WHEN obtained_score >= 60 THEN '60-69'
                    ELSE '0-59'
                END as score_range,
                COUNT(*) as count
            FROM exam_records er
            ${whereClause}
            GROUP BY 
                CASE 
                    WHEN obtained_score >= 90 THEN '90-100'
                    WHEN obtained_score >= 80 THEN '80-89'
                    WHEN obtained_score >= 70 THEN '70-79'
                    WHEN obtained_score >= 60 THEN '60-69'
                    ELSE '0-59'
                END
            ORDER BY score_range DESC
        `;
        
        return await database.query(sql, params);
    }

    // 获取题目答题统计
    static async getQuestionAnswerStats(filters = {}) {
        // 注意：这个方法需要answer_records表，如果没有这个表，返回模拟数据
        try {
            // 检查是否有 answer_records 表
            const tableExists = await database.get("SELECT name FROM sqlite_master WHERE type='table' AND name='answer_records'");
            
            if (!tableExists) {
                throw new Error('answer_records table does not exist');
            }
            
            let whereConditions = ['ar.question_id = ?'];
            let params = [filters.questionId];
            
            if (filters.startDate) {
                whereConditions.push('er.start_time >= ?');
                params.push(filters.startDate);
            }
            
            if (filters.endDate) {
                whereConditions.push('er.start_time <= ?');
                params.push(filters.endDate);
            }
            
            const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
            
            const sql = `
                SELECT 
                    COUNT(*) as total_answers,
                    COUNT(CASE WHEN ar.is_correct = 1 THEN 1 END) as correct_answers,
                    0 as avg_time,
                    ar.user_answer as selected_answer,
                    COUNT(*) as answer_count
                FROM answer_records ar
                LEFT JOIN exam_records er ON ar.exam_record_id = er.id
                ${whereClause}
                GROUP BY ar.user_answer
                ORDER BY answer_count DESC
            `;
            
            return await database.query(sql, params);
        } catch (error) {
            console.error('获取题目答题统计失败:', error);
            throw error;
        }
    }

    // 获取题目错误答案分析
    static async getQuestionWrongAnswers(filters = {}) {
        // 注意：这个方法需要answer_records表，如果没有这个表，返回模拟数据
        try {
            // 检查是否有 answer_records 表
            const tableExists = await database.get("SELECT name FROM sqlite_master WHERE type='table' AND name='answer_records'");
            
            if (!tableExists) {
                throw new Error('answer_records table does not exist');
            }
            
            let whereConditions = ['ar.question_id = ?', 'ar.is_correct = 0'];
            let params = [filters.questionId];
            
            if (filters.startDate) {
                whereConditions.push('er.start_time >= ?');
                params.push(filters.startDate);
            }
            
            if (filters.endDate) {
                whereConditions.push('er.start_time <= ?');
                params.push(filters.endDate);
            }
            
            const whereClause = `WHERE ${whereConditions.join(' AND ')}`;
            
            const sql = `
                SELECT 
                    ar.user_answer as selected_answer,
                    COUNT(*) as count,
                    u.real_name,
                    u.username,
                    er.start_time
                FROM answer_records ar
                LEFT JOIN exam_records er ON ar.exam_record_id = er.id
                LEFT JOIN users u ON er.user_id = u.id
                ${whereClause}
                GROUP BY ar.user_answer, u.id, er.id
                ORDER BY count DESC, er.start_time DESC
                LIMIT 50
            `;
            
            return await database.query(sql, params);
        } catch (error) {
            console.error('获取题目错误答案分析失败:', error);
            throw error;
        }
    }
}

module.exports = ExamRecord;
