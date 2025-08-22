import request from '@/utils/request'

// 开始考试
export function startExam(data) {
  return request({
    url: '/exam/start',
    method: 'post',
    data
  })
}

// 开始练习
export function startPractice(paperId) {
  return request({
    url: '/exam/start',
    method: 'post',
    data: { paperId: parseInt(paperId), type: 'practice' }
  })
}

// 提交答案
export function submitAnswer(data) {
  return request({
    url: '/exam/answer',
    method: 'post',
    data
  })
}

// 完成考试
export function finishExam(data) {
  return request({
    url: '/exam/finish',
    method: 'post',
    data
  })
}

// 获取考试进度
export function getExamProgress(examRecordId) {
  return request({
    url: `/exam/${examRecordId}/progress`,
    method: 'get'
  })
}

// 查看考试结果
export function getExamResult(examRecordId) {
  return request({
    url: `/exam/${examRecordId}/result`,
    method: 'get'
  })
}

// 获取用户考试历史
export function getUserExamHistory(params) {
  return request({
    url: '/exam/history/user',
    method: 'get',
    params
  })
}

// 随机练习
export function randomPractice(params) {
  return request({
    url: '/exam/practice/random',
    method: 'get',
    params
  })
}

// 考试相关 API
export const examAPI = {
  // 获取学生统计数据
  getStudentStats: () => request({
    url: '/students/stats',
    method: 'get'
  }),

  // 获取最近考试
  getRecentExams: (params) => request({
    url: '/students/recent-exams',
    method: 'get',
    params
  }),

  // 获取学生考试列表 (考试记录)
  getStudentExams: (params) => request({
    url: '/students/exams',
    method: 'get',
    params
  }),

  // 获取可参加的试卷列表 (练习用)
  getAvailablePapers: (params) => request({
    url: '/papers/practice/list',
    method: 'get',
    params
  }),

  // 开始考试
  startExam: (paperId, type = 'practice') => request({
    url: '/exam/start',
    method: 'post',
    data: { paperId, type }
  }),

  // 获取考试详情
  getExamDetail: (examRecordId) => request({
    url: `/exam/${examRecordId}`,
    method: 'get'
  }),

  // 保存答案
  saveAnswer: (data) => request({
    url: '/exam/answer',
    method: 'post',
    data
  }),

  // 提交考试
  submitExam: (examRecordId) => request({
    url: `/exam/${examRecordId}/submit`,
    method: 'post'
  }),

  // 获取考试结果
  getExamResult: (examRecordId) => request({
    url: `/exam/${examRecordId}/result`,
    method: 'get'
  }),

  // 获取学生成绩列表
  getStudentResults: (params) => request({
    url: '/students/results',
    method: 'get',
    params
  }),

  // 获取错题集
  getWrongQuestions: (params) => request({
    url: '/students/wrong-questions',
    method: 'get',
    params
  }),

  // 获取用户考试历史
  getUserExamHistory: (params) => request({
    url: '/exam/history/user',
    method: 'get',
    params
  })
}

// 题目相关 API
export const questionAPI = {
  // 获取题目列表
  getQuestions: (params) => request({
    url: '/questions',
    method: 'get',
    params
  }),

  // 创建题目
  createQuestion: (data) => request({
    url: '/questions',
    method: 'post',
    data
  }),

  // 更新题目
  updateQuestion: (id, data) => request({
    url: `/questions/${id}`,
    method: 'put',
    data
  }),

  // 删除题目
  deleteQuestion: (id) => request({
    url: `/questions/${id}`,
    method: 'delete'
  }),

  // 批量导入题目(Excel)
  importQuestions: (formData) => request({
    url: '/questions/import/excel',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),

  // 批量导入题目(Word)
  importQuestionsFromWord: (formData) => request({
    url: '/questions/import/word',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }),

  // 导出题目
  exportQuestions: (params) => request({
    url: '/questions/export',
    method: 'get',
    params,
    responseType: 'blob'
  }),

  // 下载Excel模板
  downloadTemplate: () => request({
    url: '/questions/template/download',
    method: 'get',
    responseType: 'blob'
  }),

  // 下载Word模板
  downloadWordTemplate: () => request({
    url: '/questions/template/word/download',
    method: 'get',
    responseType: 'blob'
  })
}

// 试卷相关 API
export const paperAPI = {
  // 获取试卷列表
  getPapers: (params) => request({
    url: '/papers',
    method: 'get',
    params
  }),

  // 获取适用于考试的试卷列表
  getExamPapers: (params) => request({
    url: '/papers/exam/list',
    method: 'get',
    params
  }),

  // 获取试卷详情
  getPaperDetail: (id) => request({
    url: `/papers/${id}`,
    method: 'get'
  }),

  // 创建试卷
  createPaper: (data) => request({
    url: '/papers',
    method: 'post',
    data
  }),

  // 更新试卷
  updatePaper: (id, data) => request({
    url: `/papers/${id}`,
    method: 'put',
    data
  }),

  // 删除试卷
  deletePaper: (id) => request({
    url: `/papers/${id}`,
    method: 'delete'
  }),

  // 复制试卷
  copyPaper: (id) => request({
    url: `/papers/${id}/copy`,
    method: 'post'
  })
}

// 管理员相关 API
export const adminAPI = {
  // 获取仪表板统计数据
  getDashboardStats: () => request({
    url: '/admin/dashboard/stats',
    method: 'get'
  }),

  // 获取用户列表
  getUsers: (params) => request({
    url: '/users/students',
    method: 'get',
    params
  }),

  // 创建用户
  createUser: (data) => request({
    url: '/users/students',
    method: 'post',
    data
  }),

  // 更新用户
  updateUser: (id, data) => request({
    url: `/users/students/${id}`,
    method: 'put',
    data
  }),

  // 删除用户
  deleteUser: (id) => request({
    url: `/users/students/${id}`,
    method: 'delete'
  }),

  // 重置用户密码
  resetUserPassword: (id) => request({
    url: `/users/students/${id}/password`,
    method: 'put'
  }),

  // 获取考试统计
  getExamStats: (params) => request({
    url: '/admin/stats/exams',
    method: 'get',
    params
  }),

  // 获取成绩统计
  getScoreStats: (params) => request({
    url: '/admin/stats/scores',
    method: 'get',
    params
  })
}

// 考试安排相关 API
export const examScheduleAPI = {
  // 获取考试安排列表 (管理员)
  getSchedules: (params) => request({
    url: '/exam-schedules',
    method: 'get',
    params
  }),

  // 创建考试安排
  createSchedule: (data) => request({
    url: '/exam-schedules',
    method: 'post',
    data
  }),

  // 获取考试安排详情
  getScheduleDetail: (id) => request({
    url: `/exam-schedules/${id}`,
    method: 'get'
  }),

  // 更新考试安排
  updateSchedule: (id, data) => request({
    url: `/exam-schedules/${id}`,
    method: 'put',
    data
  }),

  // 删除考试安排
  deleteSchedule: (id) => request({
    url: `/exam-schedules/${id}`,
    method: 'delete'
  }),

  // 更新考试状态
  updateScheduleStatus: (id, status) => request({
    url: `/exam-schedules/${id}/status`,
    method: 'patch',
    data: { status }
  }),

  // 获取学生的考试安排
  getStudentSchedules: (params) => request({
    url: '/exam-schedules/student/my-exams',
    method: 'get',
    params
  }),

  // 学生开始考试
  startScheduledExam: (id) => request({
    url: `/exam-schedules/${id}/start`,
    method: 'post'
  })
}
