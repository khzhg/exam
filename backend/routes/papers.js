const express = require('express');
const PaperController = require('../controllers/PaperController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/error');

const router = express.Router();

// 获取试卷列表
router.get('/', 
    authenticateToken,
    PaperController.getList
);

// 获取可用试卷 (学生用)
router.get('/active/list', 
    authenticateToken,
    PaperController.getActivePapers
);

// 获取练习试卷列表 (学生用)
router.get('/practice/list', 
    authenticateToken,
    PaperController.getPracticeList
);

// 获取考试试卷列表 (学生用)
router.get('/exam/list', 
    authenticateToken,
    PaperController.getExamList
);

// 获取试卷详情
router.get('/:id', 
    authenticateToken,
    PaperController.getById
);

// 创建试卷 (管理员)
router.post('/', 
    authenticateToken,
    requireAdmin,
    PaperController.createValidation,
    handleValidationErrors,
    PaperController.create
);

// 更新试卷 (管理员)
router.put('/:id', 
    authenticateToken,
    requireAdmin,
    PaperController.updateValidation,
    handleValidationErrors,
    PaperController.update
);

// 发布/取消发布试卷 (管理员)
router.patch('/:id/status', 
    authenticateToken,
    requireAdmin,
    PaperController.updateStatus
);

// 删除试卷 (管理员)
router.delete('/:id', 
    authenticateToken,
    requireAdmin,
    PaperController.delete
);

// 添加题目到试卷 (管理员)
router.post('/:id/questions', 
    authenticateToken,
    requireAdmin,
    PaperController.addQuestionValidation,
    handleValidationErrors,
    PaperController.addQuestion
);

// 批量添加题目到试卷 (管理员)
router.post('/:id/questions/batch', 
    authenticateToken,
    requireAdmin,
    PaperController.addQuestions
);

// 从试卷中移除题目 (管理员)
router.delete('/:id/questions/:questionId', 
    authenticateToken,
    requireAdmin,
    PaperController.removeQuestion
);

// 更新题目分数 (管理员)
router.put('/:id/questions/:questionId/score', 
    authenticateToken,
    requireAdmin,
    PaperController.updateScoreValidation,
    handleValidationErrors,
    PaperController.updateQuestionScore
);

// 自动组卷 (管理员)
router.post('/auto/generate', 
    authenticateToken,
    requireAdmin,
    PaperController.autoGenerate
);

module.exports = router;
