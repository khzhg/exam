const express = require('express');
const WrongQuestion = require('../models/WrongQuestion');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

class WrongQuestionController {
    // 获取用户错题列表
    static async getUserWrongQuestions(req, res) {
        try {
            const { page = 1, limit = 10, subject, type, isMastered } = req.query;
            const userId = req.user.id;
            
            const filters = {};
            if (subject) filters.subject = subject;
            if (type) filters.type = type;
            if (isMastered !== undefined) filters.isMastered = isMastered === 'true';
            
            const result = await WrongQuestion.getUserWrongQuestions(
                userId,
                parseInt(page),
                parseInt(limit),
                filters
            );
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Get wrong questions error:', error);
            res.status(500).json({
                success: false,
                message: '获取错题列表失败',
                error: error.message
            });
        }
    }

    // 标记错题为已掌握
    static async markAsMastered(req, res) {
        try {
            const { questionId } = req.params;
            const userId = req.user.id;
            
            const success = await WrongQuestion.markAsMastered(userId, questionId);
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: '错题记录不存在'
                });
            }
            
            res.json({
                success: true,
                message: '已标记为掌握'
            });
        } catch (error) {
            console.error('Mark as mastered error:', error);
            res.status(500).json({
                success: false,
                message: '标记失败',
                error: error.message
            });
        }
    }

    // 删除错题记录
    static async deleteWrongQuestion(req, res) {
        try {
            const { questionId } = req.params;
            const userId = req.user.id;
            
            const success = await WrongQuestion.delete(userId, questionId);
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: '错题记录不存在'
                });
            }
            
            res.json({
                success: true,
                message: '错题记录删除成功'
            });
        } catch (error) {
            console.error('Delete wrong question error:', error);
            res.status(500).json({
                success: false,
                message: '删除失败',
                error: error.message
            });
        }
    }

    // 获取错题统计
    static async getStatistics(req, res) {
        try {
            const userId = req.user.id;
            const statistics = await WrongQuestion.getStatistics(userId);
            const summary = await WrongQuestion.getUserWrongCount(userId);
            
            res.json({
                success: true,
                data: {
                    summary,
                    details: statistics
                }
            });
        } catch (error) {
            console.error('Get wrong question statistics error:', error);
            res.status(500).json({
                success: false,
                message: '获取统计数据失败',
                error: error.message
            });
        }
    }

    // 错题练习
    static async wrongQuestionPractice(req, res) {
        try {
            const { count = 10, subject, type } = req.query;
            const userId = req.user.id;
            
            const filters = {};
            if (subject) filters.subject = subject;
            if (type) filters.type = type;
            
            const questions = await WrongQuestion.getWrongQuestionsForPractice(
                userId,
                parseInt(count),
                filters
            );
            
            if (questions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '没有找到符合条件的错题'
                });
            }
            
            res.json({
                success: true,
                message: '开始错题练习',
                data: {
                    questions: questions.map(q => ({
                        id: q.id,
                        type: q.type,
                        title: q.title,
                        content: q.content,
                        options: q.options,
                        wrong_count: q.wrong_count,
                        last_wrong_time: q.last_wrong_time
                    }))
                }
            });
        } catch (error) {
            console.error('Wrong question practice error:', error);
            res.status(500).json({
                success: false,
                message: '开始错题练习失败',
                error: error.message
            });
        }
    }

    // 批量添加错题
    static async batchAddWrongQuestions(req, res) {
        try {
            const { question_ids } = req.body;
            const userId = req.user.id;
            
            if (!question_ids || !Array.isArray(question_ids) || question_ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '请提供题目ID列表'
                });
            }
            
            const wrongAnswers = question_ids.map(questionId => ({
                user_id: userId,
                question_id: questionId
            }));
            
            const results = await WrongQuestion.batchAdd(wrongAnswers);
            
            res.json({
                success: true,
                message: '错题添加成功',
                data: results
            });
        } catch (error) {
            console.error('Batch add wrong questions error:', error);
            res.status(500).json({
                success: false,
                message: '批量添加错题失败',
                error: error.message
            });
        }
    }
}

// 获取用户错题列表
router.get('/', 
    authenticateToken,
    WrongQuestionController.getUserWrongQuestions
);

// 批量添加错题
router.post('/batch', 
    authenticateToken,
    WrongQuestionController.batchAddWrongQuestions
);

// 标记错题为已掌握
router.put('/:questionId/mastered', 
    authenticateToken,
    WrongQuestionController.markAsMastered
);

// 删除错题记录
router.delete('/:questionId', 
    authenticateToken,
    WrongQuestionController.deleteWrongQuestion
);

// 获取错题统计
router.get('/statistics/overview', 
    authenticateToken,
    WrongQuestionController.getStatistics
);

// 错题练习
router.get('/practice/start', 
    authenticateToken,
    WrongQuestionController.wrongQuestionPractice
);

module.exports = router;
