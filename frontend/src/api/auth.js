import request from '@/utils/request'

// 用户注册
export function register(data) {
  return request({
    url: '/auth/register',
    method: 'post',
    data
  })
}

// 用户登录
export function login(data) {
  return request({
    url: '/auth/login',
    method: 'post',
    data
  })
}

// 获取用户信息
export function getUserProfile() {
  return request({
    url: '/users/profile',
    method: 'get'
  })
}

// 更新用户信息
export function updateUserProfile(data) {
  return request({
    url: '/users/profile',
    method: 'put',
    data
  })
}

// 修改密码
export function changePassword(data) {
  return request({
    url: '/users/password',
    method: 'put',
    data
  })
}

// Auth API 对象（与组件中使用的结构一致）
export const authAPI = {
  // 用户登录
  login: (data) => request({
    url: '/auth/login',
    method: 'post',
    data
  }),
  
  // 用户注册
  register: (data) => request({
    url: '/auth/register',
    method: 'post',
    data
  }),
  
  // 获取用户信息
  getUserInfo: () => request({
    url: '/auth/me',
    method: 'get'
  })
}
