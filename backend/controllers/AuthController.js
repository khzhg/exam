const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');

class AuthController {
    // 用户注册
    static async register(req, res) {
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
            
            // 创建用户
            const userId = await User.create({
                username,
                password,
                role: 'student',
                real_name,
                email
            });
            
            res.status(201).json({
                success: true,
                message: '注册成功',
                data: { userId }
            });
        } catch (error) {
            console.error('Register error:', error);
            res.status(500).json({
                success: false,
                message: '注册失败',
                error: error.message
            });
        }
    }

    // 用户登录
    static async login(req, res) {
        try {
            const { username, password } = req.body;
            
            // 查找用户
            const user = await User.findByUsername(username);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }
            
            // 验证密码
            const isValidPassword = await User.validatePassword(password, user.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }
            
            // 生成JWT token
            const token = jwt.sign(
                { userId: user.id, username: user.username, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE || '24h' }
            );
            
            res.json({
                success: true,
                message: '登录成功',
                data: {
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        role: user.role,
                        real_name: user.real_name,
                        email: user.email
                    }
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                message: '登录失败',
                error: error.message
            });
        }
    }

    // 获取当前用户信息
    static async profile(req, res) {
        try {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: '用户不存在'
                });
            }
            
            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            console.error('Profile error:', error);
            res.status(500).json({
                success: false,
                message: '获取用户信息失败',
                error: error.message
            });
        }
    }

    // 修改密码
    static async changePassword(req, res) {
        try {
            const { oldPassword, newPassword } = req.body;
            const userId = req.user.id;
            
            // 获取用户信息
            const user = await User.findByUsername(req.user.username);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: '用户不存在'
                });
            }
            
            // 验证旧密码
            const isValidPassword = await User.validatePassword(oldPassword, user.password);
            if (!isValidPassword) {
                return res.status(401).json({
                    success: false,
                    message: '旧密码错误'
                });
            }
            
            // 更新密码
            const success = await User.changePassword(userId, newPassword);
            if (!success) {
                return res.status(400).json({
                    success: false,
                    message: '密码修改失败'
                });
            }
            
            res.json({
                success: true,
                message: '密码修改成功'
            });
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: '密码修改失败',
                error: error.message
            });
        }
    }

    // 更新用户信息
    static async updateProfile(req, res) {
        try {
            const { real_name, email } = req.body;
            const userId = req.user.id;
            
            const success = await User.update(userId, { real_name, email });
            if (!success) {
                return res.status(400).json({
                    success: false,
                    message: '更新失败'
                });
            }
            
            res.json({
                success: true,
                message: '信息更新成功'
            });
        } catch (error) {
            console.error('Update profile error:', error);
            res.status(500).json({
                success: false,
                message: '更新失败',
                error: error.message
            });
        }
    }
}

// 验证规则
AuthController.registerValidation = [
    body('username').isLength({ min: 3, max: 20 }).withMessage('用户名长度必须在3-20字符之间'),
    body('password').isLength({ min: 6 }).withMessage('密码长度至少6字符'),
    body('real_name').optional().isLength({ max: 100 }).withMessage('真实姓名长度不能超过100字符'),
    body('email').optional().isEmail().withMessage('请输入有效的邮箱地址')
];

AuthController.loginValidation = [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空')
];

AuthController.changePasswordValidation = [
    body('oldPassword').notEmpty().withMessage('旧密码不能为空'),
    body('newPassword').isLength({ min: 6 }).withMessage('新密码长度至少6字符')
];

module.exports = AuthController;
