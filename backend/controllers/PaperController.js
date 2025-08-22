const Paper = require('../models/Paper');
const Question = require('../models/Question');
const { body } = require('express-validator');

class PaperController {
    // 获取试卷列表
    static async getList(req, res) {
        try {
            const { page = 1, limit = 10, is_active } = req.query;
            
            let isActive = null;
            if (is_active !== undefined) {
                isActive = is_active === 'true' || is_active === '1';
            }
            
            const result = await Paper.getList(parseInt(page), parseInt(limit), isActive);
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Get papers error:', error);
            res.status(500).json({
                success: false,
                message: '获取试卷列表失败',
                error: error.message
            });
        }
    }

    // 获取练习试卷列表
    static async getPracticeList(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            
            const result = await Paper.getPracticeList(parseInt(page), parseInt(limit));
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Get practice papers error:', error);
            res.status(500).json({
                success: false,
                message: '获取练习试卷列表失败',
                error: error.message
            });
        }
    }

    // 获取考试试卷列表（用于管理员安排考试）
    static async getExamList(req, res) {
        try {
            const { page = 1, limit = 10, include_scheduled = false } = req.query;
            
            const includeScheduled = include_scheduled === 'true' || include_scheduled === '1';
            const result = await Paper.getExamList(parseInt(page), parseInt(limit), includeScheduled);
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Get exam papers error:', error);
            res.status(500).json({
                success: false,
                message: '获取考试试卷列表失败',
                error: error.message
            });
        }
    }

    // 获取试卷详情
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const paper = await Paper.getById(id);
            
            if (!paper) {
                return res.status(404).json({
                    success: false,
                    message: '试卷不存在'
                });
            }
            
            // 获取试卷题目
            const questions = await Paper.getQuestions(id);
            paper.questions = questions;
            
            res.json({
                success: true,
                data: paper
            });
        } catch (error) {
            console.error('Get paper error:', error);
            res.status(500).json({
                success: false,
                message: '获取试卷失败',
                error: error.message
            });
        }
    }

    // 创建试卷
    static async create(req, res) {
        try {
            const { questions, ...paperData } = req.body;
            paperData.created_by = req.user.id;
            
            const paperId = await Paper.create(paperData);
            
            // 如果有题目数据，添加题目到试卷
            if (questions && Array.isArray(questions) && questions.length > 0) {
                await Paper.addQuestions(paperId, questions);
            }
            
            res.status(201).json({
                success: true,
                message: '试卷创建成功',
                data: { paperId }
            });
        } catch (error) {
            console.error('Create paper error:', error);
            res.status(500).json({
                success: false,
                message: '创建试卷失败',
                error: error.message
            });
        }
    }

    // 更新试卷
    static async update(req, res) {
        try {
            const { id } = req.params;
            const { questions, ...paperData } = req.body;
            
            const success = await Paper.update(id, paperData);
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: '试卷不存在或更新失败'
                });
            }
            
            // 如果有题目数据，先清空原有题目，再添加新题目
            if (questions && Array.isArray(questions)) {
                await Paper.clearQuestions(id);
                if (questions.length > 0) {
                    await Paper.addQuestions(id, questions);
                }
            }
            
            res.json({
                success: true,
                message: '试卷更新成功'
            });
        } catch (error) {
            console.error('Update paper error:', error);
            res.status(500).json({
                success: false,
                message: '更新试卷失败',
                error: error.message
            });
        }
    }

    // 更新试卷状态 (发布/取消发布)
    static async updateStatus(req, res) {
        try {
            const { id } = req.params;
            const { is_active } = req.body;
            
            const success = await Paper.updateStatus(id, is_active);
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: '试卷不存在或更新失败'
                });
            }
            
            res.json({
                success: true,
                message: is_active ? '试卷发布成功' : '试卷已取消发布'
            });
        } catch (error) {
            console.error('Update paper status error:', error);
            res.status(500).json({
                success: false,
                message: '更新试卷状态失败',
                error: error.message
            });
        }
    }

    // 删除试卷
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const { force } = req.query; // 检查是否强制删除
            
            const success = await Paper.delete(id, force === 'true');
            
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: '试卷不存在或删除失败'
                });
            }
            
            res.json({
                success: true,
                message: force === 'true' ? '试卷强制删除成功' : '试卷删除成功'
            });
        } catch (error) {
            console.error('Delete paper error:', error);
            
            // 如果是依赖关系错误且不是强制删除，提示用户可以强制删除
            if (error.message.includes('考试记录') || error.message.includes('考试安排')) {
                res.status(400).json({
                    success: false,
                    message: error.message,
                    forceDeleteAvailable: true,
                    error: error.message
                });
            } else {
                res.status(500).json({
                    success: false,
                    message: '删除试卷失败',
                    error: error.message
                });
            }
        }
    }

    // 添加题目到试卷
    static async addQuestion(req, res) {
        try {
            const { id } = req.params;
            const { questionId, score = 5, sortOrder = 0 } = req.body;
            
            // 检查题目是否存在
            const question = await Question.getById(questionId);
            if (!question) {
                return res.status(404).json({
                    success: false,
                    message: '题目不存在'
                });
            }
            
            const relationId = await Paper.addQuestion(id, questionId, score, sortOrder);
            
            res.status(201).json({
                success: true,
                message: '题目添加成功',
                data: { relationId }
            });
        } catch (error) {
            console.error('Add question error:', error);
            res.status(500).json({
                success: false,
                message: '添加题目失败',
                error: error.message
            });
        }
    }

    // 批量添加题目到试卷
    static async addQuestions(req, res) {
        try {
            const { id } = req.params;
            const { questions } = req.body;
            
            if (!Array.isArray(questions) || questions.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '题目列表不能为空'
                });
            }
            
            const results = await Paper.addQuestions(id, questions);
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;
            
            res.json({
                success: true,
                message: `添加完成: 成功${successCount}条, 失败${failCount}条`,
                data: {
                    total: results.length,
                    success: successCount,
                    failed: failCount,
                    details: results
                }
            });
        } catch (error) {
            console.error('Add questions error:', error);
            res.status(500).json({
                success: false,
                message: '批量添加题目失败',
                error: error.message
            });
        }
    }

    // 从试卷中移除题目
    static async removeQuestion(req, res) {
        try {
            const { id, questionId } = req.params;
            
            const success = await Paper.removeQuestion(id, questionId);
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: '题目不在试卷中或移除失败'
                });
            }
            
            res.json({
                success: true,
                message: '题目移除成功'
            });
        } catch (error) {
            console.error('Remove question error:', error);
            res.status(500).json({
                success: false,
                message: '移除题目失败',
                error: error.message
            });
        }
    }

    // 获取可用试卷(供学生使用)
    static async getActivePapers(req, res) {
        try {
            const papers = await Paper.getActivePapers();
            
            res.json({
                success: true,
                data: papers
            });
        } catch (error) {
            console.error('Get active papers error:', error);
            res.status(500).json({
                success: false,
                message: '获取可用试卷失败',
                error: error.message
            });
        }
    }

    // 更新题目分数
    static async updateQuestionScore(req, res) {
        try {
            const { id, questionId } = req.params;
            const { score } = req.body;
            
            const success = await Paper.updateQuestionScore(id, questionId, score);
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: '题目不在试卷中或更新失败'
                });
            }
            
            res.json({
                success: true,
                message: '分数更新成功'
            });
        } catch (error) {
            console.error('Update question score error:', error);
            res.status(500).json({
                success: false,
                message: '更新分数失败',
                error: error.message
            });
        }
    }

    // 自动组卷
    static async autoGenerate(req, res) {
        try {
            const { 
                title, 
                description, 
                duration = 60, 
                total_score = 100,
                question_config 
            } = req.body;
            
            // question_config 格式: [{ type: 'single', count: 10, score: 5 }, ...]
            if (!Array.isArray(question_config) || question_config.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '题目配置不能为空'
                });
            }
            
            // 创建试卷
            const paperId = await Paper.create({
                title,
                description,
                duration,
                total_score,
                pass_score: Math.floor(total_score * 0.6), // 默认60%及格
                created_by: req.user.id
            });
            
            // 按配置添加题目
            const allQuestions = [];
            let sortOrder = 1;
            
            for (const config of question_config) {
                const { type, count, score = 5, subject } = config;
                
                const filters = { type };
                if (subject) filters.subject = subject;
                
                const questions = await Question.getRandomQuestions(count, filters);
                
                if (questions.length < count) {
                    return res.status(400).json({
                        success: false,
                        message: `${type}类型题目数量不足，需要${count}道，实际只有${questions.length}道`
                    });
                }
                
                const questionData = questions.map(q => ({
                    questionId: q.id,
                    score,
                    sortOrder: sortOrder++
                }));
                
                allQuestions.push(...questionData);
            }
            
            // 批量添加题目
            const results = await Paper.addQuestions(paperId, allQuestions);
            const successCount = results.filter(r => r.success).length;
            
            res.status(201).json({
                success: true,
                message: `自动组卷成功，添加了${successCount}道题目`,
                data: { 
                    paperId,
                    totalQuestions: successCount
                }
            });
            
        } catch (error) {
            console.error('Auto generate paper error:', error);
            res.status(500).json({
                success: false,
                message: '自动组卷失败',
                error: error.message
            });
        }
    }
}

// 验证规则
PaperController.createValidation = [
    body('title').notEmpty().withMessage('试卷标题不能为空'),
    body('duration').optional().isInt({ min: 1 }).withMessage('考试时长必须大于0'),
    body('total_score').optional().isInt({ min: 1 }).withMessage('总分必须大于0'),
    body('pass_score').optional().isInt({ min: 0 }).withMessage('及格分数不能为负数')
];

PaperController.updateValidation = PaperController.createValidation;

PaperController.addQuestionValidation = [
    body('questionId').isInt({ min: 1 }).withMessage('题目ID必须是正整数'),
    body('score').optional().isInt({ min: 0 }).withMessage('分数不能为负数')
];

PaperController.updateScoreValidation = [
    body('score').isInt({ min: 0 }).withMessage('分数不能为负数')
];

module.exports = PaperController;
