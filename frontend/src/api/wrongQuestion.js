import request from '@/utils/request'

// 获取错题列表
export function getWrongQuestions(params) {
  return request({
    url: '/wrong-questions',
    method: 'get',
    params
  })
}

// 标记错题为已掌握
export function markWrongQuestionAsMastered(questionId) {
  return request({
    url: `/wrong-questions/${questionId}/mastered`,
    method: 'put'
  })
}

// 删除错题记录
export function deleteWrongQuestion(questionId) {
  return request({
    url: `/wrong-questions/${questionId}`,
    method: 'delete'
  })
}

// 获取错题统计
export function getWrongQuestionStatistics() {
  return request({
    url: '/wrong-questions/statistics/overview',
    method: 'get'
  })
}

// 错题练习
export function wrongQuestionPractice(params) {
  return request({
    url: '/wrong-questions/practice/start',
    method: 'get',
    params
  })
}
