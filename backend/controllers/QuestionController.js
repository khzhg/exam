const Question = require('../models/Question');
const XLSX = require('xlsx');
const mammoth = require('mammoth');
const { body } = require('express-validator');
const path = require('path');
const fs = require('fs');

class QuestionController {
    // 按题目内容模糊搜索
    static async searchByContent(req, res) {
        try {
            const { keyword = '', page = 1, limit = 10 } = req.query;
            
            // 如果没有关键词，返回空结果而不是错误
            if (!keyword || keyword.trim().length === 0) {
                return res.json({ 
                    success: true, 
                    data: { 
                        questions: [], 
                        total: 0, 
                        page: parseInt(page), 
                        limit: parseInt(limit) 
                    } 
                });
            }
            
            const questions = await Question.searchByContent(keyword, { page: parseInt(page), limit: parseInt(limit) });
            res.json({ success: true, data: questions });
        } catch (error) {
            console.error('Search questions by content error:', error);
            res.status(500).json({ success: false, message: '搜索题目失败', error: error.message });
        }
    }
    // 获取题目列表
    static async getList(req, res) {
        try {
            const { page = 1, limit = 10, type, subject, difficulty } = req.query;
            
            const filters = {};
            if (type) filters.type = type;
            if (subject) filters.subject = subject;
            if (difficulty) filters.difficulty = parseInt(difficulty);
            
            const result = await Question.getList(
                parseInt(page), 
                parseInt(limit), 
                filters
            );
            
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            console.error('Get questions error:', error);
            res.status(500).json({
                success: false,
                message: '获取题目列表失败',
                error: error.message
            });
        }
    }

    // 获取题目详情
    static async getById(req, res) {
        try {
            const { id } = req.params;
            const question = await Question.getById(id);
            
            if (!question) {
                return res.status(404).json({
                    success: false,
                    message: '题目不存在'
                });
            }
            
            res.json({
                success: true,
                data: question
            });
        } catch (error) {
            console.error('Get question error:', error);
            res.status(500).json({
                success: false,
                message: '获取题目失败',
                error: error.message
            });
        }
    }

    // 创建题目
    static async create(req, res) {
        try {
            const questionData = req.body;
            const questionId = await Question.create(questionData);
            
            res.status(201).json({
                success: true,
                message: '题目创建成功',
                data: { questionId }
            });
        } catch (error) {
            console.error('Create question error:', error);
            res.status(500).json({
                success: false,
                message: '创建题目失败',
                error: error.message
            });
        }
    }

    // 更新题目
    static async update(req, res) {
        try {
            const { id } = req.params;
            const questionData = req.body;
            
            const success = await Question.update(id, questionData);
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: '题目不存在或更新失败'
                });
            }
            
            res.json({
                success: true,
                message: '题目更新成功'
            });
        } catch (error) {
            console.error('Update question error:', error);
            res.status(500).json({
                success: false,
                message: '更新题目失败',
                error: error.message
            });
        }
    }

    // 删除题目
    static async delete(req, res) {
        try {
            const { id } = req.params;
            const success = await Question.delete(id);
            
            if (!success) {
                return res.status(404).json({
                    success: false,
                    message: '题目不存在或删除失败'
                });
            }
            
            res.json({
                success: true,
                message: '题目删除成功'
            });
        } catch (error) {
            console.error('Delete question error:', error);
            res.status(500).json({
                success: false,
                message: '删除题目失败',
                error: error.message
            });
        }
    }

    // 批量删除题目
    static async batchDelete(req, res) {
        try {
            const { ids } = req.body;
            
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '请提供要删除的题目ID列表'
                });
            }

            // 验证ID格式
            const validIds = ids.filter(id => Number.isInteger(parseInt(id)) && parseInt(id) > 0);
            if (validIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '没有有效的题目ID'
                });
            }

            const results = await Question.batchDelete(validIds);
            
            res.json({
                success: true,
                message: `批量删除完成: 成功删除${results.success}道题目，失败${results.failed}道`,
                data: {
                    total: validIds.length,
                    success: results.success,
                    failed: results.failed,
                    errors: results.errors
                }
            });
        } catch (error) {
            console.error('Batch delete questions error:', error);
            res.status(500).json({
                success: false,
                message: '批量删除失败',
                error: error.message
            });
        }
    }

    // 随机获取题目
    static async getRandomQuestions(req, res) {
        try {
            const { count = 10, type, subject } = req.query;
            
            const filters = {};
            if (type) filters.type = type;
            if (subject) filters.subject = subject;
            
            const questions = await Question.getRandomQuestions(parseInt(count), filters);
            
            res.json({
                success: true,
                data: questions
            });
        } catch (error) {
            console.error('Get random questions error:', error);
            res.status(500).json({
                success: false,
                message: '获取随机题目失败',
                error: error.message
            });
        }
    }

    // Excel批量导入题目
    static async importFromExcel(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: '请上传Excel文件'
                });
            }

            const filePath = req.file.path;
            const workbook = XLSX.readFile(filePath);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            const questionsData = [];
            const errors = [];

            jsonData.forEach((row, index) => {
                try {
                    const question = QuestionController.parseExcelRow(row);
                    questionsData.push(question);
                } catch (error) {
                    errors.push({
                        row: index + 2, // Excel行号从2开始(跳过标题行)
                        error: error.message
                    });
                }
            });

            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: '部分数据格式错误',
                    errors
                });
            }

            const results = await Question.batchCreate(questionsData);
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            // 清理临时文件
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkError) {
                console.warn('清理Excel临时文件失败:', unlinkError);
            }

            res.json({
                success: true,
                message: `导入完成: 成功${successCount}条, 失败${failCount}条`,
                data: {
                    total: results.length,
                    success: successCount,
                    failed: failCount,
                    details: results
                }
            });

        } catch (error) {
            console.error('Import excel error:', error);
            
            // 即使出错也要清理临时文件
            try {
                if (req.file && req.file.path) {
                    fs.unlinkSync(req.file.path);
                }
            } catch (unlinkError) {
                console.warn('清理Excel临时文件失败:', unlinkError);
            }
            
            res.status(500).json({
                success: false,
                message: 'Excel导入失败',
                error: error.message
            });
        }
    }

    // Word批量导入题目
    static async importFromWord(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    message: '请上传Word文件'
                });
            }

            const filePath = req.file.path;
            const originalName = req.file.originalname;
            
            console.log('开始处理文件:', {
                originalName,
                filePath,
                size: req.file.size,
                mimetype: req.file.mimetype
            });
            
            // 检查文件是否存在
            if (!fs.existsSync(filePath)) {
                return res.status(400).json({
                    success: false,
                    message: '上传的文件不存在'
                });
            }

            // 检查文件大小
            const stats = fs.statSync(filePath);
            if (stats.size === 0) {
                return res.status(400).json({
                    success: false,
                    message: '上传的文件为空'
                });
            }

            let text = '';
            let parseMethod = 'unknown';
            
            // 根据文件扩展名和内容判断处理方式
            const fileExtension = path.extname(originalName).toLowerCase();
            // console.log('文件扩展名:', fileExtension);
            
            // 首先尝试作为文本文件读取（适用于.txt和纯文本格式）
            if (fileExtension === '.txt' || req.file.mimetype === 'text/plain') {
                try {
                    text = fs.readFileSync(filePath, 'utf8');
                    parseMethod = 'text';
                     console.log('使用文本方式解析，内容长度:', text.length);
                } catch (textError) {
                    console.error('文本读取失败:', textError);
                    return res.status(400).json({
                        success: false,
                        message: '无法读取文本文件内容',
                        error: textError.message
                    });
                }
            } else {
                // 尝试使用mammoth解析Word文档
                try {
                     console.log('尝试使用mammoth解析Word文档...');
                    const result = await mammoth.extractRawText({ path: filePath });
                    text = result.value;
                    parseMethod = 'mammoth';
                     console.log('Mammoth解析成功，内容长度:', text.length);
                    
                    // 如果mammoth解析的内容为空或太短，尝试文本方式
                    if (!text || text.trim().length < 10) {
                        throw new Error('Mammoth解析内容为空或过短');
                    }
                } catch (mammothError) {
                    console.error('Mammoth解析失败:', mammothError);
                    
                    // 如果mammoth失败，尝试读取为文本文件
                    try {
                         console.log('尝试使用文本方式解析...');
                        text = fs.readFileSync(filePath, 'utf8');
                        parseMethod = 'text_fallback';
                         console.log('文本fallback解析成功，内容长度:', text.length);
                        
                        // 检查是否是二进制文件（包含大量非文本字符）
                        const binaryCharCount = (text.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g) || []).length;
                        const binaryRatio = binaryCharCount / text.length;
                        
                        // console.log('二进制字符比例:', binaryRatio);
                        
                        if (binaryRatio > 0.3) {
                            throw new Error('文件似乎是二进制格式，无法解析为文本');
                        }
                        
                        if (!text || text.trim().length < 10) {
                            throw new Error('文件内容为空或过短');
                        }
                    } catch (readError) {
                        console.error('文件读取失败:', readError);
                        return res.status(400).json({
                            success: false,
                            message: '无法解析上传的文件。检测到文件可能是旧版本Word格式(.doc)或WPS格式，无法直接解析。',
                            error: `解析错误: ${mammothError.message}`,
                            suggestion: '建议：1. 将文件另存为现代Word格式(.docx)；2. 或者复制内容到记事本保存为.txt格式后重新上传；3. 确保使用标准的Microsoft Word格式'
                        });
                    }
                }
            }
            
            // 解析Word文档内容
            const questionsData = [];
            const errors = [];
            
             console.log(`开始解析内容，使用方法: ${parseMethod}`);
            
            try {
                const parsedQuestions = QuestionController.parseWordContent(text);
                questionsData.push(...parsedQuestions);
                 console.log(`解析完成，找到 ${parsedQuestions.length} 道题目`);
            } catch (error) {
                console.error('内容解析失败:', error);
                errors.push({
                    error: error.message,
                    parseMethod: parseMethod
                });
            }

            if (errors.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: '文档内容解析错误',
                    errors,
                    suggestion: '请检查文档格式是否符合模板要求'
                });
            }

            if (questionsData.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '未找到有效的题目数据，请检查文档格式。确保题目包含序号和题型标记，如：1. 【单选题】',
                    parsedText: text.substring(0, 500), // 返回前500字符用于调试
                    parseMethod: parseMethod,
                    suggestion: '请参考模板格式，确保题目格式正确'
                });
            }

            const results = await Question.batchCreate(questionsData);
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            // 清理临时文件
            try {
                fs.unlinkSync(filePath);
            } catch (unlinkError) {
                console.warn('清理临时文件失败:', unlinkError);
            }

            res.json({
                success: true,
                message: `导入完成: 成功${successCount}条, 失败${failCount}条`,
                data: {
                    total: results.length,
                    success: successCount,
                    failed: failCount,
                    parseMethod: parseMethod,
                    details: results
                }
            });

        } catch (error) {
            console.error('Import word error:', error);
            res.status(500).json({
                success: false,
                message: 'Word导入失败',
                error: error.message
            });
        }
    }

    // 解析Excel行数据
    static parseExcelRow(row) {
        const question = {
            type: row['题型'] || row['type'],
            title: row['题目标题'] || row['title'],
            content: row['题目内容'] || row['content'],
            correct_answer: row['正确答案'] || row['correct_answer'],
            explanation: row['解析'] || row['explanation'] || '',
            difficulty: parseInt(row['难度'] || row['difficulty'] || '3'),
            subject: row['科目'] || row['subject'] || '未分类', // 设置默认科目
            chapter: row['章节'] || row['chapter'] || ''
        };

        // 验证必填字段
        if (!question.type || !question.title || !question.content || !question.correct_answer) {
            throw new Error('缺少必填字段: 题型、题目标题、题目内容、正确答案');
        }

        // 验证题型
        const validTypes = ['single', 'multiple', 'truefalse', 'essay', 'fill'];
        if (!validTypes.includes(question.type)) {
            throw new Error('无效的题型，必须是: single, multiple, truefalse, essay, fill');
        }

        // 处理选择题选项
        if (['single', 'multiple', 'truefalse'].includes(question.type)) {
            const options = [];
            
            // 从Excel中读取选项
            if (question.type === 'truefalse') {
                options.push({ key: 'A', value: '正确' });
                options.push({ key: 'B', value: '错误' });
            } else {
                ['A', 'B', 'C', 'D', 'E', 'F'].forEach(key => {
                    const optionValue = row[`选项${key}`] || row[`option_${key}`];
                    if (optionValue) {
                        options.push({ key, value: optionValue });
                    }
                });
            }

            if (options.length === 0) {
                throw new Error('选择题必须有选项');
            }

            question.options = options;
        } else if (question.type === 'fill') {
            // 填空题不需要选项，答案用逗号分隔表示多个空的答案
            question.options = [];
        } else {
            // 简答题等
            question.options = [];
        }

        return question;
    }

    // 解析Word文档内容
    static parseWordContent(text) {
         console.log('开始解析Word文档内容，文本长度:', text.length);
        
        const questions = [];
        const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        
         console.log('总行数:', lines.length);
         //console.log('前10行内容:', lines.slice(0, 10));
        
        let currentQuestion = null;
        let currentSection = null;
        let optionCount = 0;
        let processedQuestions = 0;
        let batchSubject = '未分类'; // 默认批量科目
        
        // 检查是否有批量科目设置
        for (let i = 0; i < Math.min(10, lines.length); i++) {
            const line = lines[i];
            const normalizedLine = QuestionController.normalizeText(line);
            if (/^(科目|subject)[：:\s]*/.test(normalizedLine)) {
                batchSubject = normalizedLine.replace(/^(科目|subject)[：:\s]*/, '').trim();
                if (batchSubject) {
                    // console.log('发现批量科目设置:', batchSubject);
                    break;
                }
            }
        }
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // 跳过明显的标题行、说明行
            if (QuestionController.isHeaderOrInstructionLine(line)) {
                continue;
            }
            
            // 检测题目开始标记
            if (QuestionController.isQuestionStart(line)) {
                 //console.log(`发现题目开始行 (第${i+1}行):`, line);
                
                // 如果有上一个题目，先保存
                if (currentQuestion && QuestionController.validateQuestion(currentQuestion)) {
                    questions.push(currentQuestion);
                    processedQuestions++;
                     //console.log(`保存题目 ${processedQuestions}:`, currentQuestion.title);
                } else if (currentQuestion) {
                     //console.warn('丢弃无效题目:', currentQuestion);
                }
                
                // 开始新题目
                try {
                    currentQuestion = QuestionController.parseQuestionHeader(line);
                    currentQuestion.subject = batchSubject; // 使用批量科目设置
                    currentSection = 'content';
                    optionCount = 0;
                     //console.log('解析题目头部:', currentQuestion);
                    
                    // 检查当前行是否包含选项信息（A. B. 等）
                    const originalLine = line; // 保存原始行内容
                    const normalizedLine = QuestionController.normalizeText(line);
                    
                    // 寻找选项开始的位置
                    const optionPattern = /[A-F]\.\s*[^A-F\.]+/g;
                    const optionMatches = normalizedLine.match(optionPattern);
                    
                    if (optionMatches && optionMatches.length >= 2) {
                        // console.log('在题目行中发现选项:', optionMatches);
                        
                        currentSection = 'options';
                        currentQuestion.options = currentQuestion.options || [];
                        
                        // 清空默认选项（避免重复）
                        if (currentQuestion.type === 'truefalse') {
                            currentQuestion.options = [];
                        } else if (['single', 'multiple'].includes(currentQuestion.type)) {
                            currentQuestion.options = [];
                        }
                        
                        // 解析选项
                        optionMatches.forEach(optionText => {
                            const option = QuestionController.parseOption(optionText.trim());
                            if (option) {
                                // 检查是否已存在该选项键，避免重复
                                const existingOption = currentQuestion.options.find(opt => opt.key === option.key);
                                if (!existingOption) {
                                    currentQuestion.options.push(option);
                                    // console.log(`从题目行添加选项 ${option.key}:`, option.value);
                                }
                            }
                        });
                    }
                    
                    // 检查同一行是否包含答案和解析信息
                    const answerMatch = normalizedLine.match(/答案[：:\s]*([^\s\n\r]+)/);
                    const explanationMatch = normalizedLine.match(/解析[：:\s]*(.+)$/);
                    
                    if (answerMatch) {
                        currentQuestion.correct_answer = answerMatch[1].trim();
                        // console.log('从题目行设置答案:', currentQuestion.correct_answer);
                        currentSection = 'answer';
                    }
                    
                    if (explanationMatch) {
                        currentQuestion.explanation = explanationMatch[1].trim();
                        // console.log('从题目行设置解析:', currentQuestion.explanation);
                        currentSection = 'explanation';
                    }
                } catch (error) {
                    // console.error('解析题目头部失败:', error);
                    currentQuestion = null;
                }
                continue;
            }
            
            if (!currentQuestion) continue;
            
            // 解析题目内容
            if (currentSection === 'content') {
                if (QuestionController.isOptionLine(line)) {
                    currentSection = 'options';
                    currentQuestion.options = currentQuestion.options || [];
                    
                    // 对于判断题，如果还是预设的默认选项，清空重新解析
                    if (currentQuestion.type === 'truefalse' && 
                        currentQuestion.options.length === 2 &&
                        currentQuestion.options[0].key === 'A' && 
                        currentQuestion.options[0].value === '正确') {
                        // console.log('清空判断题预设选项，重新解析');
                        currentQuestion.options = [];
                    }
                    
                    const option = QuestionController.parseOption(line);
                    if (option) {
                        // 检查是否已存在该选项键，避免重复
                        const existingOption = currentQuestion.options.find(opt => opt.key === option.key);
                        if (!existingOption) {
                            currentQuestion.options.push(option);
                            optionCount++;
                            // console.log(`添加选项 ${option.key}:`, option.value);
                        }
                    }
                } else if (QuestionController.isAnswerLine(line)) {
                    currentSection = 'answer';
                    currentQuestion.correct_answer = QuestionController.parseAnswer(line);
                    // console.log('从content区域设置答案:', currentQuestion.correct_answer);
                } else if (QuestionController.isExplanationLine(line)) {
                    currentSection = 'explanation';
                    currentQuestion.explanation = QuestionController.parseExplanation(line);
                    // console.log('从content区域设置解析:', currentQuestion.explanation);
                } else {
                    // 不要将选项行添加到content中，即使检测函数可能有误判
                    // 检查是否看起来像选项（更宽松的检测）
                    const trimmedLine = line.trim();
                    if (/^[A-F][．.\s]/.test(trimmedLine)) {
                        // 这看起来像选项，尝试解析
                        currentSection = 'options';
                        currentQuestion.options = currentQuestion.options || [];
                        const option = QuestionController.parseOption(line);
                        if (option) {
                            const existingOption = currentQuestion.options.find(opt => opt.key === option.key);
                            if (!existingOption) {
                                currentQuestion.options.push(option);
                                optionCount++;
                                // console.log(`从content区域添加选项 ${option.key}:`, option.value);
                            }
                        }
                    } else if (!QuestionController.isAnswerLine(line) && 
                              !QuestionController.isExplanationLine(line)) {
                        // 只有确定不是选项、答案、解析的行才添加到内容中
                        currentQuestion.content = (currentQuestion.content || '') + 
                                                (currentQuestion.content ? '\n' : '') + line;
                    }
                }
            }
            // 解析选项
            else if (currentSection === 'options') {
                if (QuestionController.isOptionLine(line)) {
                    const option = QuestionController.parseOption(line);
                    if (option) {
                        // 检查是否已存在该选项键，避免重复
                        const existingOption = currentQuestion.options.find(opt => opt.key === option.key);
                        if (!existingOption) {
                            currentQuestion.options.push(option);
                            optionCount++;
                            // console.log(`添加选项 ${option.key}:`, option.value);
                        }
                    }
                } else if (QuestionController.isAnswerLine(line)) {
                    currentSection = 'answer';
                    currentQuestion.correct_answer = QuestionController.parseAnswer(line);
                    // console.log('从options区域设置答案:', currentQuestion.correct_answer);
                } else if (QuestionController.isExplanationLine(line)) {
                    currentSection = 'explanation';
                    currentQuestion.explanation = QuestionController.parseExplanation(line);
                    // console.log('从options区域设置解析:', currentQuestion.explanation);
                } else {
                    // 可能是继续的选项描述或其他内容，但如果是答案或解析行的变体，也要处理
                    // 检查是否是答案的其他写法
                    if (/^[答案|正确答案|参考答案]/i.test(line.trim())) {
                        currentSection = 'answer';
                        currentQuestion.correct_answer = QuestionController.parseAnswer(line);
                        // console.log('设置答案（变体）:', currentQuestion.correct_answer);
                    }
                }
            }
            // 解析答案
            else if (currentSection === 'answer') {
                if (QuestionController.isExplanationLine(line)) {
                    currentSection = 'explanation';
                    currentQuestion.explanation = QuestionController.parseExplanation(line);
                    // console.log('设置解析:', currentQuestion.explanation);
                } else if (!QuestionController.isAnswerLine(line) && !QuestionController.isQuestionStart(line)) {
                    // 继续添加答案内容
                    currentQuestion.correct_answer = (currentQuestion.correct_answer || '') + 
                                                   (currentQuestion.correct_answer ? '\n' : '') + line;
                }
            }
            // 解析解析
            else if (currentSection === 'explanation') {
                if (!QuestionController.isExplanationLine(line) && !QuestionController.isQuestionStart(line)) {
                    // 继续添加解析内容
                    currentQuestion.explanation = (currentQuestion.explanation || '') + 
                                                (currentQuestion.explanation ? '\n' : '') + line;
                }
            }
        }
        
        // 保存最后一个题目
        if (currentQuestion && QuestionController.validateQuestion(currentQuestion)) {
            questions.push(currentQuestion);
            processedQuestions++;
            // console.log(`保存最后一个题目 ${processedQuestions}:`, currentQuestion.title);
        }
        
        // console.log(`解析完成，共找到 ${questions.length} 道有效题目`);
        
        return questions;
    }
    
    // 检测是否为标题行或说明行
    static isHeaderOrInstructionLine(line) {
        const normalizedLine = QuestionController.normalizeText(line);
        const instructionKeywords = [
            '题库', '模板', '说明', '要求', '格式', '示例', '注意', '提示',
            '导入', '使用', '支持', '标准', '错误', '避免', '必须', '科目'
        ];
        
        // 检查是否是科目设置行
        if (/^(科目|subject)[：:\s]*/.test(normalizedLine)) {
            return true;
        }
        
        // 如果是选项、答案、解析行，不应该被视为标题行
        if (QuestionController.isOptionLine(line) || 
            QuestionController.isAnswerLine(line) || 
            QuestionController.isExplanationLine(line) ||
            QuestionController.isQuestionStart(line)) {
            return false;
        }
        
        // 如果行很短且不是题目相关内容，可能是标题或说明
        if (normalizedLine.length < 3) return true;
        
        return instructionKeywords.some(keyword => normalizedLine.includes(keyword));
    }
    
    // 检测是否为题目开始行
    static isQuestionStart(line) {
        // 标准化行内容，去除多余空白
        const normalizedLine = QuestionController.normalizeText(line);
        
        // 匹配格式: 
        // 1. 数字开头且包含题型标记的行（支持全角半角）
        // 2. 单独的题型标记行
        // 修复：数字后面可以直接跟题型标记，不强制要求空格
        const hasNumberPrefix = /^\d+[\.。\.\、\s]*/.test(normalizedLine);
        const hasTypeMarker = /[【\[]*(单选题|多选题|判断题|简答题|填空题|single|multiple|truefalse|essay|fill)[】\]]*/i.test(normalizedLine);
        
        // 必须同时满足：有数字开头 AND 有题型标记
        // 或者是纯题型标记（用于支持无序号的格式）
        return (hasNumberPrefix && hasTypeMarker) || 
               (!hasNumberPrefix && hasTypeMarker && normalizedLine.trim().length > 0);
    }
    
    // 检测是否为选项行（支持全角半角）
    static isOptionLine(line) {
        const normalizedLine = QuestionController.normalizeText(line);
        const trimmedLine = line.trim();
        
        // 标准化后的检测
        if (/^[A-F][\.。\.\、：:\s]+/.test(normalizedLine)) {
            return true;
        }
        
        // 原始格式检测（处理全角句号等特殊情况）
        if (/^[A-F][．\.\s]/.test(trimmedLine)) {
            return true;
        }
        
        return false;
    }
    
    // 检测是否为答案行（支持全角半角）
    static isAnswerLine(line) {
        const normalizedLine = QuestionController.normalizeText(line);
        const trimmedLine = line.trim();
        
        // 标准化后检测
        if (/^(答案|正确答案|参考答案)[：:\s]*/.test(normalizedLine)) {
            return true;
        }
        
        // 原始格式检测（防止标准化丢失信息）
        if (/^答案[：:\s]*/.test(trimmedLine)) {
            return true;
        }
        
        // 增强检测：处理可能的格式变体
        if (/^[\s\u200B-\u200D\uFEFF\u2060\u180E\u202A-\u202E]*(答案|正确答案|参考答案)[\s\u200B-\u200D\uFEFF\u2060\u180E\u202A-\u202E]*[：:\s]/.test(trimmedLine)) {
            return true;
        }
        
        return false;
    }
    
    // 检测是否为解析行（支持全角半角）
    static isExplanationLine(line) {
        const normalizedLine = QuestionController.normalizeText(line);
        const trimmedLine = line.trim();
        
        // 标准化后检测
        if (/^(解析|答案解析|解释|说明)[：:\s]*/.test(normalizedLine)) {
            return true;
        }
        
        // 增强检测：处理可能的格式变体
        if (/^[\s\u200B-\u200D\uFEFF\u2060\u180E\u202A-\u202E]*(解析|答案解析|解释|说明)[\s\u200B-\u200D\uFEFF\u2060\u180E\u202A-\u202E]*[：:\s]/.test(trimmedLine)) {
            return true;
        }
        
        return false;
    }
    
    // 文本标准化方法：统一全角半角符号
    static normalizeText(text) {
        if (!text) return '';
        
        return text
            .trim()
            // 移除不可见字符（零宽字符、方向标记等）
            .replace(/[\u200B-\u200D\uFEFF\u2060\u180E]/g, '') // 零宽字符
            .replace(/[\u202A-\u202E]/g, '') // 方向标记字符
            .replace(/[\u2028\u2029]/g, '') // 行分隔符和段落分隔符
            // 全角数字转半角
            .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
            // 全角字母转半角
            .replace(/[ａ-ｚＡ-Ｚ]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
            // 标准化标点符号
            .replace(/。/g, '.')  // 全角句号转半角
            .replace(/，/g, ',')  // 全角逗号转半角
            .replace(/：/g, ':')  // 全角冒号转半角
            .replace(/；/g, ';')  // 全角分号转半角
            .replace(/？/g, '?')  // 全角问号转半角
            .replace(/！/g, '!')  // 全角感叹号转半角
            .replace(/（/g, '(')  // 全角左括号转半角
            .replace(/）/g, ')')  // 全角右括号转半角
            .replace(/【/g, '[')  // 全角左方括号转半角
            .replace(/】/g, ']')  // 全角右方括号转半角
            // 统一顿号为逗号
            .replace(/、/g, ',')
            // 去除多余空白
            .replace(/\s+/g, ' ');
    }
    
    // 解析题目头部信息
    static parseQuestionHeader(line) {
        let type = 'single'; // 默认单选题
        let originalLine = QuestionController.normalizeText(line);
        let difficulty = 1;
        let subject = '未分类'; // 设置默认科目，避免空值
        let chapter = '';
        
        // 解析题型（支持全角半角括号）
        if (/[【\[]*(单选题|single)[】\]]*/i.test(originalLine)) {
            type = 'single';
            originalLine = originalLine.replace(/[【\[]*(单选题|single)[】\]]*/gi, '').trim();
        } else if (/[【\[]*(多选题|multiple)[】\]]*/i.test(originalLine)) {
            type = 'multiple';
            originalLine = originalLine.replace(/[【\[]*(多选题|multiple)[】\]]*/gi, '').trim();
        } else if (/[【\[]*(判断题|truefalse)[】\]]*/i.test(originalLine)) {
            type = 'truefalse';
            originalLine = originalLine.replace(/[【\[]*(判断题|truefalse)[】\]]*/gi, '').trim();
        } else if (/[【\[]*(简答题|essay)[】\]]*/i.test(originalLine)) {
            type = 'essay';
            originalLine = originalLine.replace(/[【\[]*(简答题|essay)[】\]]*/gi, '').trim();
        } else if (/[【\[]*(填空题|fill)[】\]]*/i.test(originalLine)) {
            type = 'fill';
            originalLine = originalLine.replace(/[【\[]*(填空题|fill)[】\]]*/gi, '').trim();
        }
        
        // 移除题号（支持各种格式：1. 1, 1、 1。 等，包括1.【这种紧贴的格式）
        originalLine = originalLine.replace(/^\d+[\.。\.\,，、\s]*/, '').trim();
        
        // 新的逻辑：整个题目描述都作为content，title只是简短标识
        let title = '';
        let content = '';
        
        // 检查是否包含选项（A. B. C. D.等）和其他信息
        const optionPattern = /[A-F]\.\s*[^A-F\.]+/g;
        const hasOptions = optionPattern.test(originalLine);
        const hasAnswer = /答案[：:\s]*/.test(originalLine);
        const hasExplanation = /解析[：:\s]*/.test(originalLine);
        
        if (hasOptions) {
            // 找到第一个选项的位置，之前的内容作为题目内容
            const firstOptionIndex = originalLine.search(/[A-F]\.\s*/);
            if (firstOptionIndex > 0) {
                content = originalLine.substring(0, firstOptionIndex).trim();
            }
        } else if (hasAnswer || hasExplanation) {
            // 如果有答案或解析，找到第一个出现的位置
            const answerIndex = originalLine.search(/答案[：:\s]*/);
            const explanationIndex = originalLine.search(/解析[：:\s]*/);
            let cutIndex = -1;
            
            if (answerIndex >= 0 && explanationIndex >= 0) {
                cutIndex = Math.min(answerIndex, explanationIndex);
            } else if (answerIndex >= 0) {
                cutIndex = answerIndex;
            } else if (explanationIndex >= 0) {
                cutIndex = explanationIndex;
            }
            
            if (cutIndex > 0) {
                content = originalLine.substring(0, cutIndex).trim();
            } else {
                content = originalLine;
            }
        } else {
            // 没有选项、答案、解析，整行作为题目内容
            content = originalLine;
        }
        
        // 生成简短的题目标题（取前面的关键词或句子）
        if (content) {
            const sentenceEnd = content.search(/[。？！.?!]/);
            if (sentenceEnd > 5 && sentenceEnd < 50) {
                title = content.substring(0, sentenceEnd + 1);
            } else if (content.length > 50) {
                title = content.substring(0, 47) + '...';
            } else {
                title = content;
            }
        } else {
            title = originalLine.substring(0, Math.min(50, originalLine.length));
            content = originalLine;
        }
        
        return {
            type,
            title,
            content,
            options: type === 'truefalse' ? [
                { key: 'A', value: '正确' },
                { key: 'B', value: '错误' }
            ] : [],
            correct_answer: '',
            explanation: '',
            difficulty,
            subject,
            chapter
        };
    }
    
    // 解析选项（支持全角半角）
    static parseOption(line) {
        const normalizedLine = QuestionController.normalizeText(line);
        const trimmedLine = line.trim();
        
        // 先尝试标准化后的匹配
        let match = normalizedLine.match(/^([A-F])[\.。\.\,，、：:\s]+(.+)$/);
        if (match) {
            return {
                key: match[1],
                value: match[2].trim()
            };
        }
        
        // 如果标准化匹配失败，尝试原始格式（处理全角符号）
        match = trimmedLine.match(/^([A-F])[．\.\s]+(.+)$/);
        if (match) {
            return {
                key: match[1],
                value: match[2].trim()
            };
        }
        
        return null;
    }
    
    // 解析答案（支持全角半角）
    static parseAnswer(line) {
        const normalizedLine = QuestionController.normalizeText(line);
        
        // 尝试标准化后的解析
        let answer = normalizedLine.replace(/^(答案|正确答案|参考答案)[：:\s]*/, '').trim();
        
        // 如果标准化后没有找到答案，尝试原始格式
        if (!answer) {
            const trimmedLine = line.trim();
            answer = trimmedLine.replace(/^答案[：:\s]*/, '').trim();
        }
        
        // 如果还是没有找到，尝试处理可能包含不可见字符的格式
        if (!answer) {
            const cleanLine = line.replace(/[\u200B-\u200D\uFEFF\u2060\u180E\u202A-\u202E]/g, '').trim();
            answer = cleanLine.replace(/^(答案|正确答案|参考答案)[：:\s]*/, '').trim();
        }
        
        return answer;
    }
    
    // 解析解析（支持全角半角）
    static parseExplanation(line) {
        const normalizedLine = QuestionController.normalizeText(line);
        
        // 尝试标准化后的解析
        let explanation = normalizedLine.replace(/^(解析|答案解析|解释|说明)[：:\s]*/, '').trim();
        
        // 如果标准化后没有找到内容，尝试处理可能包含不可见字符的格式
        if (!explanation) {
            const cleanLine = line.replace(/[\u200B-\u200D\uFEFF\u2060\u180E\u202A-\u202E]/g, '').trim();
            explanation = cleanLine.replace(/^(解析|答案解析|解释|说明)[：:\s]*/, '').trim();
        }
        
        return explanation;
    }
    
    // 验证题目数据
    static validateQuestion(question) {
        if (!question.title || !question.correct_answer) {
            // console.log('验证失败：缺少标题或答案', {
            //     hasTitle: !!question.title,
            //     hasAnswer: !!question.correct_answer,
            //     title: question.title,
            //     answer: question.correct_answer
            // });
            return false;
        }
        
        const validTypes = ['single', 'multiple', 'truefalse', 'essay', 'fill'];
        if (!validTypes.includes(question.type)) {
            // console.log('验证失败：无效题型', question.type);
            return false;
        }
        
        // 选择题需要有选项
        if (['single', 'multiple'].includes(question.type) && 
            (!question.options || question.options.length < 2)) {
            // console.log('验证失败：选择题选项不足', {
            //     type: question.type,
            //     optionsCount: question.options ? question.options.length : 0
            // });
            return false;
        }
        
        // 对于判断题，确保有正确的选项
        if (question.type === 'truefalse' && 
            (!question.options || question.options.length !== 2)) {
            // console.log('验证失败：判断题选项错误', {
            //     type: question.type,
            //     optionsCount: question.options ? question.options.length : 0,
            //     options: question.options
            // });
            return false;
        }
        
        // console.log('题目验证通过:', question.title);
        return true;
    }

    // 获取科目列表
    static async getSubjects(req, res) {
        try {
            const subjects = await Question.getSubjects();
            res.json({
                success: true,
                data: subjects
            });
        } catch (error) {
            console.error('Get subjects error:', error);
            res.status(500).json({
                success: false,
                message: '获取科目列表失败',
                error: error.message
            });
        }
    }

    // 获取题目统计
    static async getStatistics(req, res) {
        try {
            const statistics = await Question.getStatistics();
            res.json({
                success: true,
                data: statistics
            });
        } catch (error) {
            console.error('Get statistics error:', error);
            res.status(500).json({
                success: false,
                message: '获取统计数据失败',
                error: error.message
            });
        }
    }

    // 下载Excel模板
    static async downloadTemplate(req, res) {
        try {
            const templateData = [
                {
                    '题型': 'single',
                    '题目标题': '示例单选题',
                    '题目内容': '这是一个示例单选题?',
                    '选项A': '选项A内容',
                    '选项B': '选项B内容',
                    '选项C': '选项C内容',
                    '选项D': '选项D内容',
                    '正确答案': 'A',
                    '解析': '这是题目解析',
                    '难度': 1,
                    '科目': '法律法规',
                    '章节': '社会保险法'
                },
                {
                    '题型': 'multiple',
                    '题目标题': '示例多选题',
                    '题目内容': '这是一个示例多选题?',
                    '选项A': '选项A内容',
                    '选项B': '选项B内容',
                    '选项C': '选项C内容',
                    '选项D': '选项D内容',
                    '正确答案': 'A,B',
                    '解析': '这是题目解析',
                    '难度': 2,
                    '科目': '法律法规',
                    '章节': '劳动保护法'
                },
                {
                    '题型': 'truefalse',
                    '题目标题': '示例判断题',
                    '题目内容': '这是一个示例判断题.',
                    '正确答案': 'A',
                    '解析': '这是题目解析',
                    '难度': 1,
                    '科目': '法律法规',
                    '章节': '年休假条例'
                },
                {
                    '题型': 'essay',
                    '题目标题': '示例简答题',
                    '题目内容': '这是一个示例简答题?',
                    '正确答案': '这是示例答案',
                    '解析': '这是题目解析',
                    '难度': 3,
                    '科目': '示例科目',
                    '章节': '示例章节'
                },
                {
                    '题型': 'fill',
                    '题目标题': '示例填空题',
                    '题目内容': 'JavaScript中声明变量的关键字有___、___和___。',
                    '正确答案': 'var||let||const',
                    '解析': 'JavaScript可以用var、let、const声明变量',
                    '难度': 2,
                    '科目': '前端开发',
                    '章节': 'JavaScript基础'
                }
            ];

            const ws = XLSX.utils.json_to_sheet(templateData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, '题目模板');

            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

            res.setHeader('Content-Disposition', 'attachment; filename=question-template.xlsx');
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.send(buffer);

        } catch (error) {
            console.error('Download template error:', error);
            res.status(500).json({
                success: false,
                message: '下载模板失败',
                error: error.message
            });
        }
    }

    // 下载Word模板
    static async downloadWordTemplate(req, res) {
        try {
            // 创建Word文档内容
            const wordContent = `题库批量导入模板（Word版）

科目：社会保险法律法规

重要说明：
1. 批量科目设置：在文档开头添加"科目：XXX"可为所有题目统一设置科目，如上方示例
2. 题目序号仅用于文档组织，导入时会自动忽略，不会与数据库中的题目ID冲突
3. 数据库中的题目ID是自动生成的，与此处的序号无关
4. 您可以使用任意序号（如1,2,3或100,200,300），系统会正确解析
5. 支持全角半角标点符号，系统会自动转换统一格式
6. 如未设置批量科目，导入的题目默认归类为"未分类"科目

格式要求：
1. 题目必须同时包含序号和题型标记，如：1.【单选题】 或 1.[单选题]
2. 题型支持：【单选题】【多选题】【判断题】【简答题】【填空题】
3. 也可使用英文标记：[single] [multiple] [truefalse] [essay] [fill]
4. 选项格式：A. 选项内容
5. 答案格式：答案：A 或 答案：A,B,C（多选）
6. 解析格式：解析：解析内容（可选）

符号兼容性：
✅ 序号后符号：支持 .  、 , ，（半角全角都可以）
✅ 选项后符号：支持 . : ：（半角全角都可以）
✅ 答案解析符号：支持 : ：（半角全角都可以）
✅ 题型标记：支持 【】 [] （半角全角都可以）
✅ 数字字母：支持全角半角自动转换

标准格式示例：

1. 【判断题】职工与用人单位发生工伤保险争议时，只能通过诉讼方式解决。
职工与用人单位发生工伤保险争议的，可以依照相关规定，采取调解、仲裁、诉讼等方式解决。
A. 正确
B. 错误
答案：B
解析：根据《实施<中华人民共和国社会保险法>若干规定》，职工与用人单位发生社会保险争议的，可申请调解、仲裁，提起诉讼，并非只能通过诉讼解决。

2.【填空题】《社会保险法》规定，用人单位或者个人认为社会保险费征收机构的行为侵害自己合法权益的，可以依法申请___或提起___。
答案：行政复议||行政诉讼
解析：《社会保险法》第八十三条明确了用人单位或个人认为社会保险费征收机构行为侵害其合法权益时，可依法申请行政复议或提起行政诉讼。

3. 【多选题】根据《职工带薪年休假条例》，下列哪些单位的职工连续工作1年以上可享受带薪年休假？
A. 机关
B. 个体工商户（有雇工）
C. 社会团体
D. 外资企业
答案：A,B,C,D
解析：《职工带薪年休假条例》第二条规定，机关、团体、企业、事业单位、民办非企业单位、有雇工的个体工商户等单位的职工连续工作1年以上的，享受带薪年休假。

4.【单选题】JavaScript中最常用的变量声明关键字是什么？
以下哪个是JavaScript中最传统的变量声明关键字？
A. var
B. int
C. string
D. float
答案：A
解析：var是JavaScript中最传统的变量声明关键字，ES6之前主要使用var声明变量。

5.【简答题】请简述什么是响应式设计？
答案：响应式设计是一种网页设计方法，旨在使网站能够在不同设备和屏幕尺寸上提供最佳的用户体验。它通过使用流体网格、弹性图片和CSS媒体查询等技术，使网站布局能够根据设备特性自动调整。主要特点包括：灵活的网格布局、可伸缩的图片和媒体、CSS媒体查询的使用。
解析：响应式设计的核心思想是"一次设计，到处适用"，通过灵活的布局和样式规则适应各种设备，提高用户体验和开发效率。

高级格式示例（全角半角混合）：

６.【判断题】用人单位违反《女职工劳动保护特别规定》侵害女职工合法权益的，女职工可依法投诉、举报、申诉。
《女职工劳动保护特别规定》第十四条规定，用人单位违反本规定，侵害女职工合法权益的，女职工可以依法投诉、举报、申诉等。
Ａ：正确
Ｂ：错误
答案：Ａ
解析：该规定明确赋予女职工在合法权益受侵害时，有投诉、举报、申诉的权利。

７. 【填空题】《女职工劳动保护特别规定》明确，用人单位不得因女职工___、___、___而降低其工资、予以辞退、与其解除劳动或者聘用合同。
答案：怀孕||生育||哺乳
解析：《女职工劳动保护特别规定》第五条规定，用人单位不得因女职工怀孕、生育、哺乳而降低其工资、予以辞退、与其解除劳动或者聘用合同。

导入后处理建议：
1. 如设置了批量科目，所有题目将统一使用该科目
2. 如需调整个别题目的科目，可在题库管理中：

常见格式变体（都支持）：
- 序号格式：1. 1。 1、 1， 1：
- 选项格式：A. A。 A: A：
- 答案格式：答案: 答案：
- 解析格式：解析: 解析：
- 题型格式：【单选题】 [single] 「单选题」
- 科目格式：科目: 科目：

错误格式（会被忽略或修正）：
❌ 没有题型标记：1. 这是一道题目
❌ 选项格式错误：1）选项A  2）选项B
❌ 答案格式错误：正确答案是A
❌ 题型标记错误：（单选题）题目内容

文件格式支持：
✅ .docx 文件（推荐）
✅ .doc 文件(如果是wps生成的.doc不支持，应该另存为.docx)
✅ 纯文本 .txt 文件（按Word格式编写）

注意事项：
1. 如果上传失败，请尝试另存为 .docx 格式
2. 避免使用特殊字体和复杂格式
3. 每道题目之间建议空一行以提高可读性
4. 系统会自动过滤说明文字和标题行
5. 填空题答案用||分隔，多选题答案用逗号分隔
6. 科目设置行请放在文档开头，格式为"科目：XXX"
`;

            // 设置响应头
            res.setHeader('Content-Disposition', 'attachment; filename=question-template.txt');
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            
            // 生成文本文件（更兼容的格式）
            const buffer = Buffer.from(wordContent, 'utf8');
            res.send(buffer);

        } catch (error) {
            console.error('Download word template error:', error);
            res.status(500).json({
                success: false,
                message: '下载Word模板失败',
                error: error.message
            });
        }
    }

    // 清理uploads目录中的过期临时文件
    static async cleanupTempFiles(req, res) {
        try {
            const uploadsDir = path.join(__dirname, '../uploads');
            const maxAge = 24 * 60 * 60 * 1000; // 24小时
            const now = Date.now();
            
            if (!fs.existsSync(uploadsDir)) {
                return res.json({
                    success: true,
                    message: 'uploads目录不存在，无需清理',
                    data: { deletedFiles: 0 }
                });
            }

            const files = fs.readdirSync(uploadsDir);
            let deletedCount = 0;
            const errors = [];

            for (const file of files) {
                // 跳过.gitkeep文件
                if (file === '.gitkeep') continue;
                
                const filePath = path.join(uploadsDir, file);
                
                try {
                    const stats = fs.statSync(filePath);
                    
                    // 如果文件超过24小时，删除它
                    if (now - stats.mtime.getTime() > maxAge) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                        // console.log(`清理过期文件: ${file}`);
                    }
                } catch (fileError) {
                    errors.push(`处理文件 ${file} 时出错: ${fileError.message}`);
                    console.error(`清理文件失败: ${file}`, fileError);
                }
            }

            res.json({
                success: true,
                message: `清理完成: 删除了${deletedCount}个过期文件`,
                data: {
                    deletedFiles: deletedCount,
                    totalFiles: files.length - 1, // 减去.gitkeep
                    errors: errors
                }
            });

        } catch (error) {
            console.error('Cleanup temp files error:', error);
            res.status(500).json({
                success: false,
                message: '清理临时文件失败',
                error: error.message
            });
        }
    }

    // 获取uploads目录文件信息（用于监控）
    static async getUploadStatus(req, res) {
        try {
            const uploadsDir = path.join(__dirname, '../uploads');
            
            if (!fs.existsSync(uploadsDir)) {
                return res.json({
                    success: true,
                    data: {
                        exists: false,
                        files: 0,
                        totalSize: 0,
                        oldestFile: null,
                        newestFile: null
                    }
                });
            }

            const files = fs.readdirSync(uploadsDir).filter(f => f !== '.gitkeep');
            let totalSize = 0;
            let oldestTime = null;
            let newestTime = null;

            for (const file of files) {
                const filePath = path.join(uploadsDir, file);
                const stats = fs.statSync(filePath);
                totalSize += stats.size;
                
                if (!oldestTime || stats.mtime < oldestTime) {
                    oldestTime = stats.mtime;
                }
                if (!newestTime || stats.mtime > newestTime) {
                    newestTime = stats.mtime;
                }
            }

            res.json({
                success: true,
                data: {
                    exists: true,
                    files: files.length,
                    totalSize: totalSize,
                    totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
                    oldestFile: oldestTime ? oldestTime.toISOString() : null,
                    newestFile: newestTime ? newestTime.toISOString() : null
                }
            });

        } catch (error) {
            console.error('Get upload status error:', error);
            res.status(500).json({
                success: false,
                message: '获取上传状态失败',
                error: error.message
            });
        }
    }
}

// 验证规则
QuestionController.createValidation = [
    body('type').isIn(['single', 'multiple', 'truefalse', 'essay', 'fill']).withMessage('无效的题型'),
    body('title').notEmpty().withMessage('题目标题不能为空'),
    body('content').notEmpty().withMessage('题目内容不能为空'),
    body('correct_answer').notEmpty().withMessage('正确答案不能为空'),
    body('difficulty').optional().isInt({ min: 1, max: 5 }).withMessage('难度必须是1-5的整数')
];

QuestionController.updateValidation = QuestionController.createValidation;

module.exports = QuestionController;
