const ExamRecord = require('../models/ExamRecord');
const WrongQuestion = require('../models/WrongQuestion');
const Paper = require('../models/Paper');

class StudentController {
    // 获取学生统计数据
    static async getStats(req, res) {
        try {
            const userId = req.user.id;
            
            // 获取总考试数
            const totalExams = await ExamRecord.countByUser(userId);
            
            // 获取已完成考试数
            const completedExams = await ExamRecord.countCompletedByUser(userId);
            
            // 获取平均分
            const averageScore = await ExamRecord.getAverageScoreByUser(userId);
            
            // 获取错题数量
            const wrongQuestions = await WrongQuestion.countByUser(userId);
            
            res.json({
                success: true,
                data: {
                    totalExams,
                    completedExams,
                    averageScore: Math.round(averageScore || 0),
                    wrongQuestions
                }
            });
        } catch (error) {
            console.error('Get student stats error:', error);
            res.status(500).json({
                success: false,
                message: '获取统计数据失败',
                error: error.message
            });
        }
    }
    
    // 获取学生最近考试
    static async getRecentExams(req, res) {
        try {
            const userId = req.user.id;
            const { limit = 5 } = req.query;
            
            const recentExams = await ExamRecord.getRecentByUser(userId, parseInt(limit));
            
            res.json({
                success: true,
                data: recentExams
            });
        } catch (error) {
            console.error('Get recent exams error:', error);
            res.status(500).json({
                success: false,
                message: '获取最近考试失败',
                error: error.message
            });
        }
    }
    
    // 获取学生考试列表
    static async getExams(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10, status } = req.query;
            
            const exams = await ExamRecord.getByUser(userId, {
                page: parseInt(page),
                limit: parseInt(limit),
                status
            });
            
            res.json({
                success: true,
                data: exams
            });
        } catch (error) {
            console.error('Get student exams error:', error);
            res.status(500).json({
                success: false,
                message: '获取考试列表失败',
                error: error.message
            });
        }
    }
    
    // 获取学生考试结果
    static async getResults(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10 } = req.query;
            
            const results = await ExamRecord.getResultsByUser(userId, {
                page: parseInt(page),
                limit: parseInt(limit)
            });
            
            res.json({
                success: true,
                data: results
            });
        } catch (error) {
            console.error('Get student results error:', error);
            res.status(500).json({
                success: false,
                message: '获取考试结果失败',
                error: error.message
            });
        }
    }
    
    // 获取学生错题
    static async getWrongQuestions(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10, questionType, difficulty, subject, mastery_status } = req.query;
            
            // 构建过滤条件
            const filters = {};
            if (questionType) filters.type = questionType;
            if (subject) filters.subject = subject;
            if (mastery_status === 'mastered') {
                filters.isMastered = true;
            } else if (mastery_status === 'need_review') {
                filters.isMastered = false;
            }
            
            const wrongQuestions = await WrongQuestion.getUserWrongQuestions(
                userId,
                parseInt(page),
                parseInt(limit),
                filters
            );
            
            // 转换数据格式以匹配前端期望
            const result = {
                questions: wrongQuestions.wrongQuestions,
                total: wrongQuestions.total,
                page: wrongQuestions.page,
                limit: wrongQuestions.limit,
                totalPages: Math.ceil(wrongQuestions.total / wrongQuestions.limit)
            };
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Get wrong questions error:', error);
            res.status(500).json({
                success: false,
                message: '获取错题失败',
                error: error.message
            });
        }
    }

    // 获取单个错题详情
    static async getWrongQuestionDetail(req, res) {
        try {
            const userId = req.user.id;
            const { questionId } = req.params;
            
            // 获取错题详细信息
            const wrongQuestion = await WrongQuestion.getDetailById(userId, questionId);
            
            if (!wrongQuestion) {
                return res.status(404).json({
                    success: false,
                    message: '错题记录不存在'
                });
            }

            // 获取错题的练习历史
            const practiceHistory = await WrongQuestion.getPracticeHistory(userId, questionId);
            
            res.json({
                success: true,
                data: {
                    ...wrongQuestion,
                    note: wrongQuestion.note || '',
                    error_history: practiceHistory || []
                }
            });
        } catch (error) {
            console.error('Get wrong question detail error:', error);
            res.status(500).json({
                success: false,
                message: '获取错题详情失败',
                error: error.message
            });
        }
    }

    // 保存错题笔记
    static async saveWrongQuestionNote(req, res) {
        try {
            const userId = req.user.id;
            const { questionId } = req.params;
            const { note } = req.body;
            
            const success = await WrongQuestion.saveNote(userId, questionId, note || '');
            
            if (success) {
                res.json({
                    success: true,
                    message: '笔记保存成功'
                });
            } else {
                res.status(404).json({
                    success: false,
                    message: '错题记录不存在'
                });
            }
        } catch (error) {
            console.error('Save wrong question note error:', error);
            res.status(500).json({
                success: false,
                message: '保存笔记失败',
                error: error.message
            });
        }
    }
}

module.exports = StudentController;
