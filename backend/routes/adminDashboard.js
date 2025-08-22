const express = require('express');
const AdminController = require('../controllers/AdminController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// 管理员仪表板统计
router.get('/dashboard/stats', 
    authenticateToken,
    requireAdmin,
    AdminController.getDashboardStats
);

// 用户管理
router.get('/users', 
    authenticateToken,
    requireAdmin,
    AdminController.getUsers
);

router.post('/users', 
    authenticateToken,
    requireAdmin,
    AdminController.createUser
);

router.put('/users/:id', 
    authenticateToken,
    requireAdmin,
    AdminController.updateUser
);

router.delete('/users/:id', 
    authenticateToken,
    requireAdmin,
    AdminController.deleteUser
);

router.post('/users/:id/reset-password', 
    authenticateToken,
    requireAdmin,
    AdminController.resetUserPassword
);

// 考试统计
router.get('/stats/exams', 
    authenticateToken,
    requireAdmin,
    AdminController.getExamStats
);

router.get('/stats/scores', 
    authenticateToken,
    requireAdmin,
    AdminController.getScoreStats
);

// 详情统计
router.get('/stats/student/:id', 
    authenticateToken,
    requireAdmin,
    AdminController.getStudentDetail
);

router.get('/stats/exam/:id', 
    authenticateToken,
    requireAdmin,
    AdminController.getExamDetail
);

router.get('/stats/question/:id', 
    authenticateToken,
    requireAdmin,
    AdminController.getQuestionDetail
);

module.exports = router;
