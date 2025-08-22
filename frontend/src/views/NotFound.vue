<template>
  <div class="not-found-container">
    <div class="not-found-content">
      <div class="error-icon">
        <el-icon size="120"><Warning /></el-icon>
      </div>
      <h1>404</h1>
      <h2>页面未找到</h2>
      <p>抱歉，您访问的页面不存在或已被移动</p>
      <div class="actions">
        <el-button type="primary" @click="goHome">
          返回首页
        </el-button>
        <el-button @click="goBack">
          返回上页
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { Warning } from '@element-plus/icons-vue'

const router = useRouter()

const goHome = () => {
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null')
  if (userInfo && userInfo.role === 'admin') {
    router.push('/admin/dashboard')
  } else if (userInfo && userInfo.role === 'student') {
    router.push('/student/dashboard')
  } else {
    router.push('/login')
  }
}

const goBack = () => {
  router.go(-1)
}
</script>

<style scoped>
.not-found-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20px;
}

.not-found-content {
  text-align: center;
  max-width: 500px;
}

.error-icon {
  color: #f56c6c;
  margin-bottom: 20px;
}

h1 {
  font-size: 72px;
  font-weight: bold;
  color: #333;
  margin: 0 0 16px 0;
}

h2 {
  font-size: 24px;
  color: #666;
  margin: 0 0 16px 0;
}

p {
  font-size: 16px;
  color: #999;
  margin: 0 0 32px 0;
  line-height: 1.6;
}

.actions {
  display: flex;
  gap: 16px;
  justify-content: center;
}

@media (max-width: 480px) {
  h1 {
    font-size: 48px;
  }
  
  h2 {
    font-size: 20px;
  }
  
  .actions {
    flex-direction: column;
    align-items: center;
  }
  
  .actions .el-button {
    width: 200px;
  }
}
</style>
