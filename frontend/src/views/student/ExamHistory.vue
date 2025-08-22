<template>
  <div class="exam-history">
    <el-card class="page-header">
      <template #header>
        <div class="header-content">
          <h2>考试历史</h2>
          <div class="header-actions">
            <el-button @click="exportHistory">
              <el-icon><Download /></el-icon>
              导出记录
            </el-button>
          </div>
        </div>
      </template>

      <!-- 统计概览 -->
      <el-row :gutter="20" style="margin-bottom: 20px">
        <el-col :span="6">
          <el-statistic title="总考试次数" :value="statistics.total_exams" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="平均分" :value="statistics.avg_score" :precision="1" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="最高分" :value="statistics.max_score" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="及格率" :value="statistics.pass_rate" suffix="%" />
        </el-col>
      </el-row>

      <!-- 搜索筛选 -->
      <div class="filter-section">
        <el-form :model="filterForm" inline>
          <el-form-item label="考试名称">
            <el-input v-model="filterForm.exam_title" placeholder="输入考试名称" clearable />
          </el-form-item>
          <el-form-item label="科目">
            <el-input v-model="filterForm.subject" placeholder="输入科目" clearable />
          </el-form-item>
          <el-form-item label="成绩范围">
            <el-slider
              v-model="filterForm.scoreRange"
              range
              :max="100"
              :min="0"
              style="width: 200px"
            />
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="filterForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadExamHistory">搜索</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 成绩趋势图 -->
    <el-card style="margin-bottom: 20px">
      <template #header>
        <span>成绩趋势</span>
      </template>
      <div ref="trendChart" style="height: 300px"></div>
    </el-card>

    <!-- 考试历史列表 -->
    <el-card>
      <el-table :data="examHistory" v-loading="loading" style="width: 100%">
        <el-table-column prop="exam_title" label="考试名称" min-width="200" />
        <el-table-column prop="paper_title" label="试卷名称" min-width="150" />
        <el-table-column prop="subject" label="科目" width="120" />
        <el-table-column prop="score" label="成绩" width="100">
          <template #default="scope">
            <span :class="getScoreClass(scope.row.score, scope.row.pass_score)">
              {{ scope.row.score }}
            </span>
            <span class="score-total">/ {{ scope.row.total_score }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="accuracy_rate" label="正确率" width="100">
          <template #default="scope">
            <el-progress 
              :percentage="scope.row.accuracy_rate" 
              :color="getAccuracyColor(scope.row.accuracy_rate)"
              :show-text="false"
              style="width: 60px"
            />
            <span style="margin-left: 10px">{{ scope.row.accuracy_rate }}%</span>
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="用时" width="120">
          <template #default="scope">
            {{ formatDuration(scope.row.duration) }}
          </template>
        </el-table-column>
        <el-table-column prop="rank" label="排名" width="100">
          <template #default="scope">
            <el-tag v-if="scope.row.rank <= 3" type="warning">
              第 {{ scope.row.rank }} 名
            </el-tag>
            <span v-else>第 {{ scope.row.rank }} 名</span>
          </template>
        </el-table-column>
        <el-table-column prop="exam_date" label="考试时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.exam_date) }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusColor(scope.row.status)">
              {{ getStatusName(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="viewResult(scope.row)">查看详情</el-button>
            <el-button 
              size="small" 
              type="primary" 
              @click="reviewAnswers(scope.row)"
              v-if="scope.row.status === 'completed'"
            >
              查看解析
            </el-button>
            <el-dropdown @command="handleCommand($event, scope.row)">
              <el-button size="small">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="addWrong" v-if="scope.row.wrong_count > 0">
                    加入错题本
                  </el-dropdown-item>
                  <el-dropdown-item command="retake" v-if="scope.row.can_retake">
                    重新考试
                  </el-dropdown-item>
                  <el-dropdown-item command="compare">
                    成绩对比
                  </el-dropdown-item>
                  <el-dropdown-item command="share">
                    分享成绩
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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
          @size-change="loadExamHistory"
          @current-change="loadExamHistory"
        />
      </div>
    </el-card>

    <!-- 成绩对比对话框 -->
    <el-dialog v-model="showCompareDialog" title="成绩对比" width="800px">
      <div class="compare-content">
        <div class="compare-selection">
          <el-form inline>
            <el-form-item label="选择对比考试">
              <el-select v-model="compareExamId" placeholder="请选择考试">
                <el-option 
                  v-for="exam in examHistory" 
                  :key="exam.id" 
                  :label="exam.exam_title"
                  :value="exam.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="generateComparison">对比</el-button>
            </el-form-item>
          </el-form>
        </div>

        <div v-if="comparisonData" class="comparison-result">
          <el-table :data="comparisonData" border>
            <el-table-column prop="metric" label="对比项" width="150" />
            <el-table-column prop="current" label="当前考试" align="center" />
            <el-table-column prop="compare" label="对比考试" align="center" />
            <el-table-column prop="difference" label="差异" align="center">
              <template #default="scope">
                <span :class="getDifferenceClass(scope.row.difference)">
                  {{ scope.row.difference }}
                </span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>

    <!-- 分享成绩对话框 -->
    <el-dialog v-model="showShareDialog" title="分享成绩" width="500px">
      <div class="share-content">
        <div class="share-preview">
          <div class="share-card">
            <h3>{{ currentExam?.exam_title }}</h3>
            <div class="share-score">
              <span class="score">{{ currentExam?.score }}</span>
              <span class="total">/ {{ currentExam?.total_score }}</span>
            </div>
            <div class="share-details">
              <p>正确率：{{ currentExam?.accuracy_rate }}%</p>
              <p>排名：第 {{ currentExam?.rank }} 名</p>
              <p>考试时间：{{ formatDate(currentExam?.exam_date) }}</p>
            </div>
          </div>
        </div>
        
        <div class="share-actions">
          <el-button @click="copyShareText">复制文本</el-button>
          <el-button type="primary" @click="generateShareImage">生成图片</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Download, ArrowDown } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import request from '@/utils/request'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const showCompareDialog = ref(false)
const showShareDialog = ref(false)
const compareExamId = ref('')
const currentExam = ref(null)

const examHistory = ref([])
const comparisonData = ref(null)

const statistics = reactive({
  total_exams: 0,
  avg_score: 0,
  max_score: 0,
  pass_rate: 0
})

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const filterForm = reactive({
  exam_title: '',
  subject: '',
  scoreRange: [0, 100],
  dateRange: null
})

// 图表引用
const trendChart = ref()
let trendChartInstance = null

// 方法
const loadExamHistory = async () => {
  loading.value = true
  try {
    // 获取考试历史记录 - 使用正确的API
    const response = await request.get('/exam/history/user', {
      params: {
        page: pagination.page,
        limit: pagination.limit
      }
    })
    
    if (response.success) {
      const data = response.data
      // 正确映射后端返回的数据结构
      examHistory.value = (data.records || []).map(exam => ({
        id: exam.id,
        exam_title: exam.type === 'practice' ? '练习模式' : '正式考试',
        paper_title: exam.paper_title || `试卷${exam.paper_id}`,
        subject: exam.paper_subject || '综合',
        score: exam.obtained_score || 0,
        total_score: exam.paper_total_score || 100,
        pass_score: 60, // 默认及格分数
        accuracy_rate: Math.round((exam.obtained_score || 0) / (exam.paper_total_score || 100) * 100),
        duration: exam.duration || 0,
        rank: '-', // 排名字段暂时不显示
        exam_date: exam.start_time,
        status: exam.status || 'completed',
        can_retake: exam.type === 'practice', // 练习模式可以重考
        wrong_count: 0, // 错题数量暂时设为0
        start_time: exam.start_time,
        end_time: exam.end_time
      }))
      
      pagination.total = data.total || 0
      
      // 计算统计信息
      const stats = await calculateStats()
      Object.assign(statistics, stats)
      
      // 更新图表
      updateTrendChart()
      
      console.log('考试历史加载成功，数据条数:', examHistory.value.length)
    } else {
      throw new Error(response.message || '获取数据失败')
    }
  } catch (error) {
    console.error('加载考试历史失败:', error)
    ElMessage.error('加载考试历史失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

// 计算统计信息
const calculateStats = async () => {
  // 直接基于已加载的考试历史数据计算统计信息
  if (examHistory.value.length === 0) {
    return {
      total_exams: 0,
      avg_score: 0,
      max_score: 0,
      pass_rate: 0
    }
  }
  
  const totalExams = examHistory.value.length
  const scores = examHistory.value.map(e => e.score || 0)
  const passCount = examHistory.value.filter(e => e.score >= 60).length
  
  return {
    total_exams: totalExams,
    avg_score: Math.round(scores.reduce((sum, score) => sum + score, 0) / totalExams),
    max_score: Math.max(...scores),
    pass_rate: Math.round((passCount / totalExams) * 100)
  }
}

const resetFilter = () => {
  Object.assign(filterForm, {
    exam_title: '',
    subject: '',
    scoreRange: [0, 100],
    dateRange: null
  })
  loadExamHistory()
}

const initTrendChart = async () => {
  await nextTick()
  
  if (trendChart.value) {
    trendChartInstance = echarts.init(trendChart.value)
    const option = {
      title: { text: '成绩趋势', left: 'center' },
      tooltip: { 
        trigger: 'axis',
        formatter: function(params) {
          const data = params[0]
          return `${data.name}<br/>成绩：${data.value} 分`
        }
      },
      xAxis: {
        type: 'category',
        data: []
      },
      yAxis: { 
        type: 'value',
        max: 100,
        min: 0
      },
      series: [{
        data: [],
        type: 'line',
        smooth: true,
        itemStyle: { color: '#409EFF' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0, color: 'rgba(64, 158, 255, 0.3)'
            }, {
              offset: 1, color: 'rgba(64, 158, 255, 0.1)'
            }]
          }
        }
      }]
    }
    trendChartInstance.setOption(option)
  }
}

// 更新趋势图表
const updateTrendChart = () => {
  if (trendChartInstance && examHistory.value.length > 0) {
    const sortedHistory = [...examHistory.value].sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    const dates = sortedHistory.map(exam => 
      new Date(exam.start_time).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
    )
    const scores = sortedHistory.map(exam => exam.obtained_score || 0)
    
    trendChartInstance.setOption({
      xAxis: { data: dates },
      series: [{ data: scores }]
    })
  }
}
/*  if (trendChartInstance && examHistory.value.length > 0) {
    const dates = examHistory.value.map(exam => 
      new Date(exam.exam_date).toLocaleDateString('zh-CN')
    ).reverse()
    const scores = examHistory.value.map(exam => exam.score).reverse()
    
    trendChartInstance.setOption({
      xAxis: { data: dates },
      series: [{ data: scores }]
    })
  }
}
*/
const getScoreClass = (score, passScore) => {
  if (score >= 90) return 'score-excellent'
  if (score >= passScore) return 'score-pass'
  return 'score-fail'
}

const getAccuracyColor = (rate) => {
  if (rate >= 80) return '#67C23A'
  if (rate >= 60) return '#E6A23C'
  return '#F56C6C'
}

const getStatusColor = (status) => {
  const colorMap = {
    completed: 'success',
    in_progress: 'warning',
    not_started: 'info'
  }
  return colorMap[status] || ''
}

const getStatusName = (status) => {
  const nameMap = {
    completed: '已完成',
    in_progress: '进行中',
    not_started: '未开始'
  }
  return nameMap[status] || status
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}

const viewResult = (exam) => {
  router.push(`/student/result/${exam.id}`)
}

const reviewAnswers = (exam) => {
  router.push({
    name: 'ExamReview',
    params: { 
      examRecordId: exam.id
    }
  })
}

const handleCommand = (command, exam) => {
  switch (command) {
    case 'addWrong':
      addToWrongQuestions(exam)
      break
    case 'retake':
      retakeExam(exam)
      break
    case 'compare':
      openCompareDialog(exam)
      break
    case 'share':
      openShareDialog(exam)
      break
  }
}

const addToWrongQuestions = async (exam) => {
  try {
    // TODO: 调用API将错题加入错题本
    ElMessage.success('错题已加入错题本')
  } catch (error) {
    ElMessage.error('加入错题本失败')
  }
}

const retakeExam = (exam) => {
  router.push(`/student/exam/${exam.exam_id}`)
}

const openCompareDialog = (exam) => {
  currentExam.value = exam
  showCompareDialog.value = true
}

const openShareDialog = (exam) => {
  currentExam.value = exam
  showShareDialog.value = true
}

const generateComparison = () => {
  if (!compareExamId.value) {
    ElMessage.warning('请选择要对比的考试')
    return
  }
  
  const compareExam = examHistory.value.find(exam => exam.id === compareExamId.value)
  if (!compareExam) return
  
  comparisonData.value = [
    {
      metric: '总分',
      current: currentExam.value.score,
      compare: compareExam.score,
      difference: currentExam.value.score - compareExam.score
    },
    {
      metric: '正确率',
      current: `${currentExam.value.accuracy_rate}%`,
      compare: `${compareExam.accuracy_rate}%`,
      difference: currentExam.value.accuracy_rate - compareExam.accuracy_rate
    },
    {
      metric: '排名',
      current: `第${currentExam.value.rank}名`,
      compare: `第${compareExam.rank}名`,
      difference: compareExam.rank - currentExam.value.rank
    },
    {
      metric: '用时',
      current: formatDuration(currentExam.value.duration),
      compare: formatDuration(compareExam.duration),
      difference: currentExam.value.duration - compareExam.duration
    }
  ]
}

const getDifferenceClass = (difference) => {
  if (difference > 0) return 'difference-positive'
  if (difference < 0) return 'difference-negative'
  return 'difference-neutral'
}

const copyShareText = () => {
  const text = `我在《${currentExam.value.exam_title}》中获得了 ${currentExam.value.score}/${currentExam.value.total_score} 分，正确率 ${currentExam.value.accuracy_rate}%，排名第 ${currentExam.value.rank} 名！`
  navigator.clipboard.writeText(text).then(() => {
    ElMessage.success('分享文本已复制到剪贴板')
  })
}

const generateShareImage = () => {
  // TODO: 实现生成分享图片功能
  ElMessage.info('生成分享图片功能待实现')
}

const exportHistory = () => {
  // TODO: 实现导出考试历史功能
  ElMessage.info('导出功能待实现')
}

onMounted(() => {
  loadExamHistory()
  initTrendChart()
})
</script>

<style scoped>
.exam-history {
  padding: 20px;
}

.page-header .header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.filter-section {
  margin-top: 20px;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.score-excellent {
  color: #67C23A;
  font-weight: bold;
}

.score-pass {
  color: #409EFF;
  font-weight: bold;
}

.score-fail {
  color: #F56C6C;
  font-weight: bold;
}

.score-total {
  color: #999;
  font-size: 12px;
  margin-left: 5px;
}

.compare-content {
  margin-top: 20px;
}

.compare-selection {
  margin-bottom: 20px;
}

.difference-positive {
  color: #67C23A;
}

.difference-negative {
  color: #F56C6C;
}

.difference-neutral {
  color: #909399;
}

.share-content {
  text-align: center;
}

.share-preview {
  margin-bottom: 20px;
}

.share-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 30px;
  border-radius: 10px;
  display: inline-block;
  min-width: 300px;
}

.share-card h3 {
  margin: 0 0 20px 0;
  font-size: 18px;
}

.share-score {
  font-size: 36px;
  font-weight: bold;
  margin-bottom: 15px;
}

.share-score .score {
  color: #FFD700;
}

.share-score .total {
  font-size: 24px;
  opacity: 0.8;
}

.share-details {
  font-size: 14px;
  opacity: 0.9;
}

.share-details p {
  margin: 5px 0;
}

.share-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
}
</style>
