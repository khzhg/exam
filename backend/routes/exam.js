const express = require('express');
const ExamController = require('../controllers/ExamController');
const { authenticateToken } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/error');

const router = express.Router();

// 开始考试
router.post('/start', 
    authenticateToken,
    ExamController.startExamValidation,
    handleValidationErrors,
    ExamController.startExam
);

// 提交答案
router.post('/answer', 
    authenticateToken,
    ExamController.submitAnswerValidation,
    handleValidationErrors,
    ExamController.submitAnswer
);

// 完成考试
router.post('/finish', 
    authenticateToken,
    ExamController.finishExamValidation,
    handleValidationErrors,
    ExamController.finishExam
);

// 提交试卷（新增路由）
router.post('/:examRecordId/submit', 
    authenticateToken,
    ExamController.finishExam
);

// 获取用户考试历史
router.get('/history/user', 
    authenticateToken,
    ExamController.getUserHistory
);

// 随机练习
router.get('/practice/random', 
    authenticateToken,
    ExamController.randomPractice
);

// 获取考试进度
router.get('/:examRecordId/progress', 
    authenticateToken,
    ExamController.getProgress
);

// 查看考试结果
router.get('/:examRecordId/result', 
    authenticateToken,
    ExamController.viewResult
);

// 获取考试详情（必须放在最后，避免与其他路由冲突）
router.get('/:examRecordId', 
    authenticateToken,
    ExamController.getExamDetail
);

module.exports = router;
