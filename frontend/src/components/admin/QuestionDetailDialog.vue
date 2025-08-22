<template>
  <el-dialog 
    v-model="visible" 
    :title="`题目详情 - ${questionInfo.title}`"
    width="800px"
    destroy-on-close
    @closed="handleClose"
  >
    <div v-loading="loading">
      <!-- 题目基本信息 -->
      <el-card class="question-info" shadow="never">
        <template #header>
          <span>题目信息</span>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="题目标题" :span="2">
            {{ questionInfo.title }}
          </el-descriptions-item>
          <el-descriptions-item label="题型">
            <el-tag>{{ getTypeName(questionInfo.type) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="难度">
            <el-rate v-model="questionInfo.difficulty" disabled size="small" />
          </el-descriptions-item>
          <el-descriptions-item label="科目">
            {{ questionInfo.subject || '未分类' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(questionInfo.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="题目内容" :span="2">
            <div class="question-content">
              {{ questionInfo.content }}
            </div>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 选项 -->
        <div v-if="questionInfo.options && questionInfo.options.length > 0" class="question-options">
          <h4>选项：</h4>
          <div v-for="option in questionInfo.options" :key="option.key" class="option-item">
            <el-tag 
              :type="option.key === questionInfo.correct_answer ? 'success' : 'info'"
              size="small"
            >
              {{ option.key }}
            </el-tag>
            {{ option.value }}
          </div>
        </div>

        <!-- 正确答案 -->
        <div class="correct-answer">
          <h4>正确答案：</h4>
          <el-tag type="success">{{ questionInfo.correct_answer }}</el-tag>
        </div>
      </el-card>

      <!-- 答题统计 -->
      <el-card class="answer-stats" style="margin-top: 16px" shadow="never">
        <template #header>
          <span>答题统计</span>
        </template>
        <el-row :gutter="16">
          <el-col :span="6">
            <el-statistic title="总答题次数" :value="Number(getTotalAnswers())" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="正确次数" :value="Number(getCorrectAnswers())" />
          </el-col>
          <el-col :span="6">
            <el-statistic 
              title="正确率" 
              :value="Number(getAccuracyRate())" 
              suffix="%" 
              :precision="1"
            />
          </el-col>
          <el-col :span="6">
            <el-statistic title="平均用时" :value="Number(getAverageTime())" suffix="秒" />
          </el-col>
        </el-row>
      </el-card>

      <!-- 答案分布图 -->
      <el-card style="margin-top: 16px" shadow="never">
        <template #header>
          <span>答案选择分布</span>
        </template>
        <div ref="answerDistributionChart" style="height: 300px"></div>
      </el-card>

      <!-- 错误答案分析 -->
      <el-card style="margin-top: 16px" shadow="never">
        <template #header>
          <div class="table-header">
            <span>错误答案分析</span>
            <el-tag type="info" size="small">最近50条错误记录</el-tag>
          </div>
        </template>
        <el-table :data="wrongAnswers" max-height="300">
          <el-table-column prop="selected_answer" label="选择答案" width="100">
            <template #default="scope">
              <el-tag type="danger" size="small">{{ scope.row.selected_answer }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="count" label="错误次数" width="100" />
          <el-table-column prop="real_name" label="学生姓名" width="120">
            <template #default="scope">
              {{ scope.row.real_name || scope.row.username }}
            </template>
          </el-table-column>
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column prop="start_time" label="答题时间" min-width="160">
            <template #default="scope">
              {{ formatDate(scope.row.start_time) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" @click="exportQuestionReport">导出报告</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { adminAPI } from '@/api/admin'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  questionId: {
    type: [String, Number],
    default: null
  },
  dateRange: {
    type: Array,
    default: null
  }
})

const emit = defineEmits(['update:modelValue'])

const visible = ref(false)
const loading = ref(false)

const questionInfo = reactive({
  id: null,
  title: '',
  content: '',
  type: '',
  options: [],
  correct_answer: '',
  difficulty: 1,
  subject: '',
  created_at: ''
})

const answerStats = ref([])
const wrongAnswers = ref([])
const answerDistributionChart = ref()
let chartInstance = null

// 监听props变化
watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.questionId) {
    loadQuestionDetail()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (val) {
    nextTick(() => {
      initChart()
    })
  }
})

// 加载题目详情
const loadQuestionDetail = async () => {
  if (!props.questionId) return
  
  loading.value = true
  try {
    const params = {}
    if (props.dateRange && props.dateRange.length === 2) {
      params.startDate = props.dateRange[0]
      params.endDate = props.dateRange[1]
    }
    
    const response = await adminAPI.getQuestionDetail(props.questionId, params)
    if (response.success) {
      const data = response.data
      
      // 更新题目信息
      Object.assign(questionInfo, data.question)
      
      // 更新答题统计
      answerStats.value = data.answerStats || []
      
      // 更新错误答案
      wrongAnswers.value = data.wrongAnswers || []
      
      // 刷新图表
      nextTick(() => {
        initChart()
      })
    }
  } catch (error) {
    console.error('获取题目详情失败:', error)
    ElMessage.error('获取题目详情失败')
  } finally {
    loading.value = false
  }
}

// 初始化图表
const initChart = () => {
  if (!answerDistributionChart.value) return
  
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  chartInstance = echarts.init(answerDistributionChart.value)
  
  // 处理答案分布数据
  const data = answerStats.value.map(item => ({
    name: `选项${item.selected_answer}`,
    value: item.answer_count
  }))
  
  const option = {
    title: {
      text: '答案选择分布',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      bottom: 'bottom'
    },
    series: [
      {
        name: '选择次数',
        type: 'pie',
        radius: '50%',
        data: data,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }
  
  chartInstance.setOption(option)
}

// 获取总答题次数
const getTotalAnswers = () => {
  return answerStats.value.reduce((total, item) => total + (item.answer_count || 0), 0)
}

// 获取正确答案次数
const getCorrectAnswers = () => {
  const correctAnswer = questionInfo.correct_answer
  const correctStat = answerStats.value.find(item => item.selected_answer === correctAnswer)
  return correctStat ? correctStat.answer_count : 0
}

// 获取正确率
const getAccuracyRate = () => {
  const total = getTotalAnswers()
  const correct = getCorrectAnswers()
  return total > 0 ? (correct / total * 100) : 0
}

// 获取平均用时
const getAverageTime = () => {
  if (answerStats.value.length === 0) return 0
  const totalTime = answerStats.value.reduce((sum, item) => sum + (item.avg_time || 0), 0)
  return Math.round(totalTime / answerStats.value.length)
}

// 获取题型名称
const getTypeName = (type) => {
  const typeMap = {
    single: '单选题',
    multiple: '多选题',
    truefalse: '判断题',
    essay: '简答题',
    fill: '填空题'
  }
  return typeMap[type] || type
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

// 导出题目报告
const exportQuestionReport = () => {
  ElMessage.info('导出功能待实现')
}

// 关闭对话框
const handleClose = () => {
  // 重置数据
  Object.assign(questionInfo, {
    id: null,
    title: '',
    content: '',
    type: '',
    options: [],
    correct_answer: '',
    difficulty: 1,
    subject: '',
    created_at: ''
  })
  
  answerStats.value = []
  wrongAnswers.value = []
  
  // 销毁图表
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}
</script>

<style scoped>
.question-info {
  margin-bottom: 16px;
}

.question-content {
  white-space: pre-wrap;
  line-height: 1.6;
}

.question-options {
  margin: 16px 0;
}

.option-item {
  margin: 8px 0;
  padding: 8px;
  background: #f5f5f5;
  border-radius: 4px;
}

.correct-answer {
  margin-top: 16px;
}

.answer-stats {
  margin-bottom: 16px;
}

.el-statistic {
  text-align: center;
}

.custom-statistic {
  text-align: center;
}

.custom-statistic .el-statistic__head {
  color: #909399;
  font-size: 14px;
  margin-bottom: 4px;
}

.custom-statistic .el-statistic__content {
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
