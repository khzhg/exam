const express = require('express');
const router = express.Router();
const ExamScheduleController = require('../controllers/ExamScheduleController');
const { authenticateToken, requireRole } = require('../middleware/auth');

// 管理员路由 - 考试安排管理
router.post('/', authenticateToken, requireRole('admin'), ExamScheduleController.create);
router.get('/', authenticateToken, requireRole('admin'), ExamScheduleController.getList);
router.get('/:id', authenticateToken, requireRole('admin'), ExamScheduleController.getDetail);
router.put('/:id', authenticateToken, requireRole('admin'), ExamScheduleController.update);
router.delete('/:id', authenticateToken, requireRole('admin'), ExamScheduleController.delete);
router.patch('/:id/status', authenticateToken, requireRole('admin'), ExamScheduleController.updateStatus);

// 学生路由 - 考试安排
router.get('/student/my-exams', authenticateToken, requireRole('student'), ExamScheduleController.getStudentSchedules);
router.post('/:id/start', authenticateToken, requireRole('student'), ExamScheduleController.startExam);

module.exports = router;
