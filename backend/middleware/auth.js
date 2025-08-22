const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT验证中间件
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            success: false, 
            message: '访问令牌不存在' 
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // 兼容不同版本的token字段名
        const userId = decoded.userId || decoded.id;
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: '用户不存在' 
            });
        }
        
        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ 
            success: false, 
            message: '无效的访问令牌' 
        });
    }
};

// 管理员权限验证中间件
const requireAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ 
            success: false, 
            message: '需要管理员权限' 
        });
    }
    next();
};

// 学生权限验证中间件
const requireStudent = (req, res, next) => {
    if (req.user.role !== 'student') {
        return res.status(403).json({ 
            success: false, 
            message: '需要学生权限' 
        });
    }
    next();
};

// 角色权限验证中间件
const requireRole = (role) => {
    return (req, res, next) => {
        if (req.user.role !== role) {
            return res.status(403).json({ 
                success: false, 
                message: `需要${role}权限` 
            });
        }
        next();
    };
};

module.exports = {
    authenticateToken,
    requireAdmin,
    requireStudent,
    requireRole
};
