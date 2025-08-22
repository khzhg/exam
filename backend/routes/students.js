const express = require('express');
const StudentController = require('../controllers/StudentController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// 获取学生统计数据
router.get('/stats', 
    authenticateToken,
    StudentController.getStats
);

// 获取学生最近考试
router.get('/recent-exams', 
    authenticateToken,
    StudentController.getRecentExams
);

// 获取学生考试列表
router.get('/exams', 
    authenticateToken,
    StudentController.getExams
);

// 获取学生考试结果
router.get('/results', 
    authenticateToken,
    StudentController.getResults
);

// 获取学生错题
router.get('/wrong-questions', 
    authenticateToken,
    StudentController.getWrongQuestions
);

// 获取单个错题详情
router.get('/wrong-questions/:questionId/detail', 
    authenticateToken,
    StudentController.getWrongQuestionDetail
);

// 保存错题笔记
router.put('/wrong-questions/:questionId/note', 
    authenticateToken,
    StudentController.saveWrongQuestionNote
);

module.exports = router;
