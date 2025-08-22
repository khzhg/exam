import request from '@/utils/request'

// 获取题目列表
export function getQuestions(params) {
  return request({
    url: '/questions',
    method: 'get',
    params
  })
}

// 获取题目详情
export function getQuestionById(id) {
  return request({
    url: `/questions/${id}`,
    method: 'get'
  })
}

// 创建题目
export function createQuestion(data) {
  return request({
    url: '/questions',
    method: 'post',
    data
  })
}

// 更新题目
export function updateQuestion(id, data) {
  return request({
    url: `/questions/${id}`,
    method: 'put',
    data
  })
}

// 删除题目
export function deleteQuestion(id) {
  return request({
    url: `/questions/${id}`,
    method: 'delete'
  })
}

// 批量删除题目
export function batchDeleteQuestions(ids) {
  return request({
    url: '/questions/batch/delete',
    method: 'post',
    data: { ids }
  })
}

// 清理临时文件
export function cleanupTempFiles() {
  return request({
    url: '/questions/files/cleanup',
    method: 'post'
  })
}

// 获取上传文件状态
export function getUploadStatus() {
  return request({
    url: '/questions/files/status',
    method: 'get'
  })
}

// 随机获取题目
export function getRandomQuestions(params) {
  return request({
    url: '/questions/random/list',
    method: 'get',
    params
  })
}

// Excel批量导入
export function importQuestionsFromExcel(formData) {
  return request({
    url: '/questions/import/excel',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// Word批量导入
export function importQuestionsFromWord(formData) {
  return request({
    url: '/questions/import/word',
    method: 'post',
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

// 下载Excel模板
export function downloadTemplate() {
  return request({
    url: '/questions/template/download',
    method: 'get',
    responseType: 'blob'
  })
}

// 下载Word模板
export function downloadWordTemplate() {
  return request({
    url: '/questions/template/word/download',
    method: 'get',
    responseType: 'blob'
  })
}

// 获取科目列表
export function getSubjects() {
  return request({
    url: '/questions/subjects/list',
    method: 'get'
  })
}

// 获取题目统计
export function getQuestionStatistics() {
  return request({
    url: '/questions/statistics/overview',
    method: 'get'
  })
}
