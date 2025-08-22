const database = require('../config/database');

class ExamSchedule {
    // 创建考试安排
    static async create(scheduleData) {
        const { 
            title, 
            description, 
            paper_id, 
            start_time, 
            end_time, 
            created_by, 
            participant_type = 'all',
            participants = [],
            settings = {}
        } = scheduleData;
        
        const sql = `
            INSERT INTO exam_schedules (
                title, description, paper_id, start_time, end_time, 
                created_by, participant_type, participants, settings
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const result = await database.run(sql, [
            title, 
            description, 
            paper_id, 
            start_time, 
            end_time, 
            created_by,
            participant_type,
            JSON.stringify(participants),
            JSON.stringify(settings)
            // 注意：数据库默认状态为 'pending'，不需要显式设置
        ]);
        
        const scheduleId = result.lastID;
        
        // 如果是指定参与者，创建参与者记录
        if (participant_type === 'selected' && participants.length > 0) {
            await this.addParticipants(scheduleId, participants);
        } else if (participant_type === 'all') {
            // 如果是全部学生，获取所有学生并添加
            const allStudents = await this.getAllStudents();
            const studentIds = allStudents.map(s => s.id);
            await this.addParticipants(scheduleId, studentIds);
        }
        
        return scheduleId;
    }
    
    // 获取所有学生
    static async getAllStudents() {
        const sql = "SELECT id FROM users WHERE role = 'student'";
        return await database.query(sql);
    }
    
    // 添加参与者
    static async addParticipants(scheduleId, userIds) {
        const sql = "INSERT INTO exam_participants (schedule_id, user_id) VALUES (?, ?)";
        const promises = userIds.map(userId => 
            database.run(sql, [scheduleId, userId])
        );
        await Promise.all(promises);
    }
    
    // 获取考试安排列表
    static async getList(page = 1, limit = 10, filters = {}) {
        let whereConditions = [];
        let params = [];
        
        if (filters.title) {
            whereConditions.push('es.title LIKE ?');
            params.push(`%${filters.title}%`);
        }
        
        if (filters.status) {
            whereConditions.push('es.status = ?');
            params.push(filters.status);
        }
        
        if (filters.startDate) {
            whereConditions.push('es.start_time >= ?');
            params.push(filters.startDate);
        }
        
        if (filters.endDate) {
            whereConditions.push('es.end_time <= ?');
            params.push(filters.endDate);
        }
        
        const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
        
        // 获取总数
        const countSql = `SELECT COUNT(*) as total FROM exam_schedules es ${whereClause}`;
        const countResult = await database.get(countSql, params);
        
        // 获取分页数据
        const offset = (page - 1) * limit;
        const dataSql = `
            SELECT es.*, 
                   p.title as paper_title,
                   u.real_name as creator_name,
                   COUNT(ep.id) as participant_count
            FROM exam_schedules es
            LEFT JOIN papers p ON es.paper_id = p.id
            LEFT JOIN users u ON es.created_by = u.id
            LEFT JOIN exam_participants ep ON es.id = ep.schedule_id
            ${whereClause}
            GROUP BY es.id
            ORDER BY es.created_at DESC
            LIMIT ? OFFSET ?
        `;
        
        const schedules = await database.query(dataSql, [...params, limit, offset]);
        
        // 解析JSON字段并计算实际状态
        schedules.forEach(schedule => {
            try {
                schedule.participants = JSON.parse(schedule.participants || '[]');
                schedule.settings = JSON.parse(schedule.settings || '{}');
            } catch (e) {
                schedule.participants = [];
                schedule.settings = {};
            }
            
            // 计算实际考试状态
            schedule.actual_status = ExamSchedule.calculateActualStatus(schedule);
        });
        
        return {
            total: countResult.total,
            page,
            limit,
            schedules
        };
    }
    
    // 根据ID获取考试安排
    static async getById(id) {
        const sql = `
            SELECT es.*, 
                   p.title as paper_title, p.duration as paper_duration,
                   u.real_name as creator_name
            FROM exam_schedules es
            LEFT JOIN papers p ON es.paper_id = p.id
            LEFT JOIN users u ON es.created_by = u.id
            WHERE es.id = ?
        `;
        
        const schedule = await database.get(sql, [id]);
        if (schedule) {
            // 解析JSON字段
            try {
                schedule.participants = JSON.parse(schedule.participants || '[]');
                schedule.settings = JSON.parse(schedule.settings || '{}');
            } catch (e) {
                schedule.participants = [];
                schedule.settings = {};
            }
        }
        
        return schedule;
    }
    
    // 获取学生的考试安排
    static async getStudentSchedules(userId, page = 1, limit = 10) {
        const offset = (page - 1) * limit;
        const sql = `
            SELECT es.*, 
                   p.title as paper_title, p.duration as paper_duration,
                   ep.status as participation_status,
                   ep.exam_record_id,
                   er.status as exam_record_status,
                   er.end_time as exam_end_time
            FROM exam_schedules es
            INNER JOIN exam_participants ep ON es.id = ep.schedule_id
            LEFT JOIN papers p ON es.paper_id = p.id
            LEFT JOIN exam_records er ON ep.exam_record_id = er.id
            WHERE ep.user_id = ? AND es.status != 'cancelled'
            ORDER BY es.start_time ASC
            LIMIT ? OFFSET ?
        `;
        
        const schedules = await database.query(sql, [userId, limit, offset]);
        
        // 解析JSON字段并计算状态
        schedules.forEach(schedule => {
            try {
                schedule.settings = JSON.parse(schedule.settings || '{}');
            } catch (e) {
                schedule.settings = {};
            }
            
            // 计算考试状态
            const now = new Date();
            const startTime = new Date(schedule.start_time);
            const endTime = new Date(schedule.end_time);
            
            // 如果有考试记录，优先使用考试记录状态
            if (schedule.exam_record_id && schedule.exam_record_status) {
                if (schedule.exam_record_status === 'completed' || schedule.exam_record_status === 'timeout') {
                    schedule.exam_status = 'completed';
                } else if (schedule.exam_record_status === 'ongoing') {
                    // 检查是否超时
                    if (now > endTime) {
                        schedule.exam_status = 'completed'; // 超时也视为已完成
                    } else {
                        schedule.exam_status = 'in_progress';
                    }
                } else {
                    schedule.exam_status = 'available';
                }
            } else {
                // 没有考试记录，根据时间和参与状态判断
                if (now < startTime) {
                    schedule.exam_status = 'not_started';
                } else if (now > endTime) {
                    schedule.exam_status = 'expired';
                } else if (schedule.participation_status === 'completed') {
                    schedule.exam_status = 'completed';
                } else {
                    schedule.exam_status = 'available';
                }
            }
        });
        
        return schedules;
    }
    
    // 更新考试安排
    static async update(id, scheduleData) {
        const { 
            title, 
            description, 
            start_time, 
            end_time, 
            participant_type,
            participants = [],
            settings = {}
        } = scheduleData;
        
        const sql = `
            UPDATE exam_schedules 
            SET title = ?, description = ?, start_time = ?, end_time = ?, 
                participant_type = ?, participants = ?, settings = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        
        const result = await database.run(sql, [
            title, 
            description, 
            start_time, 
            end_time, 
            participant_type,
            JSON.stringify(participants),
            JSON.stringify(settings),
            id
        ]);
        
        return result.changes > 0;
    }
    
    // 删除考试安排
    static async delete(id) {
        try {
            console.log('开始删除考试安排，ID:', id);
            
            // 先查询所有相关的考试记录ID
            const examRecords = await database.query(
                'SELECT id FROM exam_records WHERE schedule_id = ?', 
                [id]
            );
            const examRecordIds = examRecords.map(record => record.id);
            
            console.log('找到相关考试记录:', examRecordIds);
            
            // 1. 删除答案记录（按考试记录ID逐个删除）
            if (examRecordIds.length > 0) {
                console.log('删除答案记录...');
                for (const recordId of examRecordIds) {
                    await database.run('DELETE FROM answer_records WHERE exam_record_id = ?', [recordId]);
                }
            }
            
            // 2. 清除参与者表中的exam_record_id引用
            console.log('清除参与者表中的考试记录引用...');
            await database.run('UPDATE exam_participants SET exam_record_id = NULL WHERE schedule_id = ?', [id]);
            
            // 3. 删除考试记录
            console.log('删除考试记录...');
            await database.run('DELETE FROM exam_records WHERE schedule_id = ?', [id]);
            
            // 4. 删除参与者记录
            console.log('删除参与者记录...');
            await database.run('DELETE FROM exam_participants WHERE schedule_id = ?', [id]);
            
            // 4. 最后删除考试安排
            console.log('删除考试安排...');
            const result = await database.run('DELETE FROM exam_schedules WHERE id = ?', [id]);
            
            console.log('删除操作完成，影响行数:', result.changes);
            
            // 验证删除是否完整
            await this.verifyDeletion(id, examRecordIds);
            
            return result.changes > 0;
        } catch (error) {
            console.error('删除考试安排失败:', error);
            throw error;
        }
    }
    
    // 验证删除操作的完整性
    static async verifyDeletion(scheduleId, examRecordIds) {
        try {
            // 检查是否还有遗留的相关记录
            const remainingSchedule = await database.get('SELECT id FROM exam_schedules WHERE id = ?', [scheduleId]);
            const remainingParticipants = await database.query('SELECT id FROM exam_participants WHERE schedule_id = ?', [scheduleId]);
            const remainingExamRecords = await database.query('SELECT id FROM exam_records WHERE schedule_id = ?', [scheduleId]);
            
            if (examRecordIds.length > 0) {
                const remainingAnswers = await database.query(
                    `SELECT id FROM answer_records WHERE exam_record_id IN (${examRecordIds.map(() => '?').join(',')})`,
                    examRecordIds
                );
                
                if (remainingAnswers.length > 0) {
                    console.warn('警告：仍有答案记录未删除:', remainingAnswers);
                }
            }
            
            if (remainingSchedule) {
                console.warn('警告：考试安排未删除');
            }
            if (remainingParticipants.length > 0) {
                console.warn('警告：仍有参与者记录未删除:', remainingParticipants.length);
            }
            if (remainingExamRecords.length > 0) {
                console.warn('警告：仍有考试记录未删除:', remainingExamRecords.length);
            }
            
            console.log('删除验证完成');
        } catch (error) {
            console.error('删除验证失败:', error);
        }
    }
    
    // 更新考试状态
    static async updateStatus(id, status) {
        const sql = 'UPDATE exam_schedules SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        const result = await database.run(sql, [status, id]);
        return result.changes > 0;
    }
    
    // 学生开始考试时更新参与状态
    static async updateParticipantStatus(scheduleId, userId, status, examRecordId = null) {
        const sql = `
            UPDATE exam_participants 
            SET status = ?, exam_record_id = ?
            WHERE schedule_id = ? AND user_id = ?
        `;
        const result = await database.run(sql, [status, examRecordId, scheduleId, userId]);
        return result.changes > 0;
    }
    
    // 计算考试实际状态
    static calculateActualStatus(schedule) {
        const now = new Date();
        const startTime = new Date(schedule.start_time);
        const endTime = new Date(schedule.end_time);
        
        // 根据数据库实际状态进行映射
        // 数据库状态: pending, ongoing, finished, cancelled
        // 前端显示状态: pending(未开始), ongoing(进行中), finished(已结束)
        
        if (schedule.status === 'cancelled') {
            return 'finished';
        }
        
        if (schedule.status === 'finished') {
            return 'finished';
        }
        
        if (schedule.status === 'ongoing') {
            return 'ongoing';
        }
        
        // 对于 'pending' 状态，根据时间判断实际状态
        if (schedule.status === 'pending') {
            if (now < startTime) {
                return 'pending'; // 未开始
            } else if (now >= startTime && now <= endTime) {
                return 'ongoing'; // 应该进行中但状态未更新
            } else {
                return 'finished'; // 应该已结束但状态未更新
            }
        }
        
        return 'pending'; // 默认状态
    }
}

module.exports = ExamSchedule;
