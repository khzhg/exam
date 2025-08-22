const database = require('../config/database');

class AnswerRecord {
    // 保存答题记录
    static async create(answerData) {
        const { exam_record_id, question_id, user_answer, is_correct, score, answer_time } = answerData;
        
        const sql = `
            INSERT INTO answer_records (exam_record_id, question_id, user_answer, is_correct, score, answer_time)
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const result = await database.run(sql, [exam_record_id, question_id, user_answer, is_correct, score, answer_time || null]);
        return result.lastID;
    }

    // 更新答题记录
    static async update(examRecordId, questionId, userAnswer, isCorrect, score, answerTime) {
        const sql = `
            UPDATE answer_records 
            SET user_answer = ?, is_correct = ?, score = ?, answer_time = ?, answered_at = CURRENT_TIMESTAMP
            WHERE exam_record_id = ? AND question_id = ?
        `;
        
        const result = await database.run(sql, [userAnswer, isCorrect, score, answerTime || null, examRecordId, questionId]);
        
        if (result.changes === 0) {
            // 如果没有更新记录，则创建新记录
            return await this.create({
                exam_record_id: examRecordId,
                question_id: questionId,
                user_answer: userAnswer,
                is_correct: isCorrect,
                score: score,
                answer_time: answerTime
            });
        }
        
        return true;
    }

    // 获取考试的所有答题记录
    static async getByExamRecord(examRecordId) {
        const sql = `
            SELECT ar.*, q.type, q.title, q.content, q.options, q.correct_answer, q.explanation
            FROM answer_records ar
            LEFT JOIN questions q ON ar.question_id = q.id
            WHERE ar.exam_record_id = ?
            ORDER BY ar.answered_at ASC
        `;
        
        const records = await database.query(sql, [examRecordId]);
        
        // 解析options字段
        records.forEach(record => {
            if (record.options) {
                try {
                    record.options = JSON.parse(record.options);
                } catch (e) {
                    record.options = [];
                }
            }
        });
        
        return records;
    }

    // 获取单个答题记录
    static async getAnswer(examRecordId, questionId) {
        const sql = `
            SELECT * FROM answer_records 
            WHERE exam_record_id = ? AND question_id = ?
        `;
        
        return await database.get(sql, [examRecordId, questionId]);
    }

    // 计算考试总分
    static async calculateTotalScore(examRecordId) {
        const sql = `
            SELECT SUM(score) as total_score
            FROM answer_records
            WHERE exam_record_id = ?
        `;
        
        const result = await database.get(sql, [examRecordId]);
        return result.total_score || 0;
    }

    // 获取错题(用于更新错题表)
    static async getWrongAnswers(examRecordId) {
        const sql = `
            SELECT ar.question_id, ar.user_answer, q.correct_answer, er.user_id
            FROM answer_records ar
            LEFT JOIN questions q ON ar.question_id = q.id
            LEFT JOIN exam_records er ON ar.exam_record_id = er.id
            WHERE ar.exam_record_id = ? AND ar.is_correct = 0
        `;
        
        return await database.query(sql, [examRecordId]);
    }

    // 批量保存答题记录
    static async batchCreate(answersData) {
        const results = [];
        
        for (const answerData of answersData) {
            try {
                const id = await this.create(answerData);
                results.push({ success: true, id });
            } catch (error) {
                results.push({ success: false, error: error.message });
            }
        }
        
        return results;
    }

    // 检查题目是否已答
    static async isAnswered(examRecordId, questionId) {
        const sql = `
            SELECT COUNT(*) as count 
            FROM answer_records 
            WHERE exam_record_id = ? AND question_id = ?
        `;
        
        const result = await database.get(sql, [examRecordId, questionId]);
        return result.count > 0;
    }

    // 获取答题进度
    static async getProgress(examRecordId) {
        const sql = `
            SELECT 
                COUNT(DISTINCT pq.question_id) as total_questions,
                COUNT(DISTINCT ar.question_id) as answered_questions
            FROM exam_records er
            LEFT JOIN paper_questions pq ON er.paper_id = pq.paper_id
            LEFT JOIN answer_records ar ON er.id = ar.exam_record_id AND pq.question_id = ar.question_id
            WHERE er.id = ?
        `;
        
        const result = await database.get(sql, [examRecordId]);
        return {
            total: result.total_questions || 0,
            answered: result.answered_questions || 0,
            percentage: result.total_questions > 0 ? 
                Math.round((result.answered_questions / result.total_questions) * 100) : 0
        };
    }

    // 删除考试的所有答题记录
    static async deleteByExamRecord(examRecordId) {
        const sql = 'DELETE FROM answer_records WHERE exam_record_id = ?';
        const result = await database.run(sql, [examRecordId]);
        return result.changes;
    }
}

module.exports = AnswerRecord;
