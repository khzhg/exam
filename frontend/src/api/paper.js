import request from '@/utils/request'

// 获取试卷列表
export function getPapers(params) {
  return request({
    url: '/papers',
    method: 'get',
    params
  })
}

// 获取可用试卷
export function getActivePapers() {
  return request({
    url: '/papers/active/list',
    method: 'get'
  })
}

// 获取试卷详情
export function getPaperById(id) {
  return request({
    url: `/papers/${id}`,
    method: 'get'
  })
}

// 创建试卷
export function createPaper(data) {
  return request({
    url: '/papers',
    method: 'post',
    data
  })
}

// 更新试卷
export function updatePaper(id, data) {
  return request({
    url: `/papers/${id}`,
    method: 'put',
    data
  })
}

// 删除试卷
export function deletePaper(id) {
  return request({
    url: `/papers/${id}`,
    method: 'delete'
  })
}

// 添加题目到试卷
export function addQuestionToPaper(paperId, data) {
  return request({
    url: `/papers/${paperId}/questions`,
    method: 'post',
    data
  })
}

// 批量添加题目到试卷
export function addQuestionsToPaper(paperId, data) {
  return request({
    url: `/papers/${paperId}/questions/batch`,
    method: 'post',
    data
  })
}

// 从试卷中移除题目
export function removeQuestionFromPaper(paperId, questionId) {
  return request({
    url: `/papers/${paperId}/questions/${questionId}`,
    method: 'delete'
  })
}

// 更新题目分数
export function updateQuestionScore(paperId, questionId, data) {
  return request({
    url: `/papers/${paperId}/questions/${questionId}/score`,
    method: 'put',
    data
  })
}

// 自动组卷
export function autoGeneratePaper(data) {
  return request({
    url: '/papers/auto/generate',
    method: 'post',
    data
  })
}
