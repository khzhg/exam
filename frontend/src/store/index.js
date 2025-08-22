import { reactive } from 'vue'

// 全局状态管理（简化版）
const state = reactive({
  // 用户信息
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  token: localStorage.getItem('token') || '',
  
  // 考试状态
  currentExam: null,
  examTimeLeft: 0,
  
  // 系统配置
  loading: false
})

const store = {
  state,
  
  // 设置用户信息
  setUser(user) {
    state.user = user
    localStorage.setItem('user', JSON.stringify(user))
  },
  
  // 设置token
  setToken(token) {
    state.token = token
    localStorage.setItem('token', token)
  },
  
  // 清除用户信息
  clearUser() {
    state.user = null
    state.token = ''
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  },
  
  // 设置当前考试
  setCurrentExam(exam) {
    state.currentExam = exam
  },
  
  // 设置考试剩余时间
  setExamTimeLeft(time) {
    state.examTimeLeft = time
  },
  
  // 设置加载状态
  setLoading(loading) {
    state.loading = loading
  },
  
  // 检查是否已登录
  isLoggedIn() {
    return !!state.token && !!state.user
  },
  
  // 检查是否为管理员
  isAdmin() {
    return state.user?.role === 'admin'
  },
  
  // 检查是否为学生
  isStudent() {
    return state.user?.role === 'student'
  }
}

export default {
  install(app) {
    app.config.globalProperties.$store = store
    app.provide('store', store)
  }
}
