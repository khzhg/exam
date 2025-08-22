const ExamRecord = require('../models/ExamRecord');
const AnswerRecord = require('../models/AnswerRecord');
const WrongQuestion = require('../models/WrongQuestion');
const Paper = require('../models/Paper');
const Question = require('../models/Question');
const { body } = require('express-validator');

class ExamController {
    // 开始考试
    static async startExam(req, res) {
        try {
            const { paperId, type = 'exam' } = req.body;
            const userId = req.user.id;
            
            console.log('开始考试请求 - paperId:', paperId, 'type:', type, 'userId:', userId);
            console.log('请求体内容:', req.body);
            
            // 检查试卷是否存在
            const paper = await Paper.getById(paperId);
            if (!paper) {
                console.log('试卷不存在:', paperId);
                return res.status(404).json({
                    success: false,
                    message: '试卷不存在'
                });
            }
            
            // 检查是否可以开始考试
            const canStart = await ExamRecord.canStartExam(userId, paperId, type);
            if (!canStart && type === 'exam') {
                return res.status(400).json({
                    success: false,
                    message: '您已参加过此次考试'
                });
            }
            
            // 检查是否有正在进行的考试（只对正式考试检查）
            const ongoingExam = await ExamRecord.getOngoingExam(userId, paperId);
            if (ongoingExam && type === 'exam') {
                return res.status(400).json({
                    success: false,
                    message: '您有正在进行的考试',
                    data: { examRecordId: ongoingExam.id }
                });
            }
            
            // 如果是练习模式且有正在进行的练习，返回现有的练习记录
            if (ongoingExam && type === 'practice') {
                console.log('发现正在进行的练习，返回现有记录:', ongoingExam.id);
                
                // 获取试卷题目
                const questions = await Paper.getQuestions(paperId);
                
                // 隐藏正确答案(考试时不显示)
                const examQuestions = questions.map(q => ({
                    id: q.id,
                    type: q.type,
                    title: q.title,
                    content: q.content,
                    options: q.options,
                    score: q.score,
                    sort_order: q.sort_order
                }));
                
                return res.status(200).json({
                    success: true,
                    message: '继续练习',
                    data: {
                        examRecordId: ongoingExam.id,
                        paper: {
                            id: paper.id,
                            title: paper.title,
                            description: paper.description,
                            duration: paper.duration,
                            total_score: paper.total_score
                        },
                        questions: examQuestions
                    }
                });
            }
            
            // 创建考试记录
            const examRecordId = await ExamRecord.create({
                user_id: userId,
                paper_id: paperId,
                type
            });
            
            // 获取试卷题目
            const questions = await Paper.getQuestions(paperId);
            
            // 隐藏正确答案(考试时不显示)
            const examQuestions = questions.map(q => ({
                id: q.id,
                type: q.type,
                title: q.title,
                content: q.content,
                options: q.options,
                score: q.score,
                sort_order: q.sort_order
            }));
            
            res.status(201).json({
                success: true,
                message: '考试开始',
                data: {
                    examRecordId,
                    paper: {
                        id: paper.id,
                        title: paper.title,
                        description: paper.description,
                        duration: paper.duration,
                        total_score: paper.total_score
                    },
                    questions: examQuestions
                }
            });
            
        } catch (error) {
            console.error('Start exam error:', error);
            res.status(500).json({
                success: false,
                message: '开始考试失败',
                error: error.message
            });
        }
    }

    // 获取考试详情
    static async getExamDetail(req, res) {
        try {
            const { examRecordId } = req.params;
            const userId = req.user.id;
            
            console.log('获取考试详情 - 考试记录ID:', examRecordId, '用户ID:', userId);
            
            // 获取考试记录
            const examRecord = await ExamRecord.getById(examRecordId);
            if (!examRecord) {
                console.log('考试记录不存在');
                return res.status(404).json({
                    success: false,
                    message: '考试记录不存在'
                });
            }
            
            // 验证权限
            if (examRecord.user_id !== userId) {
                console.log('权限验证失败 - 记录用户ID:', examRecord.user_id, '当前用户ID:', userId);
                return res.status(403).json({
                    success: false,
                    message: '无权限访问此考试'
                });
            }
            
            console.log('考试记录:', examRecord);
            
            // 获取试卷信息
            const paper = await Paper.getById(examRecord.paper_id);
            if (!paper) {
                console.log('试卷不存在');
                return res.status(404).json({
                    success: false,
                    message: '试卷不存在'
                });
            }
            
            // 检查考试是否超时（仅对进行中的正式考试）
            if (examRecord.status === 'ongoing' && examRecord.type === 'exam' && examRecord.start_time && paper.duration) {
                // 重新设计超时检查逻辑，确保时间计算正确
                const startTime = new Date(examRecord.start_time);
                const currentTime = new Date();
                const duration = paper.duration * 60 * 1000; // 转换为毫秒
                
                // 计算已过时间（使用毫秒差值）
                const elapsed = currentTime.getTime() - startTime.getTime();
                
                console.log('=== 优化后的考试超时检查 ===');
                console.log('考试记录开始时间（原始）:', examRecord.start_time);
                console.log('解析后的开始时间:', startTime.toISOString());
                console.log('当前时间:', currentTime.toISOString());
                console.log('开始时间戳:', startTime.getTime());
                console.log('当前时间戳:', currentTime.getTime());
                console.log('已过时间(毫秒):', elapsed);
                console.log('已过时间(分钟):', Math.floor(elapsed / 60000));
                console.log('考试时长(分钟):', paper.duration);
                console.log('考试时长(毫秒):', duration);
                
                // 增加5分钟容错时间，避免网络延迟等因素导致误判
                const timeoutBuffer = 5 * 60 * 1000; // 5分钟缓冲
                const shouldTimeout = elapsed > (duration + timeoutBuffer);
                
                console.log('容错阈值(分钟):', (duration + timeoutBuffer) / 60000);
                console.log('是否应该超时:', shouldTimeout);
                console.log('=== 超时检查结束 ===');
                
                if (shouldTimeout) {
                    // 考试超时，自动标记为超时状态
                    console.log('正式考试超时，自动完成考试');
                    await ExamRecord.timeout(examRecordId);
                    // 重新获取更新后的考试记录
                    const updatedExamRecord = await ExamRecord.getById(examRecordId);
                    if (updatedExamRecord) {
                        Object.assign(examRecord, updatedExamRecord);
                    }
                } else {
                    console.log('考试未超时，继续进行');
                }
            }
            
            // 获取试卷题目
            const questions = await Paper.getQuestions(examRecord.paper_id);
            
            // 获取已提交的答案
            const answers = await AnswerRecord.getByExamRecord(examRecordId);
            
            // 组装考试数据
            const examQuestions = questions.map(q => {
                const answer = answers.find(a => a.question_id === q.id);
                return {
                    id: q.id,
                    type: q.type,
                    title: q.title,
                    content: q.content,
                    options: q.options,
                    score: q.score,
                    sort_order: q.sort_order,
                    user_answer: answer ? answer.user_answer : null,
                    is_correct: answer ? answer.is_correct : null,
                    answer_score: answer ? answer.score : 0
                };
            });
            
            res.json({
                success: true,
                data: {
                    id: examRecord.id,
                    paper_id: examRecord.paper_id,
                    type: examRecord.type,
                    start_time: examRecord.start_time,
                    end_time: examRecord.end_time,
                    status: examRecord.status,
                    total_score: examRecord.total_score,
                    obtained_score: examRecord.obtained_score,
                    paper: {
                        id: paper.id,
                        title: paper.title,
                        description: paper.description,
                        duration: paper.duration,
                        total_score: paper.total_score
                    },
                    questions: examQuestions
                }
            });
            
        } catch (error) {
            console.error('获取考试详情失败:', error);
            res.status(500).json({
                success: false,
                message: '获取考试详情失败'
            });
        }
    }

    // 提交答案
    static async submitAnswer(req, res) {
        try {
            const { examRecordId, questionId, answer: userAnswer } = req.body;
            const userId = req.user.id;
            
            console.log('提交答案请求:', { examRecordId, questionId, userAnswer, userId });
            
            // 参数验证
            if (!examRecordId || !questionId) {
                console.log('参数验证失败: 缺少必要参数');
                return res.status(400).json({
                    success: false,
                    message: '缺少必要参数'
                });
            }
            
            // 验证考试记录是否属于当前用户
            console.log('验证考试记录...');
            const examRecord = await ExamRecord.getById(examRecordId);
            console.log('获取到的考试记录:', examRecord);
            
            if (!examRecord || examRecord.user_id !== userId) {
                console.log('权限验证失败:', { examRecord, userId });
                return res.status(403).json({
                    success: false,
                    message: '无权限访问此考试'
                });
            }
            
            if (examRecord.status !== 'ongoing') {
                console.log('考试状态验证失败:', examRecord.status);
                return res.status(400).json({
                    success: false,
                    message: '考试已结束，无法提交答案'
                });
            }
            
            // 获取题目信息
            console.log('获取题目信息...');
            const question = await Question.getById(questionId);
            console.log('获取到的题目:', question);
            
            if (!question) {
                console.log('题目不存在:', questionId);
                return res.status(404).json({
                    success: false,
                    message: '题目不存在'
                });
            }
            
            // 获取题目在试卷中的分值
            console.log('获取题目在试卷中的分值...');
            const questionScore = await ExamController.getQuestionScoreInPaper(examRecord.paper_id, questionId);
            console.log('题目在试卷中的分值:', questionScore);
            
            // 将试卷中的分值添加到题目对象中
            question.score = questionScore;
            
            // 判断答案是否正确并计算分数
            console.log('评估答案...');
            const { isCorrect, score } = ExamController.evaluateAnswer(question, userAnswer);
            console.log('答案评估结果:', { isCorrect, score });
            
            // 保存答题记录
            console.log('保存答题记录...');
            await AnswerRecord.update(examRecordId, questionId, userAnswer, isCorrect, score);
            console.log('答题记录保存成功');
            
            res.json({
                success: true,
                message: '答案提交成功',
                data: {
                    isCorrect,
                    score
                }
            });
            
        } catch (error) {
            console.error('Submit answer error:', error);
            console.error('Error stack:', error.stack);
            res.status(500).json({
                success: false,
                message: '提交答案失败',
                error: error.message
            });
        }
    }

    // 完成考试
    static async finishExam(req, res) {
        try {
            // 支持两种方式：body中的examRecordId 或 URL参数中的examRecordId
            const examRecordId = req.body.examRecordId || req.params.examRecordId;
            const userId = req.user.id;
            
            if (!examRecordId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少考试记录ID'
                });
            }
            
            // 验证考试记录
            const examRecord = await ExamRecord.getById(examRecordId);
            if (!examRecord || examRecord.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: '无权限访问此考试'
                });
            }
            
            if (examRecord.status !== 'ongoing') {
                return res.status(400).json({
                    success: false,
                    message: '考试已结束'
                });
            }
            
            // 计算总分
            const totalScore = await AnswerRecord.calculateTotalScore(examRecordId);
            
            // 更新考试记录
            await ExamRecord.complete(examRecordId, totalScore);
            
            // 获取错题并更新错题表
            const wrongAnswers = await AnswerRecord.getWrongAnswers(examRecordId);
            if (wrongAnswers.length > 0) {
                await WrongQuestion.batchAdd(wrongAnswers);
            }
            
            // 获取考试结果
            const result = await ExamController.getExamResult(examRecordId);
            
            res.json({
                success: true,
                code: 200,
                message: '考试完成',
                data: result
            });
            
        } catch (error) {
            console.error('Finish exam error:', error);
            res.status(500).json({
                success: false,
                message: '完成考试失败',
                error: error.message
            });
        }
    }

    // 获取考试进度
    static async getProgress(req, res) {
        try {
            const { examRecordId } = req.params;
            const userId = req.user.id;
            
            // 验证考试记录
            const examRecord = await ExamRecord.getById(examRecordId);
            if (!examRecord || examRecord.user_id !== userId) {
                return res.status(403).json({
                    success: false,
                    message: '无权限访问此考试'
                });
            }
            
            const progress = await AnswerRecord.getProgress(examRecordId);
            
            res.json({
                success: true,
                data: progress
            });
            
        } catch (error) {
            console.error('Get progress error:', error);
            res.status(500).json({
                success: false,
                message: '获取进度失败',
                error: error.message
            });
        }
    }

    // 获取考试结果
    static async getExamResult(examRecordId) {
        const examRecord = await ExamRecord.getById(examRecordId);
        const answerRecords = await AnswerRecord.getByExamRecord(examRecordId);
        
        // 获取每个答题记录对应的题目详细信息
        const answersWithQuestions = await Promise.all(
            answerRecords.map(async (answer) => {
                const question = await Question.getById(answer.question_id);
                return {
                    ...answer,
                    question: {
                        id: question.id,
                        type: question.type,
                        title: question.title,
                        content: question.content,
                        options: question.options || [],
                        correct_answer: question.correct_answer,
                        explanation: question.explanation
                    }
                };
            })
        );
        
        const result = {
            examRecord: {
                id: examRecord.id,
                type: examRecord.type,
                start_time: examRecord.start_time,
                end_time: examRecord.end_time,
                duration: examRecord.duration,
                obtained_score: examRecord.obtained_score,
                status: examRecord.status
            },
            paper: {
                title: examRecord.paper_title,
                total_score: examRecord.paper_total_score || 100
            },
            answers: answersWithQuestions,
            statistics: {
                total_questions: answerRecords.length,
                correct_count: answerRecords.filter(a => a.is_correct).length,
                wrong_count: answerRecords.filter(a => !a.is_correct).length,
                accuracy: answerRecords.length > 0 ? 
                    Math.round((answerRecords.filter(a => a.is_correct).length / answerRecords.length) * 100) : 0
            }
        };
        
        return result;
    }

    // 查看考试结果
    static async viewResult(req, res) {
        try {
            const { examRecordId } = req.params;
            const userId = req.user.id;
            
            console.log('查看考试结果 - examRecordId:', examRecordId, 'userId:', userId);
            
            // 验证考试记录
            const examRecord = await ExamRecord.getById(examRecordId);
            console.log('查看考试结果 - examRecord:', examRecord);
            
            if (!examRecord) {
                console.log('查看考试结果 - 考试记录不存在');
                return res.status(404).json({
                    success: false,
                    message: '考试记录不存在'
                });
            }
            
            // 数据类型转换确保比较准确
            const recordUserId = parseInt(examRecord.user_id);
            const currentUserId = parseInt(userId);
            
            console.log('查看考试结果 - recordUserId:', recordUserId, 'currentUserId:', currentUserId);
            
            if (recordUserId !== currentUserId) {
                console.log('查看考试结果 - 权限验证失败');
                return res.status(403).json({
                    success: false,
                    message: '无权限访问此考试'
                });
            }
            
            const result = await ExamController.getExamResult(examRecordId);
            
            res.json({
                success: true,
                data: result
            });
            
        } catch (error) {
            console.error('View result error:', error);
            res.status(500).json({
                success: false,
                message: '查看结果失败',
                error: error.message
            });
        }
    }

    // 获取用户考试历史
    static async getUserHistory(req, res) {
        try {
            const { page = 1, limit = 10, type } = req.query;
            const userId = req.user.id;
            
            const result = await ExamRecord.getUserRecords(
                userId, 
                parseInt(page), 
                parseInt(limit), 
                type
            );
            
            res.json({
                success: true,
                data: result
            });
            
        } catch (error) {
            console.error('Get user history error:', error);
            res.status(500).json({
                success: false,
                message: '获取考试历史失败',
                error: error.message
            });
        }
    }

    // 随机练习
    static async randomPractice(req, res) {
        try {
            const { count = 10, type, subject } = req.query;
            const userId = req.user.id;
            
            const filters = {};
            if (type) filters.type = type;
            if (subject) filters.subject = subject;
            
            // 获取随机题目
            const questions = await Question.getRandomQuestions(parseInt(count), filters);
            
            if (questions.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '没有找到符合条件的题目'
                });
            }
            
            // 创建练习记录
            const examRecordId = await ExamRecord.create({
                user_id: userId,
                paper_id: null, // 随机练习没有固定试卷
                type: 'practice'
            });
            
            res.json({
                success: true,
                message: '开始随机练习',
                data: {
                    examRecordId,
                    questions: questions.map(q => ({
                        id: q.id,
                        type: q.type,
                        title: q.title,
                        content: q.content,
                        options: q.options,
                        score: 5 // 练习题默认5分
                    }))
                }
            });
            
        } catch (error) {
            console.error('Random practice error:', error);
            res.status(500).json({
                success: false,
                message: '开始随机练习失败',
                error: error.message
            });
        }
    }

    // 获取题目在试卷中的分值
    static async getQuestionScoreInPaper(paperId, questionId) {
        const database = require('../config/database');
        try {
            const sql = `
                SELECT score 
                FROM paper_questions 
                WHERE paper_id = ? AND question_id = ?
            `;
            const result = await database.get(sql, [paperId, questionId]);
            
            if (result) {
                console.log(`题目${questionId}在试卷${paperId}中的分值:`, result.score);
                return result.score;
            } else {
                console.log(`题目${questionId}在试卷${paperId}中未找到，使用默认分值5分`);
                return 5; // 默认分值
            }
        } catch (error) {
            console.error('获取题目分值失败:', error);
            return 5; // 出错时使用默认分值
        }
    }

    // 评估答案
    static evaluateAnswer(question, userAnswer) {
        let isCorrect = false;
        let score = 0;
        
        console.log('评估答案 - 题目类型:', question.type);
        console.log('评估答案 - 用户答案:', userAnswer);
        console.log('评估答案 - 正确答案:', question.correct_answer);
        
        // 检查答案是否为空 - 需要根据答案类型判断
        if (!userAnswer) {
            console.log('评估答案 - 用户答案为空');
            return { isCorrect: false, score: 0 };
        }
        
        // 对于数组类型的答案（多选题），检查是否为空数组
        if (Array.isArray(userAnswer) && userAnswer.length === 0) {
            console.log('评估答案 - 用户答案为空数组');
            return { isCorrect: false, score: 0 };
        }
        
        // 对于字符串类型的答案，检查是否为空字符串
        if (typeof userAnswer === 'string' && userAnswer.trim() === '') {
            console.log('评估答案 - 用户答案为空字符串');
            return { isCorrect: false, score: 0 };
        }
        
        switch (question.type) {
            case 'single':
            case 'truefalse':
                isCorrect = userAnswer.trim().toLowerCase() === question.correct_answer.trim().toLowerCase();
                console.log('评估答案 - 单选/判断题结果:', isCorrect);
                break;
                
            case 'multiple':
                // 多选题答案处理 - 前端发送的是数组
                console.log('评估答案 - 多选题处理开始');
                let userAnswers;
                if (Array.isArray(userAnswer)) {
                    // 前端发送的是数组格式
                    userAnswers = userAnswer.map(a => a.trim()).sort();
                } else {
                    // 如果是字符串格式（逗号分隔）
                    userAnswers = userAnswer.split(',').map(a => a.trim()).sort();
                }
                const correctAnswers = question.correct_answer.split(',').map(a => a.trim()).sort();
                console.log('评估答案 - 用户答案数组:', userAnswers);
                console.log('评估答案 - 正确答案数组:', correctAnswers);
                isCorrect = JSON.stringify(userAnswers) === JSON.stringify(correctAnswers);
                console.log('评估答案 - 多选题结果:', isCorrect);
                break;
                
            case 'fill':
                // 填空题答案分隔符：用户答题用 ||，后台管理用 ||
                // 处理中文输入法状态下的符号：｜｜ 转换为 ||
                let userFillAnswers;
                let normalizedUserAnswer = userAnswer
                    .replace(/｜｜/g, '||')  // 中文状态的｜｜转换为||
                    .replace(/｜/g, '|');    // 中文状态的｜转换为|
                
                if (normalizedUserAnswer.includes('||')) {
                    userFillAnswers = normalizedUserAnswer.split('||').map(a => a.trim().toLowerCase());
                } else if (normalizedUserAnswer.includes('，')) {
                    userFillAnswers = normalizedUserAnswer.split('，').map(a => a.trim().toLowerCase());
                } else if (normalizedUserAnswer.includes(',')) {
                    userFillAnswers = normalizedUserAnswer.split(',').map(a => a.trim().toLowerCase());
                } else {
                    // 单个答案
                    userFillAnswers = [normalizedUserAnswer.trim().toLowerCase()];
                }
                
                // 后台管理的正确答案用 || 分隔，兼容旧数据的逗号分隔
                // 同样处理中文输入法状态下的符号
                let correctFillAnswers;
                let normalizedCorrectAnswer = question.correct_answer
                    .replace(/｜｜/g, '||')  // 中文状态的｜｜转换为||
                    .replace(/｜/g, '|');    // 中文状态的｜转换为|
                    
                if (normalizedCorrectAnswer.includes('||')) {
                    correctFillAnswers = normalizedCorrectAnswer.split('||').map(a => a.trim().toLowerCase());
                } else {
                    correctFillAnswers = normalizedCorrectAnswer.split(',').map(a => a.trim().toLowerCase());
                }
                
                // 填空题允许答案顺序不同，只要所有空格都填对即可
                if (userFillAnswers.length === correctFillAnswers.length) {
                    isCorrect = userFillAnswers.every(userAns => 
                        correctFillAnswers.some(correctAns => 
                            userAns === correctAns || correctAns.includes(userAns)
                        )
                    );
                } else {
                    isCorrect = false;
                }
                break;
                
            case 'essay':
                // 简答题评分逻辑：改进的关键词匹配和部分给分
                console.log('评估答案 - 简答题处理开始');
                const userEssayAnswer = userAnswer.trim().toLowerCase();
                const correctEssayAnswer = question.correct_answer.trim().toLowerCase();
                
                // 如果答案为空或过短，判为错误
                if (!userEssayAnswer || userEssayAnswer.length < 5) {
                    isCorrect = false;
                    score = 0;
                    break;
                }
                
                // 改进的关键词提取逻辑
                // 1. 提取关键词（去除标点符号，支持中文分词）
                const keywords = correctEssayAnswer
                    .replace(/[：:；;，,。.！!？?（）()【】\[\]]/g, ' ')
                    .split(/\s+/)
                    .filter(word => word.length >= 2); // 保留2字符以上的词
                
                // 2. 计算关键词匹配情况
                let matchedKeywords = 0;
                let totalKeywordLength = 0;
                let matchedKeywordLength = 0;
                
                keywords.forEach(keyword => {
                    totalKeywordLength += keyword.length;
                    if (userEssayAnswer.includes(keyword)) {
                        matchedKeywords++;
                        matchedKeywordLength += keyword.length;
                    }
                });
                
                // 3. 计算匹配率（综合考虑数量和长度权重）
                const countMatchRatio = matchedKeywords / keywords.length;
                const lengthMatchRatio = totalKeywordLength > 0 ? matchedKeywordLength / totalKeywordLength : 0;
                const finalMatchRatio = (countMatchRatio * 0.6 + lengthMatchRatio * 0.4); // 数量权重60%，长度权重40%
                
                // 4. 答案长度合理性检查
                const answerLengthRatio = userEssayAnswer.length / correctEssayAnswer.length;
                const lengthPenalty = answerLengthRatio < 0.2 ? 0.5 : (answerLengthRatio > 3 ? 0.8 : 1); // 过短或过长都有惩罚
                
                // 5. 最终评分逻辑（部分给分）
                const adjustedMatchRatio = finalMatchRatio * lengthPenalty;
                
                if (adjustedMatchRatio >= 0.7) {
                    isCorrect = true;
                    score = 1.0; // 满分
                } else if (adjustedMatchRatio >= 0.5) {
                    isCorrect = true; // 认为基本正确
                    score = 0.8; // 80%分数
                } else if (adjustedMatchRatio >= 0.35) {
                    isCorrect = false; // 不完全正确
                    score = 0.6; // 60%分数（部分给分）
                } else if (adjustedMatchRatio >= 0.2) {
                    isCorrect = false; // 有一定相关性
                    score = 0.3; // 30%分数（有关联性）
                } else {
                    isCorrect = false;
                    score = 0; // 完全错误，0分
                }
                
                console.log('评估答案 - 简答题关键词:', keywords);
                console.log('评估答案 - 匹配的关键词数:', matchedKeywords, '/', keywords.length);
                console.log('评估答案 - 数量匹配率:', countMatchRatio.toFixed(3));
                console.log('评估答案 - 长度匹配率:', lengthMatchRatio.toFixed(3));
                console.log('评估答案 - 综合匹配率:', finalMatchRatio.toFixed(3));
                console.log('评估答案 - 长度惩罚系数:', lengthPenalty);
                console.log('评估答案 - 调整后匹配率:', adjustedMatchRatio.toFixed(3));
                console.log('评估答案 - 简答题结果:', isCorrect, '得分:', score);
                break;
        }
        
        // 计算分数 - 获取题目的实际分值
        // 对于简答题，score已在上面的逻辑中计算为比例值(0-1)
        // 需要乘以实际题目分值
        const actualQuestionScore = question.score || 5; // 如果没有设置分值，默认5分
        
        if (question.type === 'essay') {
            // 简答题：score已经是比例值，直接乘以题目分值
            score = Math.round(score * actualQuestionScore * 100) / 100; // 保留两位小数
        } else {
            // 其他题型：按对错给分
            score = isCorrect ? actualQuestionScore : 0;
        }
        
        return { isCorrect, score };
    }
}

// 验证规则
ExamController.startExamValidation = [
    body('paperId').isInt({ min: 1 }).withMessage('试卷ID必须是正整数'),
    body('type').optional().isIn(['exam', 'practice']).withMessage('考试类型必须是exam或practice')
];

ExamController.submitAnswerValidation = [
    body('examRecordId').isInt({ min: 1 }).withMessage('考试记录ID必须是正整数'),
    body('questionId').isInt({ min: 1 }).withMessage('题目ID必须是正整数'),
    body('answer').optional()
];

ExamController.finishExamValidation = [
    body('examRecordId').isInt({ min: 1 }).withMessage('考试记录ID必须是正整数')
];

module.exports = ExamController;
