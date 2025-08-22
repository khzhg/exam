<template>
  <div class="exam-list">
    <!-- 页面头部 -->
    <el-card class="page-header">
      <template #header>
        <div class="header-content">
          <h2>我的考试</h2>
          <div class="header-stats">
            <el-statistic title="待考试数" :value="pendingExamsCount" suffix="场" />
            <el-statistic title="已完成" :value="completedExamsCount" suffix="场" />
            <el-statistic title="本月考试" :value="monthlyExamsCount" suffix="场" />
          </div>
        </div>
      </template>
      
      <!-- 快速筛选 -->
      <div class="filter-section">
        <el-radio-group v-model="activeTab" @change="handleTabChange">
          <el-radio-button label="scheduled">安排考试</el-radio-button>
          <el-radio-button label="available">可用试卷</el-radio-button>
          <el-radio-button label="completed">已完成</el-radio-button>
        </el-radio-group>
        
        <div class="filter-controls">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索考试或试卷名称"
            clearable
            style="width: 300px"
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button @click="refreshList" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 安排考试列表 -->
    <el-card v-if="activeTab === 'scheduled'" class="exam-content">
      <template #header>
        <div class="card-header">
          <span>安排考试</span>
          <el-badge :value="scheduledExams.length" class="item" type="primary" />
        </div>
      </template>
      
      <div v-loading="loading" class="exam-grid">
        <div v-if="scheduledExams.length === 0" class="empty-state">
          <el-empty description="暂无安排的考试" />
        </div>
        
        <div 
          v-for="exam in filteredScheduledExams" 
          :key="exam.id" 
          class="exam-card"
          :class="{ 
            'exam-available': exam.exam_status === 'available',
            'exam-pending': exam.exam_status === 'not_started',
            'exam-expired': exam.exam_status === 'expired',
            'exam-completed': exam.exam_status === 'completed',
            'exam-in-progress': exam.exam_status === 'in_progress'
          }"
        >
          <div class="exam-header">
            <h3 class="exam-title">{{ exam.title }}</h3>
            <el-tag 
              :type="getExamStatusType(exam.exam_status)"
              effect="dark"
            >
              {{ getExamStatusText(exam.exam_status) }}
            </el-tag>
          </div>
          
          <div class="exam-meta">
            <div class="meta-item">
              <el-icon><Document /></el-icon>
              <span>{{ exam.paper_title }}</span>
            </div>
            <div class="meta-item">
              <el-icon><Clock /></el-icon>
              <span>{{ exam.paper_duration || 60 }}分钟</span>
            </div>
            <div class="meta-item">
              <el-icon><Calendar /></el-icon>
              <span>{{ formatDateRange(exam.start_time, exam.end_time) }}</span>
            </div>
          </div>
          
          <div class="exam-description" v-if="exam.description">
            <p>{{ exam.description }}</p>
          </div>
          
          <div class="exam-timing">
            <div class="timing-info">
              <div class="time-label">开始时间</div>
              <div class="time-value">{{ formatDateTime(exam.start_time) }}</div>
            </div>
            <div class="timing-info">
              <div class="time-label">结束时间</div>
              <div class="time-value">{{ formatDateTime(exam.end_time) }}</div>
            </div>
          </div>
          
          <!-- 倒计时显示 -->
          <div v-if="exam.exam_status === 'not_started'" class="countdown">
            <el-icon><Timer /></el-icon>
            <span>距离开始: {{ getCountdown(exam.start_time) }}</span>
          </div>
          
          <div v-if="exam.exam_status === 'available'" class="countdown">
            <el-icon><Timer /></el-icon>
            <span>剩余时间: {{ getCountdown(exam.end_time) }}</span>
          </div>
          
          <div class="exam-actions">
            <el-button 
              v-if="exam.exam_status === 'available'"
              type="primary" 
              size="large"
              @click="startScheduledExam(exam)"
              :loading="startingExam === exam.id"
            >
              <el-icon><VideoPlay /></el-icon>
              开始考试
            </el-button>
            
            <el-button 
              v-if="exam.exam_status === 'in_progress'"
              type="success" 
              size="large"
              @click="continueExam(exam)"
            >
              <el-icon><VideoPlay /></el-icon>
              继续考试
            </el-button>
            
            <el-button 
              v-if="exam.exam_status === 'completed'"
              type="info" 
              size="large"
              @click="viewResult(exam)"
            >
              <el-icon><View /></el-icon>
              查看成绩
            </el-button>
            
            <el-button 
              v-if="exam.exam_status === 'not_started'"
              disabled
              size="large"
            >
              <el-icon><Lock /></el-icon>
              未开始
            </el-button>
            
            <el-button 
              v-if="exam.exam_status === 'expired'"
              disabled
              size="large"
            >
              <el-icon><CircleClose /></el-icon>
              已过期
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 可用试卷列表 -->
    <el-card v-if="activeTab === 'available'" class="exam-content">
      <template #header>
        <div class="card-header">
          <span>可用试卷</span>
          <el-badge :value="availablePapers.length" class="item" type="success" />
        </div>
      </template>
      
      <div v-loading="loading" class="exam-grid">
        <div v-if="availablePapers.length === 0" class="empty-state">
          <el-empty description="暂无可用试卷" />
        </div>
        
        <div 
          v-for="paper in filteredAvailablePapers" 
          :key="paper.id" 
          class="exam-card paper-card"
        >
          <div class="exam-header">
            <h3 class="exam-title">{{ paper.title }}</h3>
            <el-tag type="success" effect="dark">可练习</el-tag>
          </div>
          
          <div class="exam-meta">
            <div class="meta-item">
              <el-icon><EditPen /></el-icon>
              <span>{{ paper.question_count }}题</span>
            </div>
            <div class="meta-item">
              <el-icon><Clock /></el-icon>
              <span>{{ paper.duration }}分钟</span>
            </div>
            <div class="meta-item">
              <el-icon><Star /></el-icon>
              <span>{{ paper.total_score }}分</span>
            </div>
          </div>
          
          <div class="exam-description" v-if="paper.description">
            <p>{{ paper.description }}</p>
          </div>
          
          <div class="paper-stats">
            <div class="stat-item">
              <span class="stat-label">创建时间</span>
              <span class="stat-value">{{ formatDate(paper.created_at) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">考试次数</span>
              <span class="stat-value">{{ getPaperExamCount(paper.id) }}次</span>
            </div>
          </div>
          
          <div class="exam-actions">
            <el-button 
              type="primary" 
              size="large"
              @click="startPaperExam(paper)"
              :loading="startingPaper === paper.id"
            >
              <el-icon><VideoPlay /></el-icon>
              开始练习
            </el-button>
            <el-button 
              size="large"
              @click="viewPaperDetail(paper)"
            >
              <el-icon><View /></el-icon>
              预览试卷
            </el-button>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 已完成考试列表 -->
    <el-card v-if="activeTab === 'completed'" class="exam-content">
      <template #header>
        <div class="card-header">
          <span>考试历史</span>
          <el-badge :value="completedExams.length" class="item" type="info" />
        </div>
      </template>
      
      <div v-loading="loading">
        <el-table :data="filteredCompletedExams" style="width: 100%">
          <el-table-column prop="exam_title" label="考试名称" width="120">
            <template #default="scope">
              <el-tag :type="scope.row.type === 'practice' ? 'info' : 'warning'" size="small">
                {{ scope.row.exam_title }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="paper_title" label="试卷名称" min-width="200">
            <template #default="scope">
              <div class="paper-info">
                <div class="paper-name">{{ scope.row.paper_name || scope.row.paper_title || '未命名试卷' }}</div>
                <div class="paper-type" v-if="scope.row.schedule_id">
                  <el-tag size="small" type="warning">安排考试</el-tag>
                </div>
                <div class="paper-type" v-else>
                  <el-tag size="small" type="info">练习模式</el-tag>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="subject" label="科目" width="100">
            <template #default="scope">
              {{ scope.row.subject }}
            </template>
          </el-table-column>
          <el-table-column prop="score" label="得分" width="120">
            <template #default="scope">
              <div class="score-info">
                <span class="score">{{ scope.row.score }}</span>
                <span class="total-score">/ {{ scope.row.total_score }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="accuracy" label="正确率" width="100">
            <template #default="scope">
              <el-progress 
                :percentage="scope.row.accuracy"
                :stroke-width="8"
                :show-text="false"
              />
              <div class="accuracy-text">
                {{ scope.row.accuracy }}%
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="duration" label="用时" width="100">
            <template #default="scope">
              {{ formatDuration(scope.row.duration) }}
            </template>
          </el-table-column>
          <el-table-column prop="submitted_at" label="完成时间" width="180">
            <template #default="scope">
              {{ formatDateTime(scope.row.submitted_at) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="scope">
              <el-button size="small" @click="viewResult(scope.row)">
                <el-icon><View /></el-icon>
                查看详情
              </el-button>
              <el-button 
                size="small" 
                type="primary" 
                @click="reviewExam(scope.row)"
              >
                <el-icon><Document /></el-icon>
                查看解析
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        
        <!-- 分页 -->
        <div class="pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.limit"
            :page-sizes="[10, 20, 50]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="loadCompletedExams"
            @current-change="loadCompletedExams"
          />
        </div>
      </div>
    </el-card>

    <!-- 试卷详情对话框 -->
    <el-dialog
      v-model="showPaperDialog"
      title="试卷预览"
      width="800px"
      :before-close="handlePaperDialogClose"
    >
      <div v-if="currentPaper" class="paper-preview">
        <div class="paper-info">
          <h3>{{ currentPaper.title }}</h3>
          <div class="paper-meta">
            <span>总分: {{ currentPaper.total_score }}分</span>
            <span>时长: {{ currentPaper.duration }}分钟</span>
            <span>题目数: {{ currentPaper.question_count }}题</span>
          </div>
          <p v-if="currentPaper.description">{{ currentPaper.description }}</p>
        </div>
        
        <div class="question-summary" v-if="currentPaper.questions">
          <h4>题目概览</h4>
          <div class="question-types">
            <div v-for="(count, type) in getQuestionTypesCount(currentPaper.questions)" :key="type" class="type-item">
              <span class="type-name">{{ getQuestionTypeName(type) }}</span>
              <span class="type-count">{{ count }}题</span>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showPaperDialog = false">取消</el-button>
          <el-button type="primary" @click="startPaperExamFromDialog">
            开始练习
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 考试结果对话框 -->
    <el-dialog
      v-model="showResultDialog"
      title="考试结果"
      width="600px"
    >
      <div v-if="currentResult" class="result-content">
        <div class="result-summary">
          <div class="score-display">
            <div class="main-score">{{ currentResult.score || 0 }}</div>
            <div class="score-label">/ {{ currentResult.total_score || 100 }}分</div>
          </div>
          <div class="result-stats">
            <div class="stat-item">
              <span class="label">正确率</span>
              <span class="value">{{ Math.round((currentResult.score || 0) / (currentResult.total_score || 100) * 100) }}%</span>
            </div>
            <div class="stat-item">
              <span class="label">用时</span>
              <span class="value">{{ formatDuration(currentResult.duration) }}</span>
            </div>
            <div class="stat-item">
              <span class="label">完成时间</span>
              <span class="value">{{ formatDateTime(currentResult.submitted_at) }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showResultDialog = false">关闭</el-button>
          <el-button type="primary" @click="reviewExam(currentResult)">
            查看答案解析
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, Refresh, Document, Clock, Calendar, Timer, VideoPlay, 
  View, Lock, CircleClose, EditPen, Star 
} from '@element-plus/icons-vue'
import { examScheduleAPI, paperAPI, examAPI } from '@/api/exam'
import { startPractice } from '@/api/exam'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const activeTab = ref('scheduled')
const searchKeyword = ref('')
const startingExam = ref(null)
const startingPaper = ref(null)

// 考试和试卷数据
const scheduledExams = ref([])
const availablePapers = ref([])
const completedExams = ref([])

// 统计数据
const pendingExamsCount = ref(0)
const completedExamsCount = ref(0)
const monthlyExamsCount = ref(0)

// 对话框状态
const showPaperDialog = ref(false)
const showResultDialog = ref(false)
const currentPaper = ref(null)
const currentResult = ref(null)

// 分页
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 定时器
let countdownTimer = null

// 计算属性
const filteredScheduledExams = computed(() => {
  if (!searchKeyword.value) return scheduledExams.value
  return scheduledExams.value.filter(exam => 
    exam.title.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
    exam.paper_title.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
})

const filteredAvailablePapers = computed(() => {
  if (!searchKeyword.value) return availablePapers.value
  return availablePapers.value.filter(paper => 
    paper.title.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
})

const filteredCompletedExams = computed(() => {
  if (!searchKeyword.value) return completedExams.value
  return completedExams.value.filter(exam => 
    exam.paper_title.toLowerCase().includes(searchKeyword.value.toLowerCase())
  )
})

// 方法
const loadScheduledExams = async () => {
  try {
    loading.value = true
    const response = await examScheduleAPI.getStudentSchedules({
      page: 1,
      limit: 100
    })
    
    if (response.success) {
      scheduledExams.value = response.data || []
      updateStatistics()
    } else {
      ElMessage.error(response.message || '获取安排考试失败')
    }
  } catch (error) {
    console.error('加载安排考试失败:', error)
    ElMessage.error('加载安排考试失败')
  } finally {
    loading.value = false
  }
}

const loadAvailablePapers = async () => {
  try {
    loading.value = true
    const response = await examAPI.getAvailablePapers({
      page: 1,
      limit: 100
    })
    
    if (response.success) {
      availablePapers.value = response.data?.papers || response.data?.records || response.data || []
    } else {
      ElMessage.error(response.message || '获取可用试卷失败')
    }
  } catch (error) {
    console.error('加载可用试卷失败:', error)
    ElMessage.error('加载可用试卷失败')
  } finally {
    loading.value = false
  }
}

const loadCompletedExams = async () => {
  try {
    loading.value = true
    const response = await examAPI.getUserExamHistory({
      page: pagination.page,
      limit: pagination.limit
    })
    
    if (response.success) {
      // 映射后端字段到前端期望的字段
      const records = response.data?.records || response.data || []
      
      completedExams.value = records.map(exam => {
        const mappedExam = {
          ...exam,
          score: exam.obtained_score || 0,
          total_score: exam.paper_total_score || 100,
          submitted_at: exam.end_time,
          exam_title: exam.type === 'practice' ? '练习模式' : '正式考试',
          subject: exam.paper_subject || '综合',
          accuracy: Math.round((exam.obtained_score || 0) / (exam.paper_total_score || 100) * 100),
          duration: exam.duration || 0, // 确保用时字段存在
          paper_title: exam.paper_title || `试卷${exam.paper_id}`, // 试卷名称
          paper_name: exam.paper_title || `试卷${exam.paper_id}`, // 确保试卷名称不为空
          type: exam.type // 确保类型字段存在
        }
        return mappedExam
      })
      
      pagination.total = response.data?.total || 0
    } else {
      ElMessage.error(response.message || '获取考试历史失败')
    }
  } catch (error) {
    console.error('加载考试历史失败:', error)
    ElMessage.error('加载考试历史失败')
  } finally {
    loading.value = false
  }
}

const updateStatistics = () => {
  // 计算待考试数
  pendingExamsCount.value = scheduledExams.value.filter(exam => 
    exam.exam_status === 'not_started' || exam.exam_status === 'available'
  ).length
  
  // 计算已完成数
  completedExamsCount.value = scheduledExams.value.filter(exam => 
    exam.exam_status === 'completed'
  ).length + completedExams.value.length
  
  // 计算本月考试数
  const currentMonth = new Date().getMonth()
  const currentYear = new Date().getFullYear()
  monthlyExamsCount.value = scheduledExams.value.filter(exam => {
    const examDate = new Date(exam.start_time)
    return examDate.getMonth() === currentMonth && examDate.getFullYear() === currentYear
  }).length
}

const startScheduledExam = async (exam) => {
  try {
    startingExam.value = exam.id
    
    // 确认开始考试
    await ElMessageBox.confirm(
      `确定开始考试"${exam.title}"吗？考试开始后不能暂停。`,
      '开始考试',
      {
        type: 'warning',
        confirmButtonText: '开始考试',
        cancelButtonText: '取消'
      }
    )
    
    const response = await examScheduleAPI.startScheduledExam(exam.id)
    
    if (response.success) {
      ElMessage.success('考试开始成功')
      // 跳转到考试页面
      router.push({
        name: 'Exam',
        params: { 
          id: response.data.exam_record_id
        }
      })
    } else {
      ElMessage.error(response.message || '开始考试失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('开始考试失败:', error)
      ElMessage.error('开始考试失败')
    }
  } finally {
    startingExam.value = null
  }
}

const startPaperExam = async (paper) => {
  try {
    startingPaper.value = paper.id
    
    // 确认开始练习
    await ElMessageBox.confirm(
      `确定开始练习"${paper.title}"吗？`,
      '开始练习',
      {
        type: 'info',
        confirmButtonText: '开始练习',
        cancelButtonText: '取消'
      }
    )
    
    const response = await startPractice(paper.id)
    
    if (response.success) {
      ElMessage.success('练习开始成功')
      // 跳转到考试页面
      router.push({
        name: 'Exam',
        params: { 
          id: response.data.exam_record_id || response.data.examRecordId
        }
      })
    } else {
      // 如果有正在进行的考试，提供选项
      if (response.data && response.data.examRecordId) {
        const result = await ElMessageBox.confirm(
          '您有正在进行的练习，是否继续该练习？',
          '提示',
          {
            type: 'warning',
            confirmButtonText: '继续练习',
            cancelButtonText: '取消',
            distinguishCancelAndClose: true
          }
        )
        
        if (result === 'confirm') {
          router.push({
            name: 'Exam',
            params: { 
              id: response.data.examRecordId
            }
          })
        }
      } else {
        console.error('开始练习失败 - 响应:', response)
        ElMessage.error(response.message || '开始练习失败')
      }
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('开始练习失败:', error)
      
      // 显示更详细的错误信息
      let errorMessage = '开始练习失败'
      if (error.response && error.response.data) {
        errorMessage = error.response.data.message || errorMessage
        console.error('后端错误详情:', error.response.data)
      }
      
      ElMessage.error(errorMessage)
    }
  } finally {
    startingPaper.value = null
  }
}

const continueExam = async (exam) => {
  try {
    // 检查考试是否真的还在进行中
    if (exam.exam_record_id) {
      // 先获取考试详情确认状态
      const response = await examAPI.getExamDetail(exam.exam_record_id)
      
      if (response.success && response.data) {
        const examData = response.data
        
        // 检查考试状态
        if (examData.status === 'completed' || examData.status === 'timeout') {
          ElMessage.warning('考试已结束')
          // 直接跳转到结果页面
          router.push({
            name: 'ExamResult',
            params: { 
              id: exam.exam_record_id
            }
          })
          return
        }
        
        // 检查是否超时
        if (examData.start_time && examData.paper && examData.paper.duration) {
          const startTime = new Date(examData.start_time)
          const duration = examData.paper.duration * 60 * 1000 // 转换为毫秒
          const elapsed = Date.now() - startTime.getTime()
          
          if (elapsed >= duration) {
            ElMessage.warning('考试时间已到，无法继续答题')
            // 跳转到结果页面
            router.push({
              name: 'ExamResult',
              params: { 
                id: exam.exam_record_id
              }
            })
            return
          }
        }
        
        // 考试仍在进行，可以继续
        router.push({
          name: 'Exam',
          params: { 
            id: exam.exam_record_id
          }
        })
      }
    } else {
      // 如果没有exam_record_id，说明还没开始，需要先开始考试
      await startScheduledExam(exam)
    }
  } catch (error) {
    console.error('继续考试失败:', error)
    ElMessage.error('继续考试失败')
  }
}

const viewResult = async (exam) => {
  try {
    // 根据考试类型确定使用哪个ID
    let examRecordId
    if (exam.exam_record_id) {
      // 安排考试：使用exam_record_id
      examRecordId = exam.exam_record_id
    } else {
      // 已完成考试：直接使用id
      examRecordId = exam.id
    }
    
    const response = await examAPI.getExamResult(examRecordId)
    
    if (response.success) {
      const data = response.data
      // 转换数据格式以适配前端显示
      currentResult.value = {
        id: examRecordId, // 使用正确的考试记录ID
        score: data.examRecord.obtained_score || 0,
        total_score: data.paper.total_score || 100,
        duration: data.examRecord.duration || 0,
        submitted_at: data.examRecord.end_time,
        exam_record_id: examRecordId, // 使用正确的考试记录ID
        paper_title: data.paper.title,
        type: data.examRecord.type,
        statistics: data.statistics
      }
      showResultDialog.value = true
    } else {
      ElMessage.error(response.message || '获取考试结果失败')
    }
  } catch (error) {
    console.error('查看考试结果失败:', error)
    ElMessage.error('查看考试结果失败: ' + (error.message || '未知错误'))
  }
}

const reviewExam = (exam) => {
  // 根据考试类型确定使用哪个ID
  let examRecordId
  if (exam.exam_record_id) {
    // 安排考试：使用exam_record_id
    examRecordId = exam.exam_record_id
  } else {
    // 已完成考试：直接使用id
    examRecordId = exam.id
  }
  
  // 跳转到答题回顾页面
  router.push({
    name: 'ExamReview',
    params: { 
      examRecordId: examRecordId
    }
  })
}

const viewPaperDetail = async (paper) => {
  try {
    const response = await paperAPI.getPaperDetail(paper.id)
    
    if (response.success) {
      currentPaper.value = response.data
      showPaperDialog.value = true
    } else {
      ElMessage.error(response.message || '获取试卷详情失败')
    }
  } catch (error) {
    console.error('获取试卷详情失败:', error)
    ElMessage.error('获取试卷详情失败')
  }
}

const startPaperExamFromDialog = () => {
  showPaperDialog.value = false
  startPaperExam(currentPaper.value)
}

const handlePaperDialogClose = () => {
  showPaperDialog.value = false
  currentPaper.value = null
}

const handleTabChange = (tab) => {
  activeTab.value = tab
  searchKeyword.value = ''
  
  switch (tab) {
    case 'scheduled':
      loadScheduledExams()
      break
    case 'available':
      loadAvailablePapers()
      break
    case 'completed':
      loadCompletedExams()
      break
  }
}

const handleSearch = () => {
  // 搜索功能通过计算属性自动处理
}

const refreshList = () => {
  handleTabChange(activeTab.value)
}

// 辅助函数
const getExamStatusType = (status) => {
  const typeMap = {
    'not_started': 'info',
    'available': 'success',
    'in_progress': 'warning',
    'completed': 'success',
    'expired': 'danger'
  }
  return typeMap[status] || 'info'
}

const getExamStatusText = (status) => {
  const textMap = {
    'not_started': '未开始',
    'available': '可参加',
    'in_progress': '进行中',
    'completed': '已完成',
    'expired': '已过期'
  }
  return textMap[status] || status
}

const formatDateTime = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleString('zh-CN')
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('zh-CN')
}

const formatDateRange = (startTime, endTime) => {
  const start = new Date(startTime)
  const end = new Date(endTime)
  const startStr = start.toLocaleDateString('zh-CN')
  const endStr = end.toLocaleDateString('zh-CN')
  
  if (startStr === endStr) {
    return `${startStr} ${start.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  } else {
    return `${start.toLocaleString('zh-CN')} - ${end.toLocaleString('zh-CN')}`
  }
}

const formatDuration = (seconds) => {
  if (!seconds) return '0分钟'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  
  if (minutes === 0) {
    return `${remainingSeconds}秒`
  } else if (remainingSeconds === 0) {
    return `${minutes}分钟`
  } else {
    return `${minutes}分${remainingSeconds}秒`
  }
}

const getCountdown = (targetTime) => {
  const now = new Date()
  const target = new Date(targetTime)
  const diff = Math.max(0, target - now)
  
  if (diff === 0) return '已结束'
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)
  
  if (days > 0) {
    return `${days}天${hours}小时${minutes}分钟`
  } else if (hours > 0) {
    return `${hours}小时${minutes}分钟${seconds}秒`
  } else if (minutes > 0) {
    return `${minutes}分钟${seconds}秒`
  } else {
    return `${seconds}秒`
  }
}

const getPaperExamCount = (paperId) => {
  return completedExams.value.filter(exam => exam.paper_id === paperId).length
}

const getQuestionTypesCount = (questions) => {
  const counts = {}
  questions.forEach(q => {
    counts[q.type] = (counts[q.type] || 0) + 1
  })
  return counts
}

const getQuestionTypeName = (type) => {
  const typeMap = {
    'single': '单选题',
    'multiple': '多选题',
    'judge': '判断题',
    'fill': '填空题',
    'essay': '简答题'
  }
  return typeMap[type] || type
}

// 启动倒计时定时器
const startCountdownTimer = () => {
  countdownTimer = setInterval(() => {
    // 强制刷新倒计时显示
    scheduledExams.value = [...scheduledExams.value]
    
    // 检查是否有考试时间到了，需要重新加载状态
    const now = new Date()
    let needReload = false
    
    scheduledExams.value.forEach(exam => {
      const startTime = new Date(exam.start_time)
      const endTime = new Date(exam.end_time)
      
      // 如果考试刚好开始或结束，需要重新加载
      if (exam.exam_status === 'not_started' && now >= startTime) {
        needReload = true
      } else if (exam.exam_status === 'available' && now >= endTime) {
        needReload = true
      }
    })
    
    if (needReload) {
      loadScheduledExams()
    }
  }, 1000) // 每秒更新一次
}

const stopCountdownTimer = () => {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
}

// 生命周期
onMounted(() => {
  loadScheduledExams()
  startCountdownTimer()
})

onUnmounted(() => {
  stopCountdownTimer()
})
</script>

<style scoped>
.exam-list {
  padding: 20px;
}

.page-header .header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-stats {
  display: flex;
  gap: 40px;
}

.filter-section {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.exam-content {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exam-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.exam-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 20px;
  background: #fff;
  transition: all 0.3s;
  position: relative;
}

.exam-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.exam-card.exam-available {
  border-color: #67c23a;
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.2);
}

.exam-card.exam-pending {
  border-color: #909399;
}

.exam-card.exam-expired {
  border-color: #f56c6c;
  background: #fef0f0;
}

.exam-card.exam-completed {
  border-color: #409eff;
  background: #ecf5ff;
}

.exam-card.exam-in-progress {
  border-color: #e6a23c;
  background: #fdf6ec;
}

.exam-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.exam-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  line-height: 1.4;
  flex: 1;
  margin-right: 10px;
}

.exam-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #666;
}

.exam-description {
  margin-bottom: 15px;
  font-size: 14px;
  color: #666;
  line-height: 1.5;
}

.exam-description p {
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-clamp: 2;
  overflow: hidden;
}

.exam-timing {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-bottom: 15px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.timing-info {
  text-align: center;
}

.time-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.time-value {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.countdown {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 15px;
  padding: 8px 12px;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  font-size: 14px;
  color: #856404;
}

.exam-actions {
  display: flex;
  gap: 10px;
}

.exam-actions .el-button {
  flex: 1;
}

.paper-card {
  background: linear-gradient(135deg, #f8fffe 0%, #f0fff4 100%);
}

.paper-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 4px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 12px;
  color: #999;
}

.stat-value {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px;
}

.paper-info {
  margin-bottom: 20px;
}

.paper-info h3 {
  margin: 0 0 10px 0;
  font-size: 20px;
}

.paper-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
  font-size: 14px;
  color: #666;
}

.question-summary {
  border-top: 1px solid #eee;
  padding-top: 20px;
}

.question-summary h4 {
  margin: 0 0 10px 0;
  font-size: 16px;
}

.question-types {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.type-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 6px;
  min-width: 80px;
}

.type-name {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
}

.type-count {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.result-content {
  text-align: center;
}

.result-summary {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}

.score-display {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.main-score {
  font-size: 48px;
  font-weight: bold;
  color: #409eff;
}

.score-label {
  font-size: 20px;
  color: #666;
}

.result-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
}

.result-stats .stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.result-stats .label {
  font-size: 14px;
  color: #999;
}

.result-stats .value {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.pagination {
  margin-top: 20px;
  text-align: center;
}

.paper-info .paper-name {
  font-weight: 500;
  margin-bottom: 4px;
}

.score-info {
  display: flex;
  align-items: baseline;
  gap: 2px;
}

.score {
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
}

.total-score {
  font-size: 14px;
  color: #999;
}

.accuracy-text {
  text-align: center;
  font-size: 12px;
  color: #666;
  margin-top: 4px;
}

@media (max-width: 768px) {
  .exam-grid {
    grid-template-columns: 1fr;
  }
  
  .header-stats {
    gap: 20px;
  }
  
  .filter-section {
    flex-direction: column;
    gap: 15px;
    align-items: stretch;
  }
  
  .filter-controls {
    justify-content: center;
  }
  
  .exam-timing {
    grid-template-columns: 1fr;
  }
  
  .result-stats {
    gap: 20px;
  }
}
</style>
