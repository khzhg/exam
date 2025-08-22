<template>
  <el-dialog 
    v-model="visible" 
    :title="`学生详情 - ${studentInfo.real_name || studentInfo.username}`"
    width="800px"
    destroy-on-close
    @closed="handleClose"
  >
    <div v-loading="loading">
      <!-- 学生基本信息 -->
      <el-card class="student-info" shadow="never">
        <template #header>
          <span>基本信息</span>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="姓名">
            {{ studentInfo.real_name || '未设置' }}
          </el-descriptions-item>
          <el-descriptions-item label="用户名">
            {{ studentInfo.username }}
          </el-descriptions-item>
          <el-descriptions-item label="邮箱">
            {{ studentInfo.email || '未设置' }}
          </el-descriptions-item>
          <el-descriptions-item label="注册时间">
            {{ formatDate(studentInfo.created_at) }}
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
            <el-statistic title="总考试次数" :value="Number(statistics.total_exams) || 0" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="平均分" :value="Number(statistics.avg_score) || 0" :precision="1" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="最高分" :value="Number(statistics.max_score) || 0" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="及格次数" :value="Number(statistics.pass_count) || 0" />
          </el-col>
        </el-row>
        <el-row :gutter="16" style="margin-top: 16px">
          <el-col :span="6">
            <el-statistic title="最低分" :value="Number(statistics.min_score) || 0" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="优秀次数" :value="Number(statistics.excellent_count) || 0" />
          </el-col>
          <el-col :span="6">
            <div class="custom-statistic">
              <div class="statistic-title">平均用时</div>
              <div class="statistic-value">{{ formatDuration(statistics.avg_duration) }}</div>
            </div>
          </el-col>
          <el-col :span="6">
            <el-statistic 
              title="及格率" 
              :value="Number(statistics.total_exams) > 0 ? Number(((Number(statistics.pass_count) / Number(statistics.total_exams)) * 100).toFixed(1)) : 0" 
              suffix="%" 
            />
          </el-col>
        </el-row>
      </el-card>

      <!-- 考试记录 -->
      <el-card style="margin-top: 16px" shadow="never">
        <template #header>
          <span>考试记录</span>
        </template>
        <el-table :data="examRecords" max-height="300">
          <el-table-column prop="paper_title" label="试卷名称" min-width="200" />
          <el-table-column prop="paper_subject" label="科目" width="120" />
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
          <el-table-column prop="paper_total_score" label="总分" width="80" />
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
          <el-table-column prop="start_time" label="考试时间" width="160">
            <template #default="scope">
              {{ formatDate(scope.row.start_time) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <template #footer>
      <el-button @click="visible = false">关闭</el-button>
      <el-button type="primary" @click="exportStudentReport">导出报告</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { adminAPI } from '@/api/admin'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  studentId: {
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

const studentInfo = reactive({
  id: null,
  username: '',
  real_name: '',
  email: '',
  created_at: ''
})

const statistics = reactive({
  total_exams: 0,
  avg_score: 0,
  max_score: 0,
  min_score: 0,
  pass_count: 0,
  excellent_count: 0,
  avg_duration: 0
})

const examRecords = ref([])

// 监听props变化
watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.studentId) {
    loadStudentDetail()
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

// 加载学生详情
const loadStudentDetail = async () => {
  if (!props.studentId) return
  
  loading.value = true
  try {
    const params = {}
    if (props.dateRange && props.dateRange.length === 2) {
      params.startDate = props.dateRange[0]
      params.endDate = props.dateRange[1]
    }
    
    const response = await adminAPI.getStudentDetail(props.studentId, params)
    if (response.success) {
      const data = response.data
      
      // 更新学生信息
      Object.assign(studentInfo, data.student)
      
      // 更新统计信息
      Object.assign(statistics, data.statistics)
      
      // 更新考试记录
      examRecords.value = data.examRecords || []
    }
  } catch (error) {
    console.error('获取学生详情失败:', error)
    ElMessage.error('获取学生详情失败')
  } finally {
    loading.value = false
  }
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

// 导出学生报告
const exportStudentReport = () => {
  ElMessage.info('导出功能待实现')
}

// 关闭对话框
const handleClose = () => {
  // 重置数据
  Object.assign(studentInfo, {
    id: null,
    username: '',
    real_name: '',
    email: '',
    created_at: ''
  })
  
  Object.assign(statistics, {
    total_exams: 0,
    avg_score: 0,
    max_score: 0,
    min_score: 0,
    pass_count: 0,
    excellent_count: 0,
    avg_duration: 0
  })
  
  examRecords.value = []
}
</script>

<style scoped>
.student-info, .exam-stats {
  margin-bottom: 16px;
}

.el-statistic {
  text-align: center;
}

.custom-statistic {
  text-align: center;
}

.statistic-title {
  color: #909399;
  font-size: 14px;
  margin-bottom: 4px;
}

.statistic-value {
  color: #303133;
  font-size: 24px;
  font-weight: 500;
}

.el-descriptions {
  margin: 16px 0;
}
</style>
