<template>
  <el-dialog 
    v-model="visible" 
    :title="`考试详情 - ${paperInfo.title}`"
    width="900px"
    destroy-on-close
    @closed="handleClose"
  >
    <div v-loading="loading">
      <!-- 试卷基本信息 -->
      <el-card class="paper-info" shadow="never">
        <template #header>
          <span>试卷信息</span>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="试卷名称">
            {{ paperInfo.title }}
          </el-descriptions-item>
          <el-descriptions-item label="总分">
            {{ paperInfo.total_score }}分
          </el-descriptions-item>
          <el-descriptions-item label="时间限制">
            {{ paperInfo.time_limit }}分钟
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatDate(paperInfo.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="试卷描述" :span="2">
            {{ paperInfo.description || '无描述' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <!-- 考试统计 -->
      <el-card class="exam-stats" style="margin-top: 16px" shadow="never">
        <template #header>
          <span>考试统计</span>
        </template>
        <el-row :gutter="16">
          <el-col :span="6">
            <el-statistic title="总参与人次" :value="Number(statistics.total_participants) || 0" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="独立参与人数" :value="Number(statistics.unique_participants) || 0" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="平均分" :value="Number(statistics.avg_score) || 0" :precision="1" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="最高分" :value="Number(statistics.max_score) || 0" />
          </el-col>
        </el-row>
        <el-row :gutter="16" style="margin-top: 16px">
          <el-col :span="6">
            <el-statistic title="最低分" :value="Number(statistics.min_score) || 0" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="及格人数" :value="Number(statistics.pass_count) || 0" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="优秀人数" :value="Number(statistics.excellent_count) || 0" />
          </el-col>
          <el-col :span="6">
            <el-statistic 
              title="及格率" 
              :value="Number(statistics.total_participants) > 0 ? Number(((Number(statistics.pass_count) / Number(statistics.total_participants)) * 100).toFixed(1)) : 0" 
              suffix="%" 
            />
          </el-col>
        </el-row>
        <el-row :gutter="16" style="margin-top: 16px">
          <el-col :span="8">
            <div class="custom-statistic">
              <div class="statistic-title">平均用时</div>
              <div class="statistic-value">{{ formatDuration(statistics.avg_duration) }}</div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="custom-statistic">
              <div class="statistic-title">最长用时</div>
              <div class="statistic-value">{{ formatDuration(statistics.max_duration) }}</div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="custom-statistic">
              <div class="statistic-title">最短用时</div>
              <div class="statistic-value">{{ formatDuration(statistics.min_duration) }}</div>
            </div>
          </el-col>
        </el-row>
      </el-card>

      <!-- 分数分布图 -->
      <el-card style="margin-top: 16px" shadow="never">
        <template #header>
          <span>分数分布</span>
        </template>
        <div ref="scoreDistributionChart" style="height: 300px"></div>
      </el-card>

      <!-- 参与学生列表 -->
      <el-card style="margin-top: 16px" shadow="never">
        <template #header>
          <div class="table-header">
            <span>参与学生</span>
            <el-input 
              v-model="searchKeyword" 
              placeholder="搜索学生姓名或用户名"
              style="width: 200px"
              clearable
              @input="filterRecords"
            />
          </div>
        </template>
        <el-table :data="filteredRecords" max-height="400">
          <el-table-column prop="real_name" label="姓名" width="120">
            <template #default="scope">
              {{ scope.row.real_name || scope.row.username }}
            </template>
          </el-table-column>
          <el-table-column prop="username" label="用户名" width="120" />
          <el-table-column prop="email" label="邮箱" width="150" />
          <el-table-column prop="obtained_score" label="得分" width="80">
            <template #default="scope">
              <el-tag 
                :type="getScoreTagType(scope.row.obtained_score)"
                size="small"
              >
                {{ scope.row.obtained_score || '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusTagType(scope.row.status)" size="small">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="duration" label="用时" width="100">
            <template #default="scope">
              {{ formatDuration(scope.row.duration) }}
            </template>
          </el-table-column>
          <el-table-column prop="start_time" label="开始时间" width="160">
            <template #default="scope">
              {{ formatDate(scope.row.start_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="end_time" label="结束时间" width="160">
            <template #default="scope">
              {{ formatDate(scope.row.end_time) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" @click="exportExamReport">导出报告</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch, nextTick, computed } from 'vue'
import { ElMessage } from 'element-plus'
import * as echarts from 'echarts'
import { adminAPI } from '@/api/admin'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  examId: {
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
const searchKeyword = ref('')

const paperInfo = reactive({
  id: null,
  title: '',
  description: '',
  total_score: 0,
  time_limit: 0,
  created_at: ''
})

const statistics = reactive({
  total_participants: 0,
  unique_participants: 0,
  avg_score: 0,
  max_score: 0,
  min_score: 0,
  pass_count: 0,
  excellent_count: 0,
  avg_duration: 0,
  max_duration: 0,
  min_duration: 0
})

const examRecords = ref([])
const scoreDistribution = ref([])
const scoreDistributionChart = ref()
let chartInstance = null

// 过滤后的记录
const filteredRecords = computed(() => {
  if (!searchKeyword.value.trim()) {
    return examRecords.value
  }
  
  const keyword = searchKeyword.value.toLowerCase()
  return examRecords.value.filter(record => {
    const name = (record.real_name || '').toLowerCase()
    const username = (record.username || '').toLowerCase()
    return name.includes(keyword) || username.includes(keyword)
  })
})

// 监听props变化
watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.examId) {
    loadExamDetail()
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

// 加载考试详情
const loadExamDetail = async () => {
  if (!props.examId) return
  
  loading.value = true
  try {
    const params = {}
    if (props.dateRange && props.dateRange.length === 2) {
      params.startDate = props.dateRange[0]
      params.endDate = props.dateRange[1]
    }
    
    const response = await adminAPI.getExamDetail(props.examId, params)
    if (response.success) {
      const data = response.data
      
      // 更新试卷信息
      Object.assign(paperInfo, data.paper)
      
      // 更新统计信息
      Object.assign(statistics, data.statistics)
      
      // 更新考试记录
      examRecords.value = data.examRecords || []
      
      // 更新分数分布
      scoreDistribution.value = data.scoreDistribution || []
      
      // 刷新图表
      nextTick(() => {
        initChart()
      })
    }
  } catch (error) {
    console.error('获取考试详情失败:', error)
    ElMessage.error('获取考试详情失败')
  } finally {
    loading.value = false
  }
}

// 初始化图表
const initChart = () => {
  if (!scoreDistributionChart.value) return
  
  if (chartInstance) {
    chartInstance.dispose()
  }
  
  chartInstance = echarts.init(scoreDistributionChart.value)
  
  // 处理分数分布数据
  const categories = ['0-59', '60-69', '70-79', '80-89', '90-100']
  const data = new Array(5).fill(0)
  
  scoreDistribution.value.forEach(item => {
    const range = item.score_range
    const index = categories.indexOf(range)
    if (index !== -1) {
      data[index] = item.count
    }
  })
  
  const option = {
    title: {
      text: '分数分布',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'axis',
      formatter: function(params) {
        const item = params[0]
        return `${item.name}分: ${item.value}人`
      }
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        rotate: 0
      }
    },
    yAxis: {
      type: 'value',
      name: '人数'
    },
    series: [{
      data: data,
      type: 'bar',
      itemStyle: {
        color: '#409EFF'
      },
      barWidth: '60%'
    }]
  }
  
  chartInstance.setOption(option)
}

// 过滤记录
const filterRecords = () => {
  // 触发计算属性重新计算
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString('zh-CN')
}

// 格式化时长
const formatDuration = (seconds) => {
  if (!seconds) return '-'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = (seconds % 60).toFixed(2)
  return `${minutes}分${remainingSeconds}秒`
}

// 获取分数标签类型
const getScoreTagType = (score) => {
  if (score >= 90) return 'success'
  if (score >= 80) return 'primary'
  if (score >= 60) return 'warning'
  return 'danger'
}

// 获取状态标签类型
const getStatusTagType = (status) => {
  const typeMap = {
    completed: 'success',
    timeout: 'warning',
    ongoing: 'primary'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const textMap = {
    completed: '已完成',
    timeout: '超时',
    ongoing: '进行中'
  }
  return textMap[status] || status
}

// 导出考试报告
const exportExamReport = () => {
  ElMessage.info('导出功能待实现')
}

// 关闭对话框
const handleClose = () => {
  // 重置数据
  Object.assign(paperInfo, {
    id: null,
    title: '',
    description: '',
    total_score: 0,
    time_limit: 0,
    created_at: ''
  })
  
  Object.assign(statistics, {
    total_participants: 0,
    unique_participants: 0,
    avg_score: 0,
    max_score: 0,
    min_score: 0,
    pass_count: 0,
    excellent_count: 0,
    avg_duration: 0,
    max_duration: 0,
    min_duration: 0
  })
  
  examRecords.value = []
  scoreDistribution.value = []
  searchKeyword.value = ''
  
  // 销毁图表
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
}
</script>

<style scoped>
.paper-info, .exam-stats {
  margin-bottom: 16px;
}

.el-statistic {
  text-align: center;
}

.el-descriptions {
  margin: 16px 0;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
