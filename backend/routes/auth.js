const express = require('express');
const AuthController = require('../controllers/AuthController');
const { handleValidationErrors } = require('../middleware/error');

const router = express.Router();

// 用户注册
router.post('/register', 
    AuthController.registerValidation,
    handleValidationErrors,
    AuthController.register
);

// 用户登录
router.post('/login', 
    AuthController.loginValidation,
    handleValidationErrors,
    AuthController.login
);

module.exports = router;
