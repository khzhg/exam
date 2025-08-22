const express = require('express');
const QuestionController = require('../controllers/QuestionController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/error');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// 文件上传配置
const upload = multer({
    dest: path.join(__dirname, '../uploads/'),
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB
    },
    fileFilter: (req, file, cb) => {
        if (file.originalname.match(/\.(xlsx|xls|docx|doc|txt)$/)) {
            cb(null, true);
        } else {
            cb(new Error('只允许上传Excel、Word或文本文件'), false);
        }
    }
});

// 获取题目列表
router.get('/', 
    authenticateToken,
    QuestionController.getList
);

// 按内容搜索题库（必须在 /:id 路由之前，避免被通配符拦截）
router.get('/search', authenticateToken, QuestionController.searchByContent);

// 获取题目详情
router.get('/:id', 
    authenticateToken,
    QuestionController.getById
);

// 创建题目 (管理员)
router.post('/', 
    authenticateToken,
    requireAdmin,
    QuestionController.createValidation,
    handleValidationErrors,
    QuestionController.create
);

// 更新题目 (管理员)
router.put('/:id', 
    authenticateToken,
    requireAdmin,
    QuestionController.updateValidation,
    handleValidationErrors,
    QuestionController.update
);

// 删除题目 (管理员)
router.delete('/:id', 
    authenticateToken,
    requireAdmin,
    QuestionController.delete
);

// 批量删除题目 (管理员)
router.post('/batch/delete', 
    authenticateToken,
    requireAdmin,
    QuestionController.batchDelete
);

// 随机获取题目
router.get('/random/list', 
    authenticateToken,
    QuestionController.getRandomQuestions
);

// Excel批量导入 (管理员)
router.post('/import/excel', 
    authenticateToken,
    requireAdmin,
    upload.single('file'),
    QuestionController.importFromExcel
);

// Word批量导入 (管理员)
router.post('/import/word', 
    authenticateToken,
    requireAdmin,
    upload.single('file'),
    QuestionController.importFromWord
);

// 下载Excel模板 (管理员)
router.get('/template/download', 
    authenticateToken,
    requireAdmin,
    QuestionController.downloadTemplate
);

// 下载Word模板 (管理员)
router.get('/template/word/download', 
    authenticateToken,
    requireAdmin,
    QuestionController.downloadWordTemplate
);

// 获取科目列表
router.get('/subjects/list', 
    authenticateToken,
    QuestionController.getSubjects
);

// 获取题目统计 (管理员)
router.get('/statistics/overview', 
    authenticateToken,
    requireAdmin,
    QuestionController.getStatistics
);

// 清理临时文件 (管理员)
router.post('/files/cleanup', 
    authenticateToken,
    requireAdmin,
    QuestionController.cleanupTempFiles
);

// 获取上传文件状态 (管理员)
router.get('/files/status', 
    authenticateToken,
    requireAdmin,
    QuestionController.getUploadStatus
);

module.exports = router;
