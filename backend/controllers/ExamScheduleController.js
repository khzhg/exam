const ExamSchedule = require('../models/ExamSchedule');
const Paper = require('../models/Paper');
const ExamRecord = require('../models/ExamRecord');
const database = require('../config/database');

class ExamScheduleController {
    // 创建考试安排
    static async create(req, res) {
        try {
            const {
                title,
                description,
                paper_id,
                start_time,
                end_time,
                participant_type = 'all',
                participants = [],
                settings = {}
            } = req.body;
            
            // 验证必填字段
            if (!title || !paper_id || !start_time || !end_time) {
                return res.status(400).json({
                    success: false,
                    message: '请填写完整的考试信息'
                });
            }
            
            // 验证试卷是否存在
            const paper = await Paper.getById(paper_id);
            if (!paper) {
                return res.status(400).json({
                    success: false,
                    message: '指定的试卷不存在'
                });
            }
            
            // 验证时间
            const startDate = new Date(start_time);
            const endDate = new Date(end_time);
            const now = new Date();
            
            if (startDate <= now) {
                return res.status(400).json({
                    success: false,
                    message: '开始时间必须晚于当前时间'
                });
            }
            
            if (endDate <= startDate) {
                return res.status(400).json({
                    success: false,
                    message: '结束时间必须晚于开始时间'
                });
            }
            
            // 创建考试安排
            const scheduleData = {
                title,
                description,
                paper_id,
                start_time,
                end_time,
                created_by: req.user.id,
                participant_type,
                participants,
                settings
            };
            
            const scheduleId = await ExamSchedule.create(scheduleData);
            
            res.json({
                success: true,
                message: '考试安排创建成功',
                data: { id: scheduleId }
            });
        } catch (error) {
            console.error('创建考试安排失败:', error);
            res.status(500).json({
                success: false,
                message: '创建考试安排失败'
            });
        }
    }
    
    // 获取考试安排列表
    static async getList(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                title,
                status,
                startDate,
                endDate
            } = req.query;
            
            const filters = {};
            if (title) filters.title = title;
            if (status) filters.status = status;
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            
            const result = await ExamSchedule.getList(
                parseInt(page), 
                parseInt(limit), 
                filters
            );
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('获取考试安排列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取考试安排列表失败'
            });
        }
    }
    
    // 获取单个考试安排
    static async getDetail(req, res) {
        try {
            const { id } = req.params;
            
            const schedule = await ExamSchedule.getById(id);
            if (!schedule) {
                return res.status(404).json({
                    success: false,
                    message: '考试安排不存在'
                });
            }
            
            res.json({
                success: true,
                data: schedule
            });
        } catch (error) {
            console.error('获取考试安排详情失败:', error);
            res.status(500).json({
                success: false,
                message: '获取考试安排详情失败'
            });
        }
    }
    
    // 更新考试安排
    static async update(req, res) {
        try {
            const { id } = req.params;
            const {
                title,
                description,
                start_time,
                end_time,
                participant_type,
                participants,
                settings
            } = req.body;
            
            // 检查考试安排是否存在
            const existingSchedule = await ExamSchedule.getById(id);
            if (!existingSchedule) {
                return res.status(404).json({
                    success: false,
                    message: '考试安排不存在'
                });
            }
            
            // 检查考试是否已开始
            const now = new Date();
            const currentStartTime = new Date(existingSchedule.start_time);
            if (now >= currentStartTime) {
                return res.status(400).json({
                    success: false,
                    message: '考试已开始，无法修改'
                });
            }
            
            // 验证时间
            if (start_time && end_time) {
                const startDate = new Date(start_time);
                const endDate = new Date(end_time);
                
                if (startDate <= now) {
                    return res.status(400).json({
                        success: false,
                        message: '开始时间必须晚于当前时间'
                    });
                }
                
                if (endDate <= startDate) {
                    return res.status(400).json({
                        success: false,
                        message: '结束时间必须晚于开始时间'
                    });
                }
            }
            
            const scheduleData = {
                title,
                description,
                start_time,
                end_time,
                participant_type,
                participants,
                settings
            };
            
            const success = await ExamSchedule.update(id, scheduleData);
            
            if (success) {
                res.json({
                    success: true,
                    message: '考试安排更新成功'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: '更新失败'
                });
            }
        } catch (error) {
            console.error('更新考试安排失败:', error);
            res.status(500).json({
                success: false,
                message: '更新考试安排失败'
            });
        }
    }
    
    // 删除考试安排
    static async delete(req, res) {
        try {
            const { id } = req.params;
            
            // 检查考试安排是否存在
            const existingSchedule = await ExamSchedule.getById(id);
            if (!existingSchedule) {
                return res.status(404).json({
                    success: false,
                    message: '考试安排不存在'
                });
            }
            
            // 检查考试状态，只有进行中的考试不能删除
            const now = new Date();
            const startTime = new Date(existingSchedule.start_time);
            const endTime = new Date(existingSchedule.end_time);
            
            // 如果考试正在进行中，不允许删除
            if (now >= startTime && now <= endTime && existingSchedule.status !== 'finished' && existingSchedule.status !== 'cancelled') {
                return res.status(400).json({
                    success: false,
                    message: '考试正在进行中，无法删除'
                });
            }
            
            const success = await ExamSchedule.delete(id);
            
            if (success) {
                res.json({
                    success: true,
                    message: '考试安排删除成功'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: '删除失败'
                });
            }
        } catch (error) {
            console.error('删除考试安排失败:', error);
            res.status(500).json({
                success: false,
                message: '删除考试安排失败'
            });
        }
    }
    
    // 更新考试状态
    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            
            console.log('更新考试状态请求 - ID:', id, 'Status:', status);
            
            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: '缺少考试ID'
                });
            }
            
            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: '缺少状态参数'
                });
            }
            
            if (!['pending', 'ongoing', 'finished', 'cancelled'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: '无效的状态值'
                });
            }
            
            const success = await ExamSchedule.updateStatus(id, status);
            console.log('状态更新结果:', success);
            
            if (success) {
                res.json({
                    success: true,
                    message: '状态更新成功'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: '状态更新失败，可能考试不存在'
                });
            }
        } catch (error) {
            console.error('更新考试状态失败详细错误:', error);
            res.status(500).json({
                success: false,
                message: '更新考试状态失败: ' + error.message
            });
        }
    }
    
    // 获取学生的考试安排
    static async getStudentSchedules(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10 } = req.query;
            
            const schedules = await ExamSchedule.getStudentSchedules(
                userId, 
                parseInt(page), 
                parseInt(limit)
            );
            
            res.json({
                success: true,
                data: schedules
            });
        } catch (error) {
            console.error('获取学生考试安排失败:', error);
            res.status(500).json({
                success: false,
                message: '获取考试安排失败'
            });
        }
    }
    
        // 学生开始考试
    static async startExam(req, res) {
        try {
            console.log('===== 开始考试 API 调用 =====');
            console.log('请求参数:', req.params);
            console.log('用户信息:', req.user);
            
            const { id } = req.params;
            const userId = req.user.id || req.user.userId;
            
            console.log('考试安排ID:', id);
            console.log('用户ID:', userId);
            
            // 获取考试安排
            console.log('正在获取考试安排...');
            const schedule = await ExamSchedule.getById(id);
            console.log('考试安排结果:', schedule);
            
            if (!schedule) {
                console.log('考试安排不存在');
                return res.status(404).json({
                    success: false,
                    message: '考试安排不存在'
                });
            }
            
            // 检查考试状态
            if (schedule.status === 'cancelled') {
                console.log('考试已取消');
                return res.status(400).json({
                    success: false,
                    message: '考试已取消'
                });
            }
            
            if (schedule.status === 'finished') {
                console.log('考试已结束');
                return res.status(400).json({
                    success: false,
                    message: '考试已结束'
                });
            }
            
            // 检查考试时间
            const now = new Date();
            const startTime = new Date(schedule.start_time);
            const endTime = new Date(schedule.end_time);
            
            console.log('时间检查 - 当前时间:', now);
            console.log('时间检查 - 开始时间:', startTime);
            console.log('时间检查 - 结束时间:', endTime);
            
            if (now < startTime) {
                console.log('考试尚未开始');
                return res.status(400).json({
                    success: false,
                    message: '考试尚未开始'
                });
            }
            
            if (now > endTime) {
                console.log('考试已结束');
                return res.status(400).json({
                    success: false,
                    message: '考试已结束'
                });
            }
            
            // 检查是否已经在参与者表中
            console.log('正在检查参与者状态...');
            const database = require('../config/database');
            const participantCheck = await database.get(
                'SELECT * FROM exam_participants WHERE schedule_id = ? AND user_id = ?',
                [id, userId]
            );
            console.log('参与者检查结果:', participantCheck);
            
            if (!participantCheck) {
                console.log('插入参与者记录...');
                await database.run(
                    'INSERT INTO exam_participants (schedule_id, user_id, status) VALUES (?, ?, ?)',
                    [id, userId, 'not_started']
                );
            }
            
            // 创建考试记录
            console.log('正在创建考试记录...');
            
            // 使用简单的当前时间戳，避免时区问题
            const examRecordId = await ExamRecord.create({
                paper_id: schedule.paper_id,
                user_id: userId,
                schedule_id: id
                // 不传递 start_time，让数据库使用 CURRENT_TIMESTAMP
            });
            console.log('考试记录ID:', examRecordId);
            
            // 更新参与状态
            console.log('正在更新参与状态...');
            await ExamSchedule.updateParticipantStatus(id, userId, 'in_progress', examRecordId);
            console.log('参与状态更新完成');
            
            const responseData = {
                exam_record_id: examRecordId,
                paper_id: schedule.paper_id,
                duration: (schedule.settings && schedule.settings.duration) || schedule.paper_duration
            };
            
            console.log('返回数据:', responseData);
            
            res.json({
                success: true,
                message: '考试开始',
                data: responseData
            });
        } catch (error) {
            console.error('开始考试失败详细错误:', error);
            res.status(500).json({
                success: false,
                message: '开始考试失败'
            });
        }
    }
}

module.exports = ExamScheduleController;
