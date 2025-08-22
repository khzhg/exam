const express = require('express');
const User = require('../models/User');
const ExamRecord = require('../models/ExamRecord');
const AuthController = require('../controllers/AuthController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/error');
const database = require('../config/database');

const router = express.Router();

class AdminController {
    // 获取所有学生
    static async getAllStudents(req, res) {
        try {
            const students = await User.getAllStudents();
            res.json({
                success: true,
                data: students
            });
        } catch (error) {
            console.error('Get students error:', error);
            res.status(500).json({
                success: false,
                message: '获取学生列表失败',
                error: error.message
            });
        }
    }

    // 获取所有考试记录
    static async getAllExamRecords(req, res) {
        try {
            const { page = 1, limit = 10, userId, paperId, type, status } = req.query;
            
            const filters = {};
            if (userId) filters.userId = parseInt(userId);
            if (paperId) filters.paperId = parseInt(paperId);
            if (type) filters.type = type;
            if (status) filters.status = status;
            
            const result = await ExamRecord.getAllRecords(
                parseInt(page),
                parseInt(limit),
                filters
            );
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Get exam records error:', error);
            res.status(500).json({
                success: false,
                message: '获取考试记录失败',
                error: error.message
            });
        }
    }

    // 获取考试统计
    static async getExamStatistics(req, res) {
        try {
            const { paperId, startDate, endDate } = req.query;
            
            const filters = {};
            if (paperId) filters.paperId = parseInt(paperId);
            if (startDate) filters.startDate = startDate;
            if (endDate) filters.endDate = endDate;
            
            const statistics = await ExamRecord.getStatistics(filters);
            
            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            console.error('Get exam statistics error:', error);
            res.status(500).json({
                success: false,
                message: '获取考试统计失败',
                error: error.message
            });
        }
    }

    // 获取题目统计
    static async getQuestionStatistics(req, res) {
        try {
            const { page = 1, limit = 20, questionId, startDate, endDate } = req.query;
            
            const Question = require('../models/Question');
            const AnswerRecord = require('../models/AnswerRecord');
            
            // 如果指定了特定题目，获取该题目的详细统计
            if (questionId) {
                const questionStats = await AdminController.getQuestionDetailStats(parseInt(questionId), { startDate, endDate });
                return res.json({
                    success: true,
                    data: questionStats
                });
            }
            
            // 获取题目列表和统计信息
            const offset = (page - 1) * limit;
            const questions = await Question.getList(page, limit);
            
            if (!questions || !questions.questions) {
                return res.json({
                    success: true,
                    data: {
                        questions: [],
                        total: 0,
                        page,
                        limit
                    }
                });
            }
            
            // 为每个题目添加统计信息
            const questionsWithStats = await Promise.all(
                questions.questions.map(async (question) => {
                    const stats = await AdminController.getQuestionBasicStats(question.id, { startDate, endDate });
                    return {
                        ...question,
                        ...stats
                    };
                })
            );
            
            res.json({
                success: true,
                data: {
                    questions: questionsWithStats,
                    total: questions.total,
                    page,
                    limit
                }
            });
        } catch (error) {
            console.error('Get question statistics error:', error);
            res.status(500).json({
                success: false,
                message: '获取题目统计失败',
                error: error.message
            });
        }
    }

    // 获取题目基础统计信息
    static async getQuestionBasicStats(questionId, filters = {}) {
        try {
            // 检查是否有 answer_records 表
            const tableExists = await database.get("SELECT name FROM sqlite_master WHERE type='table' AND name='answer_records'");
            
            if (!tableExists) {
                return {
                    answer_count: 0,
                    correct_count: 0,
                    accuracy_rate: 0,
                    avg_time: 0
                };
            }
            
            let whereConditions = ['ar.question_id = ?'];
            let params = [questionId];
            
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
                    COUNT(*) as answer_count,
                    COUNT(CASE WHEN ar.is_correct = 1 THEN 1 END) as correct_count,
                    ROUND(AVG(CASE WHEN ar.is_correct = 1 THEN 100.0 ELSE 0.0 END), 1) as accuracy_rate,
                    ROUND(AVG(CASE WHEN ar.answer_time > 0 THEN ar.answer_time ELSE 30 END), 1) as avg_time
                FROM answer_records ar
                LEFT JOIN exam_records er ON ar.exam_record_id = er.id
                ${whereClause}
            `;
            
            const result = await database.get(sql, params);
            
            return {
                answer_count: result.answer_count || 0,
                correct_count: result.correct_count || 0,
                accuracy_rate: result.accuracy_rate || 0,
                avg_time: result.avg_time || 0
            };
        } catch (error) {
            console.error('获取题目基础统计失败:', error);
            return {
                answer_count: 0,
                correct_count: 0,
                accuracy_rate: 0,
                avg_time: 0
            };
        }
    }

    // 获取题目详细统计信息
    static async getQuestionDetailStats(questionId, filters = {}) {
        try {
            const Question = require('../models/Question');
            
            // 获取题目基本信息
            const question = await Question.getById(questionId);
            if (!question) {
                throw new Error('题目不存在');
            }
            
            // 获取基础统计
            const basicStats = await AdminController.getQuestionBasicStats(questionId, filters);
            
            // 获取答案分布统计
            const answerDistribution = await AdminController.getAnswerDistribution(questionId, filters);
            
            // 获取错误答案分析
            const wrongAnswers = await AdminController.getWrongAnswersAnalysis(questionId, filters);
            
            return {
                question,
                ...basicStats,
                answer_distribution: answerDistribution,
                wrong_answers: wrongAnswers
            };
        } catch (error) {
            console.error('获取题目详细统计失败:', error);
            throw error;
        }
    }

    // 获取答案分布统计
    static async getAnswerDistribution(questionId, filters = {}) {
        try {
            // 检查是否有 answer_records 表
            const tableExists = await database.get("SELECT name FROM sqlite_master WHERE type='table' AND name='answer_records'");
            
            if (!tableExists) {
                return [];
            }
            
            let whereConditions = ['ar.question_id = ?'];
            let params = [questionId];
            
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
                    ar.user_answer as answer,
                    COUNT(*) as count,
                    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM answer_records ar2 
                        LEFT JOIN exam_records er2 ON ar2.exam_record_id = er2.id 
                        WHERE ar2.question_id = ?), 1) as percentage
                FROM answer_records ar
                LEFT JOIN exam_records er ON ar.exam_record_id = er.id
                ${whereClause}
                GROUP BY ar.user_answer
                ORDER BY count DESC
            `;
            
            return await database.query(sql, [questionId, ...params]);
        } catch (error) {
            console.error('获取答案分布统计失败:', error);
            return [];
        }
    }

    // 获取错误答案分析
    static async getWrongAnswersAnalysis(questionId, filters = {}) {
        try {
            // 检查是否有 answer_records 表
            const tableExists = await database.get("SELECT name FROM sqlite_master WHERE type='table' AND name='answer_records'");
            
            if (!tableExists) {
                return [];
            }
            
            let whereConditions = ['ar.question_id = ?', 'ar.is_correct = 0'];
            let params = [questionId];
            
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
                    ar.user_answer as wrong_answer,
                    COUNT(*) as count,
                    GROUP_CONCAT(DISTINCT u.real_name || '(' || u.username || ')') as students
                FROM answer_records ar
                LEFT JOIN exam_records er ON ar.exam_record_id = er.id
                LEFT JOIN users u ON er.user_id = u.id
                ${whereClause}
                GROUP BY ar.user_answer
                ORDER BY count DESC
                LIMIT 20
            `;
            
            return await database.query(sql, params);
        } catch (error) {
            console.error('获取错误答案分析失败:', error);
            return [];
        }
    }

    // 创建学生账号
    static async createStudent(req, res) {
        try {
            const { username, password, real_name, email } = req.body;
            
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
                role: 'student',
                real_name,
                email
            });
            
            res.status(201).json({
                success: true,
                message: '学生账号创建成功',
                data: { userId }
            });
        } catch (error) {
            console.error('Create student error:', error);
            res.status(500).json({
                success: false,
                message: '创建学生账号失败',
                error: error.message
            });
        }
    }

    // 删除学生账号
    static async deleteStudent(req, res) {
        try {
            const { id } = req.params;
            
            const success = await User.delete(id);
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: '学生不存在或删除失败'
                });
            }
            
            res.json({
                success: true,
                message: '学生账号删除成功'
            });
        } catch (error) {
            console.error('Delete student error:', error);
            res.status(500).json({
                success: false,
                message: '删除学生账号失败',
                error: error.message
            });
        }
    }

    // 更新学生信息
    static async updateStudent(req, res) {
        try {
            const { id } = req.params;
            const { username, real_name, email } = req.body;
            
            // 检查学生是否存在
            const existingStudent = await User.findById(id);
            if (!existingStudent || existingStudent.role !== 'student') {
                return res.status(404).json({
                    success: false,
                    message: '学生不存在'
                });
            }
            
            // 检查用户名是否已被其他用户使用
            if (username && username !== existingStudent.username) {
                const duplicateUser = await User.findByUsername(username);
                if (duplicateUser && duplicateUser.id !== parseInt(id)) {
                    return res.status(400).json({
                        success: false,
                        message: '用户名已存在'
                    });
                }
            }
            
            const success = await User.update(id, {
                username,
                real_name,
                email
            });
            
            if (!success) {
                return res.status(400).json({
                    success: false,
                    message: '更新失败'
                });
            }
            
            res.json({
                success: true,
                message: '学生信息更新成功'
            });
        } catch (error) {
            console.error('Update student error:', error);
            res.status(500).json({
                success: false,
                message: '更新学生信息失败',
                error: error.message
            });
        }
    }

    // 重置学生密码
    static async resetStudentPassword(req, res) {
        try {
            const { id } = req.params;
            const { newPassword } = req.body;
            
            const success = await User.changePassword(id, newPassword);
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: '学生不存在或重置失败'
                });
            }
            
            res.json({
                success: true,
                message: '密码重置成功'
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
}

// 用户管理
router.get('/profile', 
    authenticateToken,
    AuthController.profile
);

router.put('/profile', 
    authenticateToken,
    AuthController.updateProfile
);

router.put('/password', 
    authenticateToken,
    AuthController.changePasswordValidation,
    handleValidationErrors,
    AuthController.changePassword
);

// 管理员功能
router.get('/students', 
    authenticateToken,
    requireAdmin,
    AdminController.getAllStudents
);

router.post('/students', 
    authenticateToken,
    requireAdmin,
    AuthController.registerValidation,
    handleValidationErrors,
    AdminController.createStudent
);

router.put('/students/:id', 
    authenticateToken,
    requireAdmin,
    AdminController.updateStudent
);

router.delete('/students/:id', 
    authenticateToken,
    requireAdmin,
    AdminController.deleteStudent
);

router.put('/students/:id/password', 
    authenticateToken,
    requireAdmin,
    AdminController.resetStudentPassword
);

router.get('/exam-records', 
    authenticateToken,
    requireAdmin,
    AdminController.getAllExamRecords
);

router.get('/exam-statistics', 
    authenticateToken,
    requireAdmin,
    AdminController.getExamStatistics
);

router.get('/question-statistics', 
    authenticateToken,
    requireAdmin,
    AdminController.getQuestionStatistics
);

module.exports = router;
