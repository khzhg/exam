<template>
  <div class="admin-dashboard">
    <el-container>
      <!-- 顶部导航 -->
      <el-header class="admin-header">
        <div class="header-left">
          <h2>考试管理系统</h2>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <el-button text>
              <el-icon><User /></el-icon>
              {{ userInfo.real_name || userInfo.username }}
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

      <el-container>
        <!-- 侧边栏 -->
        <el-aside width="240px" class="admin-aside">
          <el-menu
            :default-active="activeMenu"
            class="admin-menu"
            router
          >
            <el-menu-item index="/admin/dashboard">
              <el-icon><House /></el-icon>
              <span>控制台</span>
            </el-menu-item>
            <el-menu-item index="/admin/questions">
              <el-icon><EditPen /></el-icon>
              <span>题库管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/papers">
              <el-icon><Document /></el-icon>
              <span>试卷管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/exams">
              <el-icon><Timer /></el-icon>
              <span>考试管理</span>
            </el-menu-item>
            <el-menu-item index="/admin/results">
              <el-icon><TrendCharts /></el-icon>
              <span>成绩统计</span>
            </el-menu-item>
            <el-menu-item index="/admin/users">
              <el-icon><Avatar /></el-icon>
              <span>用户管理</span>
            </el-menu-item>
          </el-menu>
        </el-aside>

        <!-- 主要内容区域 -->
        <el-main class="admin-main">
          <!-- 统计卡片 -->
          <div class="stats-overview">
            <el-row :gutter="16">
              <el-col :span="6">
                <el-card class="stats-card">
                  <div class="stats-content">
                    <div class="stats-icon students-icon">
                      <el-icon><Avatar /></el-icon>
                    </div>
                    <div class="stats-info">
                      <h3>{{ stats.totalStudents }}</h3>
                      <p>学生总数</p>
                      <span class="stats-change positive">
                        +{{ stats.newStudents }} 新增
                      </span>
                    </div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card class="stats-card">
                  <div class="stats-content">
                    <div class="stats-icon questions-icon">
                      <el-icon><EditPen /></el-icon>
                    </div>
                    <div class="stats-info">
                      <h3>{{ stats.totalQuestions }}</h3>
                      <p>题库题目</p>
                      <span class="stats-change positive">
                        +{{ stats.newQuestions }} 新增
                      </span>
                    </div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card class="stats-card">
                  <div class="stats-content">
                    <div class="stats-icon papers-icon">
                      <el-icon><Document /></el-icon>
                    </div>
                    <div class="stats-info">
                      <h3>{{ stats.totalPapers }}</h3>
                      <p>试卷总数</p>
                      <span class="stats-change positive">
                        +{{ stats.newPapers }} 新增
                      </span>
                    </div>
                  </div>
                </el-card>
              </el-col>
              <el-col :span="6">
                <el-card class="stats-card">
                  <div class="stats-content">
                    <div class="stats-icon exams-icon">
                      <el-icon><Timer /></el-icon>
                    </div>
                    <div class="stats-info">
                      <h3>{{ stats.activeExams }}</h3>
                      <p>进行中考试</p>
                      <span class="stats-change">
                        共{{ stats.totalExams }}场
                      </span>
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>

          <!-- 图表和表格 -->
          <el-row :gutter="16">
            <!-- 考试统计图表 -->
            <el-col :span="12">
              <el-card class="chart-card">
                <template #header>
                  <span>近7天考试统计</span>
                </template>
                <div class="chart-container">
                  <div class="chart-placeholder">
                    <el-icon class="chart-icon"><TrendCharts /></el-icon>
                    <p>考试统计图表</p>
                    <el-button type="primary" size="small">查看详细</el-button>
                  </div>
                </div>
              </el-card>
            </el-col>

            <!-- 成绩分布图表 -->
            <el-col :span="12">
              <el-card class="chart-card">
                <template #header>
                  <span>成绩分布</span>
                </template>
                <div class="chart-container">
                  <div class="chart-placeholder">
                    <el-icon class="chart-icon"><PieChart /></el-icon>
                    <p>成绩分布图表</p>
                    <el-button type="primary" size="small">查看详细</el-button>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <!-- 最近活动 -->
          <el-row :gutter="16">
            <!-- 最近考试 -->
            <el-col :span="12">
              <el-card class="recent-card">
                <template #header>
                  <div class="card-header">
                    <span>最近考试</span>
                    <router-link to="/admin/exams">
                      <el-button text type="primary">查看全部</el-button>
                    </router-link>
                  </div>
                </template>
                
                <div class="recent-list">
                  <div 
                    v-for="exam in recentExams" 
                    :key="exam.id"
                    class="recent-item"
                  >
                    <div class="item-info">
                      <h4>{{ exam.paperTitle }}</h4>
                      <p>{{ formatDate(exam.startTime) }}</p>
                    </div>
                    <div class="item-status">
                      <el-tag :type="getExamStatusType(exam.status)">
                        {{ getExamStatusText(exam.status) }}
                      </el-tag>
                      <span class="participant-count">
                        {{ exam.participantCount }}人参与
                      </span>
                    </div>
                  </div>
                </div>
              </el-card>
            </el-col>

            <!-- 系统日志 -->
            <el-col :span="12">
              <el-card class="recent-card">
                <template #header>
                  <div class="card-header">
                    <span>系统日志</span>
                    <el-button text type="primary">查看全部</el-button>
                  </div>
                </template>
                
                <div class="recent-list">
                  <div 
                    v-for="log in systemLogs" 
                    :key="log.id"
                    class="recent-item"
                  >
                    <div class="item-info">
                      <h4>{{ log.action }}</h4>
                      <p>{{ log.description }}</p>
                    </div>
                    <div class="item-status">
                      <span class="log-time">
                        {{ formatTime(log.createdAt) }}
                      </span>
                    </div>
                  </div>
                </div>
              </el-card>
            </el-col>
          </el-row>

          <!-- 快速操作 -->
          <el-card class="quick-actions">
            <template #header>
              <span>快速操作</span>
            </template>
            
            <el-row :gutter="16">
              <el-col :span="4">
                <div class="action-item" @click="$router.push('/admin/questions')">
                  <el-icon class="action-icon"><Plus /></el-icon>
                  <h4>创建题目</h4>
                  <p>添加新的考试题目</p>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="action-item" @click="$router.push('/admin/papers')">
                  <el-icon class="action-icon"><DocumentAdd /></el-icon>
                  <h4>创建试卷</h4>
                  <p>组织题目成试卷</p>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="action-item" @click="$router.push('/admin/exams')">
                  <el-icon class="action-icon"><Timer /></el-icon>
                  <h4>发布考试</h4>
                  <p>安排新的考试</p>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="action-item" @click="$router.push('/admin/questions')">
                  <el-icon class="action-icon"><Upload /></el-icon>
                  <h4>导入题目</h4>
                  <p>批量导入Excel题目</p>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="action-item" @click="$router.push('/admin/results')">
                  <el-icon class="action-icon"><TrendCharts /></el-icon>
                  <h4>查看统计</h4>
                  <p>分析考试数据</p>
                </div>
              </el-col>
              <el-col :span="4">
                <div class="action-item" @click="$router.push('/admin/users')">
                  <el-icon class="action-icon"><Avatar /></el-icon>
                  <h4>用户管理</h4>
                  <p>管理学生账户</p>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  User, ArrowDown, House, EditPen, Document, Timer, TrendCharts, Avatar,
  Plus, DocumentAdd, Upload, PieChart
} from '@element-plus/icons-vue'
import { adminAPI } from '@/api/admin'

const router = useRouter()
const route = useRoute()

// 用户信息
const userInfo = ref(JSON.parse(localStorage.getItem('user') || '{}'))

// 当前激活的菜单
const activeMenu = computed(() => route.path)

// 统计数据
const stats = reactive({
  totalStudents: 0,
  newStudents: 0,
  totalQuestions: 0,
  newQuestions: 0,
  totalPapers: 0,
  newPapers: 0,
  totalExams: 0,
  activeExams: 0
})

// 最近考试
const recentExams = ref([])

// 系统日志
const systemLogs = ref([])

// 获取统计数据
const getStats = async () => {
  try {
    const response = await adminAPI.getDashboardStats()
    if (response.success) {
      const data = response.data
      Object.assign(stats, {
        totalStudents: data.users?.totalStudents || 0,
        newStudents: 0, // TODO: 需要后端支持
        totalQuestions: data.questions?.total || 0,
        newQuestions: 0, // TODO: 需要后端支持
        totalPapers: data.papers?.total || 0,
        newPapers: 0, // TODO: 需要后端支持
        totalExams: data.exams?.total || 0,
        activeExams: data.exams?.today || 0
      })
      // recentExams.value = data.recentExams || []
      // systemLogs.value = data.systemLogs || []
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    ElMessage.error('获取统计数据失败')
  }
}

// 格式化日期
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('zh-CN')
}

// 格式化时间
const formatTime = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 获取考试状态类型
const getExamStatusType = (status) => {
  const typeMap = {
    'not_started': '',
    'in_progress': 'warning',
    'completed': 'success',
    'expired': 'danger'
  }
  return typeMap[status] || ''
}

// 获取考试状态文本
const getExamStatusText = (status) => {
  const textMap = {
    'not_started': '未开始',
    'in_progress': '进行中',
    'completed': '已结束',
    'expired': '已过期'
  }
  return textMap[status] || '未知'
}

// 处理下拉菜单命令
const handleCommand = async (command) => {
  switch (command) {
    case 'profile':
      router.push('/admin/profile')
      break
    case 'logout':
      try {
        await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        
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
})
</script>

<style scoped>
.admin-dashboard {
  height: 100vh;
}

.admin-header {
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

.admin-aside {
  background: white;
  border-right: 1px solid #e6e6e6;
}

.admin-menu {
  border-right: none;
  height: 100%;
}

.admin-main {
  background: #f5f5f5;
  padding: 20px;
}

.stats-overview {
  margin-bottom: 20px;
}

.stats-card {
  height: 120px;
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

.students-icon {
  background: linear-gradient(135deg, #667eea, #764ba2);
}

.questions-icon {
  background: linear-gradient(135deg, #f093fb, #f5576c);
}

.papers-icon {
  background: linear-gradient(135deg, #4facfe, #00f2fe);
}

.exams-icon {
  background: linear-gradient(135deg, #ffecd2, #fcb69f);
}

.stats-info h3 {
  margin: 0 0 5px 0;
  font-size: 28px;
  font-weight: 600;
  color: #333;
}

.stats-info p {
  margin: 0 0 5px 0;
  color: #666;
  font-size: 14px;
}

.stats-change {
  font-size: 12px;
  color: #999;
}

.stats-change.positive {
  color: #67c23a;
}

.chart-card {
  margin-bottom: 20px;
  height: 300px;
}

.chart-container {
  height: 220px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-placeholder {
  text-align: center;
  color: #999;
}

.chart-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.recent-card {
  margin-bottom: 20px;
  height: 300px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.recent-list {
  max-height: 220px;
  overflow-y: auto;
}

.recent-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.recent-item:last-child {
  border-bottom: none;
}

.item-info h4 {
  margin: 0 0 4px 0;
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.item-info p {
  margin: 0;
  color: #666;
  font-size: 12px;
}

.item-status {
  text-align: right;
}

.participant-count {
  display: block;
  color: #999;
  font-size: 12px;
  margin-top: 4px;
}

.log-time {
  color: #999;
  font-size: 12px;
}

.quick-actions .action-item {
  text-align: center;
  padding: 20px;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
  height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.quick-actions .action-item:hover {
  border-color: #409eff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.action-icon {
  font-size: 32px;
  color: #409eff;
  margin-bottom: 8px;
}

.action-item h4 {
  margin: 0 0 4px 0;
  color: #333;
  font-size: 14px;
  font-weight: 500;
}

.action-item p {
  margin: 0;
  color: #666;
  font-size: 12px;
}
</style>
