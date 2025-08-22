import request from '@/utils/request'

// 获取学生列表
export function getStudents() {
  return request({
    url: '/users/students',
    method: 'get'
  })
}

// 创建学生账号
export function createStudent(data) {
  return request({
    url: '/users/students',
    method: 'post',
    data
  })
}

// 更新学生信息
export function updateStudent(id, data) {
  return request({
    url: `/users/students/${id}`,
    method: 'put',
    data
  })
}

// 删除学生账号
export function deleteStudent(id) {
  return request({
    url: `/users/students/${id}`,
    method: 'delete'
  })
}

// 重置学生密码
export function resetStudentPassword(id, data) {
  return request({
    url: `/users/students/${id}/password`,
    method: 'put',
    data
  })
}

// 获取考试记录
export function getExamRecords(params) {
  return request({
    url: '/users/exam-records',
    method: 'get',
    params
  })
}

// 获取考试统计
export function getExamStatistics(params) {
  return request({
    url: '/users/exam-statistics',
    method: 'get',
    params
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
    url: '/admin/users',
    method: 'get',
    params
  }),

  // 创建用户
  createUser: (data) => request({
    url: '/admin/users',
    method: 'post',
    data
  }),

  // 更新用户
  updateUser: (id, data) => request({
    url: `/admin/users/${id}`,
    method: 'put',
    data
  }),

  // 删除用户
  deleteUser: (id) => request({
    url: `/admin/users/${id}`,
    method: 'delete'
  }),

  // 重置用户密码
  resetUserPassword: (id) => request({
    url: `/admin/users/${id}/reset-password`,
    method: 'post'
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
  }),

  // 获取学生详情统计
  getStudentDetail: (id, params) => request({
    url: `/admin/stats/student/${id}`,
    method: 'get',
    params
  }),

  // 获取考试详情统计
  getExamDetail: (id, params) => request({
    url: `/admin/stats/exam/${id}`,
    method: 'get',
    params
  }),

  // 获取题目详情统计
  getQuestionDetail: (id, params) => request({
    url: `/admin/stats/question/${id}`,
    method: 'get',
    params
  }),

  // 获取题目统计列表
  getQuestionStatistics: (params) => request({
    url: '/users/question-statistics',
    method: 'get',
    params
  })
}
