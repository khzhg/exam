const User = require('../models/User');
const Question = require('../models/Question');
const Paper = require('../models/Paper');
const ExamRecord = require('../models/ExamRecord');

class AdminController {
    // 获取仪表板统计数据
    static async getDashboardStats(req, res) {
        try {
            // 获取用户统计
            const totalStudents = await User.countStudents();
            const totalAdmins = await User.countAdmins();
            
            // 获取题目统计
            const totalQuestions = await Question.countAll();
            const questionsByType = await Question.countByType();
            
            // 获取试卷统计
            const totalPapers = await Paper.countAll();
            
            // 获取考试统计
            const totalExams = await ExamRecord.countAll();
            const completedExams = await ExamRecord.countCompleted();
            const averageScore = await ExamRecord.getGlobalAverageScore();
            
            // 获取今日考试数据
            const todayExams = await ExamRecord.countToday();
            
            res.json({
                success: true,
                data: {
                    users: {
                        totalStudents,
                        totalAdmins,
                        total: totalStudents + totalAdmins
                    },
                    questions: {
                        total: totalQuestions,
                        byType: questionsByType
                    },
                    papers: {
                        total: totalPapers
                    },
                    exams: {
                        total: totalExams,
                        completed: completedExams,
                        averageScore: Math.round(averageScore || 0),
                        today: todayExams
                    }
                }
            });
        } catch (error) {
            console.error('Get dashboard stats error:', error);
            res.status(500).json({
                success: false,
                message: '获取仪表板统计失败',
                error: error.message
            });
        }
    }

    // 获取用户列表
    static async getUsers(req, res) {
        try {
            const { page = 1, limit = 10, role } = req.query;
            const users = await User.getUsers({
                page: parseInt(page),
                limit: parseInt(limit),
                role
            });
            
            res.json({
                success: true,
                data: users
            });
        } catch (error) {
            console.error('Get users error:', error);
            res.status(500).json({
                success: false,
                message: '获取用户列表失败',
                error: error.message
            });
        }
    }

    // 创建用户
    static async createUser(req, res) {
        try {
            const { username, password, role, real_name, email } = req.body;
            
            // 检查用户名是否已存在
            const existingUser = await User.findByUsername(username);
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: '用户名已存在'
                });
            }
            
            const userId = await User.create({
                username,
                password,
                role,
                real_name,
                email
            });
            
            res.status(201).json({
                success: true,
                message: '用户创建成功',
                data: { userId }
            });
        } catch (error) {
            console.error('Create user error:', error);
            res.status(500).json({
                success: false,
                message: '创建用户失败',
                error: error.message
            });
        }
    }

    // 更新用户
    static async updateUser(req, res) {
        try {
            const { id } = req.params;
            const { real_name, email, role } = req.body;
            
            const success = await User.update(id, { real_name, email, role });
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: '用户不存在或更新失败'
                });
            }
            
            res.json({
                success: true,
                message: '用户信息更新成功'
            });
        } catch (error) {
            console.error('Update user error:', error);
            res.status(500).json({
                success: false,
                message: '更新用户失败',
                error: error.message
            });
        }
    }

    // 删除用户
    static async deleteUser(req, res) {
        try {
            const { id } = req.params;
            
            const success = await User.delete(id);
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: '用户不存在或删除失败'
                });
            }
            
            res.json({
                success: true,
                message: '用户删除成功'
            });
        } catch (error) {
            console.error('Delete user error:', error);
            res.status(500).json({
                success: false,
                message: '删除用户失败',
                error: error.message
            });
        }
    }

    // 重置用户密码
    static async resetUserPassword(req, res) {
        try {
            const { id } = req.params;
            const defaultPassword = '123456';
            
            const success = await User.changePassword(id, defaultPassword);
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: '用户不存在或重置失败'
                });
            }
            
            res.json({
                success: true,
                message: '密码重置成功，新密码为：123456'
            });
        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                success: false,
                message: '重置密码失败',
                error: error.message
            });
        }
    }

    // 获取考试统计
    static async getExamStats(req, res) {
        try {
            const { startDate, endDate, paperId } = req.query;
            
            const filters = {};
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            if (paperId) filters.paperId = parseInt(paperId);
            
            const stats = await ExamRecord.getStatistics(filters);
            
            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Get exam stats error:', error);
            res.status(500).json({
                success: false,
                message: '获取考试统计失败',
                error: error.message
            });
        }
    }

    // 获取成绩统计
    static async getScoreStats(req, res) {
        try {
            const { startDate, endDate, paperId } = req.query;
            
            const filters = {};
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            if (paperId) filters.paperId = parseInt(paperId);
            
            const scoreStats = await ExamRecord.getScoreStatistics(filters);
            
            res.json({
                success: true,
                data: scoreStats
            });
        } catch (error) {
            console.error('Get score stats error:', error);
            res.status(500).json({
                success: false,
                message: '获取成绩统计失败',
                error: error.message
            });
        }
    }

    // 获取学生详情统计
    static async getStudentDetail(req, res) {
        try {
            const { id } = req.params;
            const { startDate, endDate } = req.query;
            
            // 获取学生基本信息
            const student = await User.findById(id);
            if (!student || student.role !== 'student') {
                return res.status(404).json({
                    success: false,
                    message: '学生不存在'
                });
            }
            
            // 获取学生考试记录
            const filters = { userId: parseInt(id) };
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            
            const examRecords = await ExamRecord.getDetailsByUser(filters);
            const examStats = await ExamRecord.getStatisticsByUser(parseInt(id), filters);
            
            res.json({
                success: true,
                data: {
                    student: {
                        id: student.id,
                        username: student.username,
                        real_name: student.real_name,
                        email: student.email,
                        created_at: student.created_at
                    },
                    examRecords,
                    statistics: examStats
                }
            });
        } catch (error) {
            console.error('Get student detail error:', error);
            res.status(500).json({
                success: false,
                message: '获取学生详情失败',
                error: error.message
            });
        }
    }

    // 获取考试详情统计
    static async getExamDetail(req, res) {
        try {
            const { id } = req.params; // paper_id
            const { startDate, endDate } = req.query;
            
            // 获取试卷信息
            const paper = await Paper.getById(id);
            if (!paper) {
                return res.status(404).json({
                    success: false,
                    message: '试卷不存在'
                });
            }
            
            // 获取考试记录
            const filters = { paperId: parseInt(id) };
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            
            const examRecords = await ExamRecord.getDetailsByPaper(filters);
            const examStats = await ExamRecord.getStatisticsByPaper(parseInt(id), filters);
            const scoreDistribution = await ExamRecord.getScoreDistribution(filters);
            
            res.json({
                success: true,
                data: {
                    paper: {
                        id: paper.id,
                        title: paper.title,
                        description: paper.description,
                        total_score: paper.total_score,
                        time_limit: paper.duration || paper.time_limit, // 兼容字段名
                        created_at: paper.created_at
                    },
                    examRecords,
                    statistics: examStats,
                    scoreDistribution
                }
            });
        } catch (error) {
            console.error('Get exam detail error:', error);
            res.status(500).json({
                success: false,
                message: '获取考试详情失败',
                error: error.message
            });
        }
    }

    // 获取题目详情统计
    static async getQuestionDetail(req, res) {
        try {
            const { id } = req.params;
            const { startDate, endDate } = req.query;
            
            // 获取题目信息
            const question = await Question.getById(id);
            if (!question) {
                return res.status(404).json({
                    success: false,
                    message: '题目不存在'
                });
            }
            
            // 获取题目答题统计
            const filters = { questionId: parseInt(id) };
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            
            const answerStats = await ExamRecord.getQuestionAnswerStats(filters);
            const wrongAnswers = await ExamRecord.getQuestionWrongAnswers(filters);
            
            res.json({
                success: true,
                data: {
                    question: {
                        id: question.id,
                        title: question.title,
                        content: question.content,
                        type: question.type,
                        options: question.options,
                        correct_answer: question.correct_answer,
                        difficulty: question.difficulty,
                        subject: question.subject,
                        created_at: question.created_at
                    },
                    answerStats,
                    wrongAnswers
                }
            });
        } catch (error) {
            console.error('Get question detail error:', error);
            res.status(500).json({
                success: false,
                message: '获取题目详情失败',
                error: error.message
            });
        }
    }
}

module.exports = AdminController;
