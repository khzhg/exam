<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h2>在线考试系统</h2>
        <p>请登录您的账户</p>
      </div>
      
      <el-form 
        ref="loginFormRef" 
        :model="loginForm" 
        :rules="loginRules" 
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="loginForm.username"
            placeholder="请输入用户名"
            size="large"
            :prefix-icon="User"
          />
        </el-form-item>
        
        <el-form-item prop="password">
          <el-input
            v-model="loginForm.password"
            type="password"
            placeholder="请输入密码"
            size="large"
            :prefix-icon="Lock"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>
        
        <el-form-item>
          <el-button 
            type="primary" 
            size="large" 
            class="login-button"
            :loading="loading"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <p>
          还没有账户？
          <router-link to="/register" class="register-link">
            立即注册
          </router-link>
        </p>
        <br />
         <p>design：han V1.0</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { User, Lock } from '@element-plus/icons-vue'
import { login } from '@/api/auth'

const router = useRouter()
const store = inject('store')

const loginFormRef = ref()
const loading = ref(false)

const loginForm = ref({
  username: '',
  password: ''
})

const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少 6 个字符', trigger: 'blur' }
  ]
}

const handleLogin = async () => {
  try {
    const valid = await loginFormRef.value.validate()
    if (!valid) return
    
    loading.value = true
    
    const response = await login(loginForm.value)
    
    if (response.success) {
      // 保存用户信息和token
      store.setToken(response.data.token)
      store.setUser(response.data.user)
      
      ElMessage.success('登录成功')
      
      // 根据用户角色跳转到不同页面
      if (response.data.user.role === 'admin') {
        router.push('/admin/dashboard')
      } else {
        router.push('/student/dashboard')
      }
    }
  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error('登录失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  padding: 40px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  color: #333;
  margin-bottom: 8px;
  font-size: 28px;
  font-weight: 600;
}

.login-header p {
  color: #666;
  font-size: 14px;
}

.login-form {
  margin-bottom: 20px;
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 500;
}

.login-footer {
  text-align: center;
}

.login-footer p {
  color: #666;
  font-size: 14px;
}

.register-link {
  color: #409eff;
  text-decoration: none;
  font-weight: 500;
}

.register-link:hover {
  text-decoration: underline;
}

@media (max-width: 480px) {
  .login-card {
    padding: 30px 20px;
  }
  
  .login-header h2 {
    font-size: 24px;
  }
}
</style>
