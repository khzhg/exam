-- 在线考试系统数据库初始化脚本

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(10) DEFAULT 'student' CHECK(role IN ('admin', 'student')),
    real_name VARCHAR(100),
    email VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建题库表
CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type VARCHAR(20) NOT NULL CHECK(type IN ('single', 'multiple', 'truefalse', 'essay', 'fill')),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    options TEXT, -- JSON格式存储选择题选项
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    difficulty INTEGER DEFAULT 1 CHECK(difficulty BETWEEN 1 AND 5),
    subject VARCHAR(100),
    chapter VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建试卷表
CREATE TABLE IF NOT EXISTS papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 60, -- 考试时长(分钟)
    total_score INTEGER DEFAULT 100,
    pass_score INTEGER DEFAULT 60,
    is_active INTEGER DEFAULT 1,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 创建试卷题目关联表
CREATE TABLE IF NOT EXISTS paper_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    paper_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    score INTEGER DEFAULT 5,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- 创建考试记录表
CREATE TABLE IF NOT EXISTS exam_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    paper_id INTEGER,
    schedule_id INTEGER, -- 关联考试安排ID
    type VARCHAR(10) DEFAULT 'exam' CHECK(type IN ('exam', 'practice')),
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    duration INTEGER, -- 实际用时(秒)
    total_score INTEGER DEFAULT 0,
    obtained_score REAL DEFAULT 0,
    status VARCHAR(20) DEFAULT 'ongoing' CHECK(status IN ('ongoing', 'completed', 'timeout')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (paper_id) REFERENCES papers(id),
    FOREIGN KEY (schedule_id) REFERENCES exam_schedules(id)
);

-- 创建考试安排表
CREATE TABLE IF NOT EXISTS exam_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    paper_id INTEGER NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    created_by INTEGER NOT NULL,
    participant_type VARCHAR(10) DEFAULT 'all' CHECK(participant_type IN ('all', 'selected')),
    participants TEXT, -- JSON格式存储参与者ID列表
    settings TEXT, -- JSON格式存储考试设置
    status VARCHAR(20) DEFAULT 'draft' CHECK(status IN ('draft', 'published', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paper_id) REFERENCES papers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 创建考试参与者状态表
CREATE TABLE IF NOT EXISTS exam_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'not_started' CHECK(status IN ('not_started', 'in_progress', 'completed', 'absent')),
    exam_record_id INTEGER,
    start_time DATETIME,
    end_time DATETIME,
    score REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES exam_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exam_record_id) REFERENCES exam_records(id),
    UNIQUE(schedule_id, user_id)
);

-- 创建答题记录表
CREATE TABLE IF NOT EXISTS answer_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_record_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    user_answer TEXT,
    is_correct INTEGER DEFAULT 0,
    score REAL DEFAULT 0,
    answer_time INTEGER, -- 答题用时(秒)
    answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (exam_record_id) REFERENCES exam_records(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id)
);

-- 创建错题表
CREATE TABLE IF NOT EXISTS wrong_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    question_id INTEGER NOT NULL,
    wrong_count INTEGER DEFAULT 1,
    last_wrong_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_mastered INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (question_id) REFERENCES questions(id),
    UNIQUE(user_id, question_id)
);

-- 插入默认管理员账户
INSERT OR IGNORE INTO users (username, password, role, real_name) 
VALUES ('admin', '$2a$10$rOsJjPv/jF5VhOhJvJV5cOKX9Zt8XfJ5O4K6EEYfJvJ8F5VhOhJvJ', 'admin', '系统管理员');

-- 插入测试学生账户
INSERT OR IGNORE INTO users (username, password, role, real_name) 
VALUES 
('student', '$2a$10$rOsJjPv/jF5VhOhJvJV5cOKX9Zt8XfJ5O4K6EEYfJvJ8F5VhOhJvJ', 'student', '学生'),
('student1', '$2a$10$rOsJjPv/jF5VhOhJvJV5cOKX9Zt8XfJ5O4K6EEYfJvJ8F5VhOhJvJ', 'student', '学生一'),
('student2', '$2a$10$rOsJjPv/jF5VhOhJvJV5cOKX9Zt8XfJ5O4K6EEYfJvJ8F5VhOhJvJ', 'student', '学生二');

-- 插入示例题目（单独插入每一条）
INSERT OR IGNORE INTO questions (type, title, content, options, correct_answer, explanation, subject) 
VALUES ('single', '单选题示例', '以下哪个是JavaScript的基本数据类型？', '[{"key":"A","value":"Object"},{"key":"B","value":"Array"},{"key":"C","value":"String"},{"key":"D","value":"Function"}]', 'C', 'String是JavaScript的基本数据类型之一', '前端开发');

INSERT OR IGNORE INTO questions (type, title, content, options, correct_answer, explanation, subject) 
VALUES ('multiple', '多选题示例', '以下哪些是前端框架？', '[{"key":"A","value":"Vue.js"},{"key":"B","value":"React"},{"key":"C","value":"Angular"},{"key":"D","value":"Express"}]', 'A,B,C', 'Vue.js、React、Angular都是前端框架，Express是后端框架', '前端开发');

INSERT OR IGNORE INTO questions (type, title, content, options, correct_answer, explanation, subject) 
VALUES ('truefalse', '判断题示例', 'JavaScript是一种编译型语言。', '[{"key":"A","value":"正确"},{"key":"B","value":"错误"}]', 'B', 'JavaScript是解释型语言，不是编译型语言', '前端开发');

INSERT OR IGNORE INTO questions (type, title, content, options, correct_answer, explanation, subject) 
VALUES ('essay', '简答题示例', '请简述MVC架构模式的优点。', '[]', 'MVC架构模式的优点包括：1.分离关注点；2.提高代码可维护性；3.便于团队协作；4.提高代码复用性', '这是标准答案的解析', '软件工程');

INSERT OR IGNORE INTO questions (type, title, content, options, correct_answer, explanation, subject) 
VALUES ('fill', '填空题示例', 'JavaScript中用于声明变量的关键字有 ___、___和___。', '[]', 'var,let,const', 'JavaScript ES6引入了let和const关键字，配合传统的var关键字', '前端开发');

-- 插入示例试卷（指定固定ID避免重复创建）
INSERT OR IGNORE INTO papers (id, title, description, duration, total_score, created_by) 
VALUES (1, 'JavaScript基础测试', '测试JavaScript基础知识', 60, 100, 1);

-- 关联试卷和题目（只有试卷ID=1存在时才执行）
INSERT OR IGNORE INTO paper_questions (paper_id, question_id, score, sort_order) 
VALUES 
(1, 1, 20, 1),
(1, 2, 20, 2),
(1, 3, 20, 3),
(1, 4, 20, 4),
(1, 5, 20, 5);

-- 插入示例考试安排（指定固定ID避免重复创建）
INSERT OR IGNORE INTO exam_schedules (id, title, description, paper_id, start_time, end_time, created_by, status, participant_type, participants, settings) 
VALUES (1, 'JavaScript期末考试', '第一学期JavaScript课程期末考试', 1, '2025-08-13 09:00:00', '2025-08-20 23:59:59', 1, 'published', 'all', '[]', '{"duration": 60, "allowRetake": false}');
