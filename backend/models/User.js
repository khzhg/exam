const database = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
    // 创建用户
    static async create(userData) {
        const { username, password, role = 'student', real_name, email } = userData;
        
        // 密码加密
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const sql = `
            INSERT INTO users (username, password, role, real_name, email)
            VALUES (?, ?, ?, ?, ?)
        `;
        
        const result = await database.run(sql, [username, hashedPassword, role, real_name, email]);
        return result.lastID;
    }

    // 根据用户名查找用户
    static async findByUsername(username) {
        const sql = 'SELECT * FROM users WHERE username = ?';
        return await database.get(sql, [username]);
    }

    // 根据ID查找用户
    static async findById(id) {
        const sql = 'SELECT id, username, role, real_name, email, created_at FROM users WHERE id = ?';
        return await database.get(sql, [id]);
    }

    // 验证密码
    static async validatePassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    // 获取所有学生
    static async getAllStudents() {
        const sql = `
            SELECT id, username, real_name, email, created_at 
            FROM users 
            WHERE role = 'student' 
            ORDER BY created_at DESC
        `;
        return await database.query(sql);
    }

    // 更新用户信息
    static async update(id, userData) {
        const { username, real_name, email } = userData;
        
        // 构建动态SQL
        const updates = [];
        const params = [];
        
        if (username !== undefined) {
            updates.push('username = ?');
            params.push(username);
        }
        if (real_name !== undefined) {
            updates.push('real_name = ?');
            params.push(real_name);
        }
        if (email !== undefined) {
            updates.push('email = ?');
            params.push(email);
        }
        
        if (updates.length === 0) {
            return false;
        }
        
        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);
        
        const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        const result = await database.run(sql, params);
        return result.changes > 0;
    }

    // 修改密码
    static async changePassword(id, newPassword) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
        
        const sql = 'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        const result = await database.run(sql, [hashedPassword, id]);
        return result.changes > 0;
    }

    // 删除用户
    static async delete(id) {
        // 先删除依赖表中的数据，避免外键约束错误
        // 1. 删除该用户的 exam_records
        const examRecords = await database.query('SELECT id FROM exam_records WHERE user_id = ?', [id]);
        if (examRecords && examRecords.length > 0) {
            const examRecordIds = examRecords.map(r => r.id);
            // 2. 删除 answer_records 中 exam_record_id 属于该用户的记录
            const placeholders = examRecordIds.map(() => '?').join(',');
            await database.run(`DELETE FROM answer_records WHERE exam_record_id IN (${placeholders})`, examRecordIds);
        }
        // 3. 删除 exam_records
        await database.run('DELETE FROM exam_records WHERE user_id = ?', [id]);
        // 4. 删除 wrong_questions
        await database.run('DELETE FROM wrong_questions WHERE user_id = ?', [id]);
        // 其他依赖表可按需补充

        const sql = 'DELETE FROM users WHERE id = ? AND role != "admin"';
        const result = await database.run(sql, [id]);
        return result.changes > 0;
    }

    // 统计学生数量
    static async countStudents() {
        const sql = 'SELECT COUNT(*) as count FROM users WHERE role = "student"';
        const result = await database.get(sql);
        return result.count;
    }

    // 统计管理员数量
    static async countAdmins() {
        const sql = 'SELECT COUNT(*) as count FROM users WHERE role = "admin"';
        const result = await database.get(sql);
        return result.count;
    }

    // 获取用户列表（分页）
    static async getUsers(options = {}) {
        const { page = 1, limit = 10, role } = options;
        let whereClause = '';
        let params = [];
        
        if (role) {
            whereClause = 'WHERE role = ?';
            params.push(role);
        }
        
        const offset = (page - 1) * limit;
        const sql = `
            SELECT id, username, role, real_name, email, created_at 
            FROM users 
            ${whereClause}
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `;
        
        return await database.query(sql, [...params, limit, offset]);
    }
}

module.exports = User;
