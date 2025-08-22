const cron = require('node-cron');
const QuestionController = require('../controllers/QuestionController');

class FileCleanupScheduler {
    static init() {
        // 每天凌晨2点执行文件清理
        cron.schedule('0 2 * * *', async () => {
            console.log('开始执行定时文件清理任务...');
            
            try {
                // 模拟请求对象
                const mockReq = {};
                const mockRes = {
                    json: (data) => {
                        console.log('定时清理结果:', data);
                    },
                    status: (code) => ({
                        json: (data) => {
                            console.error(`定时清理失败 (${code}):`, data);
                        }
                    })
                };
                
                await QuestionController.cleanupTempFiles(mockReq, mockRes);
                console.log('定时文件清理任务完成');
            } catch (error) {
                console.error('定时文件清理任务失败:', error);
            }
        });
        
        console.log('文件清理定时任务已启动：每天凌晨2点执行');
    }
}

module.exports = FileCleanupScheduler;
