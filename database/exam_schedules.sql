-- 创建考试安排表
CREATE TABLE IF NOT EXISTS exam_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    paper_id INTEGER NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    created_by INTEGER NOT NULL,
    participant_type VARCHAR(20) DEFAULT 'all' CHECK(participant_type IN ('all', 'selected')),
    participants TEXT, -- JSON格式存储指定参与者ID列表
    settings TEXT, -- JSON格式存储考试设置(允许迟到、随机题目顺序等)
    status VARCHAR(20) DEFAULT 'pending' CHECK(status IN ('pending', 'ongoing', 'finished', 'cancelled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (paper_id) REFERENCES papers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- 考试安排参与者表
CREATE TABLE IF NOT EXISTS exam_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    exam_record_id INTEGER, -- 学生开始考试后关联的记录ID
    status VARCHAR(20) DEFAULT 'not_started' CHECK(status IN ('not_started', 'in_progress', 'completed', 'absent')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES exam_schedules(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exam_record_id) REFERENCES exam_records(id),
    UNIQUE(schedule_id, user_id)
);
