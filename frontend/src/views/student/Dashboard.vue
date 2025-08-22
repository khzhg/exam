<template>
  <div class="dashboard-container">
    <el-container>
      <!-- 顶部导航 -->
      <el-header class="dashboard-header">
        <div class="header-left">
          <h2>在线考试系统</h2>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <el-button text>
              <el-icon><User /></el-icon>
              {{ userInfo.realName || userInfo.username }}
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主体内容 -->
      <el-container>
        <!-- 侧边栏 -->
        <el-aside width="240px" class="dashboard-aside">
          <el-menu
            :default-active="activeMenu"
            class="dashboard-menu"
            router
          >
            <el-menu-item index="/student/dashboard">
              <el-icon><House /></el-icon>
              <span>首页</span>
            </el-menu-item>
            <el-menu-item index="/student/exams">
              <el-icon><Document /></el-icon>
              <span>我的考试</span>
            </el-menu-item>
            <el-menu-item index="/student/results">
              <el-icon><Trophy /></el-icon>
              <span>考试成绩</span>
            </el-menu-item>
            <el-menu-item index="/student/wrong-questions">
              <el-icon><Warning /></el-icon>
              <span>错题集</span>
            </el-menu-item>
          </el-menu>
        </el-aside>

        <!-- 主要内容区域 -->
        <el-main class="dashboard-main">
          <!-- 统计卡片 -->
          <div class="stats-cards">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-card class="stats-card">
                  <div class="stats-content">
                    <div class="stats-icon exam-icon">
                      <el-icon><Document /></el-icon>
                    </div>
                    <div class="stats-info">
                      <h3>{{ stats.totalExams }}</h3>
                      <p>总考试数</p>
                    </div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card class="stats-card">
                  <div class="stats-content">
                    <div class="stats-icon completed-icon">
                      <el-icon><CircleCheck /></el-icon>
                    </div>
                    <div class="stats-info">
                      <h3>{{ stats.completedExams }}</h3>
                      <p>已完成</p>
                    </div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card class="stats-card">
                  <div class="stats-content">
                    <div class="stats-icon average-icon">
                      <el-icon><Trophy /></el-icon>
                    </div>
                    <div class="stats-info">
                      <h3>{{ stats.averageScore }}分</h3>
                      <p>平均分</p>
                    </div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card class="stats-card">
                  <div class="stats-content">
                    <div class="stats-icon wrong-icon">
                      <el-icon><Warning /></el-icon>
                    </div>
                    <div class="stats-info">
                      <h3>{{ stats.wrongQuestions }}</h3>
                      <p>错题数量</p>
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>

          <!-- 最近考试 -->
          <el-card class="recent-exams">
            <template #header>
              <div class="card-header">
                <span>最近考试</span>
                <router-link to="/student/exams">
                  <el-button text type="primary">查看全部</el-button>
                </router-link>
              </div>
            </template>
            
            <el-table :data="recentExams" style="width: 100%">
              <el-table-column prop="paperTitle" label="试卷名称" />
              <el-table-column prop="score" label="得分" width="100">
                <template #default="scope">
                  <span v-if="scope.row.score !== null">{{ scope.row.score }}分</span>
                  <el-tag v-else type="warning">未完成</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="submitTime" label="提交时间" width="180">
                <template #default="scope">
                  <span v-if="scope.row.submitTime">
                    {{ formatDate(scope.row.submitTime) }}
                  </span>
                  <span v-else class="text-gray">-</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag 
                    :type="scope.row.status === 'completed' ? 'success' : 'warning'"
                  >
                    {{ scope.row.status === 'completed' ? '已完成' : '进行中' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="scope">
                  <el-button 
                    v-if="scope.row.status === 'in_progress'"
                    type="primary" 
                    size="small"
                    @click="continueExam(scope.row)"
                  >
                    继续考试
                  </el-button>
                  <el-button 
                    v-else
                    type="primary" 
                    size="small"
                    @click="viewResult(scope.row)"
                  >
                    查看结果
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </el-card>

          <!-- 快速操作 -->
          <el-card class="quick-actions">
            <template #header>
              <span>快速操作</span>
            </template>
            
            <el-row :gutter="16">
              <el-col :span="8">
                <div class="action-item" @click="$router.push('/student/exams')">
                  <el-icon class="action-icon"><Document /></el-icon>
                  <h4>开始考试</h4>
                  <p>查看可参加的考试</p>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="action-item" @click="$router.push('/student/results')">
                  <el-icon class="action-icon"><Trophy /></el-icon>
                  <h4>查看成绩</h4>
                  <p>查看历史考试成绩</p>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="action-item" @click="$router.push('/student/wrong-questions')">
                  <el-icon class="action-icon"><Warning /></el-icon>
                  <h4>错题练习</h4>
                  <p>复习错题巩固知识</p>
                </div>
              </el-col>
            </el-row>
          </el-card>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User, ArrowDown, House, Document, Trophy, Warning,
  CircleCheck
} from '@element-plus/icons-vue'
import { examAPI } from '@/api/exam'

const router = useRouter()
const route = useRoute()

// 用户信息
const userInfo = computed(() => {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : {}
})

// 当前激活的菜单
const activeMenu = computed(() => route.path)

// 统计数据
const stats = reactive({
  totalExams: 0,
  completedExams: 0,
  averageScore: 0,
  wrongQuestions: 0
})

// 最近考试数据
const recentExams = ref([])

// 获取统计数据
const getStats = async () => {
  try {
    // 使用考试历史API来计算统计数据
    const response = await examAPI.getUserExamHistory({ page: 1, limit: 100 })
    if (response.success) {
      const data = response.data
      const records = data.records || []
      
      // 计算统计信息
      const totalExams = records.length
      const completedExams = records.filter(exam => exam.status === 'completed').length
      const scores = records.filter(exam => exam.obtained_score != null).map(exam => exam.obtained_score || 0)
      const averageScore = scores.length > 0 ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : 0
      
      Object.assign(stats, {
        totalExams,
        completedExams,
        averageScore,
        wrongQuestions: 0 // 暂时设为0，需要错题API
      })
      
      console.log('统计数据加载成功:', stats)
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 获取最近考试
const getRecentExams = async () => {
  try {
    // 使用考试历史API获取最近5次考试
    const response = await examAPI.getUserExamHistory({ page: 1, limit: 5 })
    if (response.success) {
      const data = response.data
      const records = data.records || []
      
      // 映射数据结构
      recentExams.value = records.map(exam => ({
        id: exam.id,
        paperTitle: exam.paper_title || `试卷${exam.paper_id}`,
        score: exam.obtained_score,
        submitTime: exam.end_time,
        status: exam.status || 'completed',
        type: exam.type,
        examRecordId: exam.id
      }))
      
      console.log('最近考试加载成功:', recentExams.value)
    }
  } catch (error) {
    console.error('获取最近考试失败:', error)
  }
}

// 格式化日期
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 继续考试
const continueExam = (exam) => {
  router.push(`/student/exam/${exam.examRecordId}`)
}

// 查看考试结果
const viewResult = (exam) => {
  router.push(`/student/result/${exam.examRecordId}`)
}

// 处理下拉菜单命令
const handleCommand = async (command) => {
  switch (command) {
    case 'profile':
      router.push('/student/profile')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        // 清除本地存储的用户信息和token
        localStorage.removeItem('user')
        localStorage.removeItem('token')
        
        ElMessage.success('已退出登录')
        router.push('/login')
      } catch {
        // 用户取消退出
      }
      break
  }
}

onMounted(() => {
  getStats()
  getRecentExams()
})
</script>

<style scoped>
.dashboard-container {
  height: 100vh;
}

.dashboard-header {
  background: white;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left h2 {
  margin: 0;
  color: #333;
  font-size: 20px;
}

.dashboard-aside {
  background: white;
  border-right: 1px solid #e6e6e6;
}

.dashboard-menu {
  border-right: none;
  height: 100%;
}

.dashboard-main {
  background: #f5f5f5;
  padding: 20px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stats-card {
  height: 100px;
}

.stats-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stats-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.exam-icon {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.completed-icon {
  background: linear-gradient(135deg, #f093fb, #f5576c);
}

.average-icon {
  background: linear-gradient(135deg, #ffecd2, #fcb69f);
}

.wrong-icon {
  background: linear-gradient(135deg, #ff9a9e, #fecfef);
}

.stats-info h3 {
  margin: 0 0 5px 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.stats-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.recent-exams {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.quick-actions .action-item {
  text-align: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.quick-actions .action-item:hover {
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.action-icon {
  font-size: 32px;
  color: #409eff;
  margin-bottom: 10px;
}

.action-item h4 {
  margin: 0 0 5px 0;
  color: #333;
  font-size: 16px;
}

.action-item p {
  margin: 0;
  color: #666;
  font-size: 12px;
}

.text-gray {
  color: #999;
}
</style>
