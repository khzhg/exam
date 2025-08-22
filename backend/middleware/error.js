const { validationResult } = require('express-validator');

// 验证结果处理中间件
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
        console.log('参数验证失败 - URL:', req.url);
        console.log('参数验证失败 - 请求体:', req.body);
        console.log('参数验证失败 - 错误详情:', errors.array());
        
        return res.status(400).json({
            success: false,
            message: '输入数据验证失败',
            errors: errors.array()
        });
    }
    
    next();
};

// 错误处理中间件
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);
    
    // 数据库错误
    if (err.code === 'SQLITE_CONSTRAINT') {
        return res.status(400).json({
            success: false,
            message: '数据约束违反',
            error: err.message
        });
    }
    
    // JSON解析错误
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            success: false,
            message: 'JSON格式错误'
        });
    }
    
    // 默认服务器错误
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

// 404处理中间件
const notFound = (req, res) => {
    res.status(404).json({
        success: false,
        message: '请求的资源不存在'
    });
};

module.exports = {
    handleValidationErrors,
    errorHandler,
    notFound
};
