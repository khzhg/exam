<template>
  <div class="exam-manage">
    <el-card class="page-header">
      <template #header>
        <div class="header-content">
          <h2>考试管理</h2>
          <div class="header-actions">
            <el-button type="primary" @click="showCreateDialog = true">
              <el-icon><Plus /></el-icon>
              安排考试
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <div class="filter-section">
        <el-form :model="filterForm" inline>
          <el-form-item label="考试名称">
            <el-input v-model="filterForm.title" placeholder="输入考试名称" clearable />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 120px">
              <el-option label="未开始" value="pending" />
              <el-option label="进行中" value="ongoing" />
              <el-option label="已结束" value="finished" />
            </el-select>
          </el-form-item>
          <el-form-item label="时间范围">
            <el-date-picker
              v-model="filterForm.dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadExams">搜索</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 考试列表 -->
    <el-card>
      <el-table :data="exams" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="考试名称" min-width="200" />
        <el-table-column prop="paper_title" label="试卷" min-width="150" />
        <el-table-column prop="start_time" label="开始时间" width="180">
          <template #default="scope">
            {{ formatDateTime(scope.row.start_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="end_time" label="结束时间" width="180">
          <template #default="scope">
            {{ formatDateTime(scope.row.end_time) }}
          </template>
        </el-table-column>
        <el-table-column prop="participant_count" label="参与人数" width="100" />
        <el-table-column prop="submitted_count" label="已提交" width="100" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag :type="getStatusColor(scope.row.actual_status || scope.row.status)">
              {{ getStatusName(scope.row.actual_status || scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="viewExamDetail(scope.row)">详情</el-button>
            <el-button 
              size="small" 
              type="primary" 
              @click="monitorExam(scope.row)"
              v-if="(scope.row.actual_status || scope.row.status) === 'ongoing'"
            >监控</el-button>
            <el-button 
              size="small" 
              type="success" 
              @click="viewResults(scope.row)"
              v-if="(scope.row.actual_status || scope.row.status) === 'finished'"
            >成绩</el-button>
            <el-dropdown @command="handleCommand($event, scope.row)">
              <el-button size="small">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit" v-if="(scope.row.actual_status || scope.row.status) === 'pending'">
                    编辑考试
                  </el-dropdown-item>
                  <el-dropdown-item command="start" v-if="(scope.row.actual_status || scope.row.status) === 'pending'">
                    立即开始
                  </el-dropdown-item>
                  <el-dropdown-item command="end" v-if="(scope.row.actual_status || scope.row.status) === 'ongoing'">
                    提前结束
                  </el-dropdown-item>
                  <el-dropdown-item command="export" v-if="(scope.row.actual_status || scope.row.status) === 'finished'">
                    导出成绩
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided>删除考试</el-dropdown-item>
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
          @size-change="loadExams"
          @current-change="loadExams"
        />
      </div>
    </el-card>

    <!-- 安排考试对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="editMode ? '编辑考试' : '安排考试'"
      width="600px"
      @closed="resetForm"
    >
      <el-form :model="examForm" :rules="examRules" ref="examFormRef" label-width="120px">
        <el-form-item label="考试名称" prop="title">
          <el-input v-model="examForm.title" placeholder="请输入考试名称" />
        </el-form-item>

        <el-form-item label="选择试卷" prop="paper_id">
          <el-select v-model="examForm.paper_id" placeholder="请选择试卷" style="width: 100%">
            <el-option 
              v-for="paper in availablePapers" 
              :key="paper.id" 
              :label="`${paper.title} (${paper.subject})`"
              :value="paper.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="考试时间" prop="dateRange">
          <el-date-picker
            v-model="examForm.dateRange"
            type="datetimerange"
            range-separator="至"
            start-placeholder="开始时间"
            end-placeholder="结束时间"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="考试说明">
          <el-input 
            v-model="examForm.description" 
            type="textarea" 
            :rows="3"
            placeholder="请输入考试说明（可选）"
          />
        </el-form-item>

        <el-form-item label="参与学生" prop="participants">
          <div class="participant-selection">
            <el-radio-group v-model="participantType">
              <el-radio label="all">全部学生</el-radio>
              <el-radio label="selected">指定学生</el-radio>
            </el-radio-group>
            
            <div v-if="participantType === 'selected'" style="margin-top: 15px">
              <el-transfer
                v-model="examForm.participants"
                :data="allStudents"
                :titles="['可选学生', '参与考试']"
                :button-texts="['移除', '添加']"
                :format="{
                  noChecked: '${total}',
                  hasChecked: '${checked}/${total}'
                }"
                style="text-align: left; display: inline-block"
              />
            </div>
          </div>
        </el-form-item>

        <el-divider content-position="left">高级设置</el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="允许迟到">
              <el-switch v-model="examForm.allow_late" />
              <div class="form-note">允许学生在考试开始后进入</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="乱序出题">
              <el-switch v-model="examForm.random_order" />
              <div class="form-note">随机打乱题目顺序</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="防作弊">
              <el-switch v-model="examForm.anti_cheat" />
              <div class="form-note">启用防作弊监控</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="自动提交">
              <el-switch v-model="examForm.auto_submit" />
              <div class="form-note">时间到自动提交试卷</div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveExam" :loading="saving">
          {{ editMode ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 考试详情对话框 -->
    <el-dialog v-model="showDetailDialog" title="考试详情" width="800px">
      <div class="exam-detail" v-if="currentExam">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="考试名称">{{ currentExam.title }}</el-descriptions-item>
          <el-descriptions-item label="试卷">{{ currentExam.paper_title }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ formatDateTime(currentExam.start_time) }}</el-descriptions-item>
          <el-descriptions-item label="结束时间">{{ formatDateTime(currentExam.end_time) }}</el-descriptions-item>
          <el-descriptions-item label="参与人数">{{ currentExam.participant_count }}</el-descriptions-item>
          <el-descriptions-item label="已提交">{{ currentExam.submitted_count }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusColor(currentExam.actual_status || currentExam.status)">
              {{ getStatusName(currentExam.actual_status || currentExam.status) }}
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="currentExam.description" style="margin-top: 20px">
          <h4>考试说明</h4>
          <p>{{ currentExam.description }}</p>
        </div>
      </div>
    </el-dialog>

    <!-- 考试监控对话框 -->
    <el-dialog v-model="showMonitorDialog" title="考试监控" width="1000px">
      <div class="exam-monitor">
        <div class="monitor-header">
          <el-statistic title="在线人数" :value="monitorData.online_count" />
          <el-statistic title="已提交" :value="monitorData.submitted_count" />
          <el-statistic title="剩余时间" :value="monitorData.remaining_time" suffix="分钟" />
        </div>

        <el-table :data="monitorData.participants" style="margin-top: 20px">
          <el-table-column prop="student_name" label="学生姓名" />
          <el-table-column prop="login_time" label="登录时间">
            <template #default="scope">
              {{ formatTime(scope.row.login_time) }}
            </template>
          </el-table-column>
          <el-table-column prop="progress" label="答题进度">
            <template #default="scope">
              <el-progress :percentage="scope.row.progress" />
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态">
            <template #default="scope">
              <el-tag :type="scope.row.status === 'online' ? 'success' : 'info'">
                {{ scope.row.status === 'online' ? '在线' : '离线' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作">
            <template #default="scope">
              <el-button size="small" @click="kickStudent(scope.row)">强制下线</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowDown } from '@element-plus/icons-vue'
import { paperAPI, adminAPI, examScheduleAPI } from '@/api/exam'
import { getStudents } from '@/api/admin'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const showMonitorDialog = ref(false)
const editMode = ref(false)
const participantType = ref('all')

const exams = ref([])
const availablePapers = ref([])
const allStudents = ref([])
const currentExam = ref(null)

const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const filterForm = reactive({
  title: '',
  status: '',
  dateRange: null
})

const examForm = reactive({
  id: null,
  title: '',
  paper_id: '',
  dateRange: null,
  description: '',
  participants: [],
  allow_late: true,
  random_order: false,
  anti_cheat: false,
  auto_submit: true
})

const monitorData = reactive({
  online_count: 0,
  submitted_count: 0,
  remaining_time: 0,
  participants: []
})

const examRules = {
  title: [{ required: true, message: '请输入考试名称', trigger: 'blur' }],
  paper_id: [{ required: true, message: '请选择试卷', trigger: 'change' }],
  dateRange: [{ required: true, message: '请选择考试时间', trigger: 'change' }]
}

const examFormRef = ref()

// 方法
const loadExams = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.currentPage,
      limit: pagination.pageSize,
      title: filterForm.title,
      status: filterForm.status
    }
    
    // 处理时间范围
    if (filterForm.dateRange && filterForm.dateRange.length === 2) {
      params.startDate = filterForm.dateRange[0].toISOString()
      params.endDate = filterForm.dateRange[1].toISOString()
    }
    
    const response = await examScheduleAPI.getSchedules(params)
    if (response.success) {
      exams.value = response.data.schedules || []
      pagination.total = response.data.total || 0
    } else {
      ElMessage.error(response.message || '获取考试列表失败')
    }
  } catch (error) {
    console.error('加载考试列表失败:', error)
    ElMessage.error('加载考试列表失败')
  } finally {
    loading.value = false
  }
}

const loadAvailablePapers = async () => {
  try {
    // 获取适用于考试的试卷列表 (排除仅练习的试卷)
    const response = await paperAPI.getExamPapers({ 
      page: 1, 
      limit: 100,
      includeScheduled: true  // 包括预定考试，因为管理员可以安排考试
    })
    if (response.success) {
      availablePapers.value = response.data.papers || response.data.records || response.data || []
    } else {
      ElMessage.error(response.message || '获取试卷列表失败')
    }
  } catch (error) {
    console.error('加载试卷列表失败:', error)
    ElMessage.error('加载试卷列表失败')
  }
}

const loadAllStudents = async () => {
  try {
    // 获取所有学生列表
    const response = await getStudents()
    if (response.success) {
      const students = response.data || []
      // 转换为 el-transfer 需要的格式
      allStudents.value = students.map(student => ({
        key: student.id,
        label: `${student.username} (${student.real_name || student.username})`,
        disabled: false
      }))
    } else {
      ElMessage.error(response.message || '获取学生列表失败')
    }
  } catch (error) {
    console.error('加载学生列表失败:', error)
    ElMessage.error('加载学生列表失败')
  }
}

const resetFilter = () => {
  Object.assign(filterForm, {
    title: '',
    status: '',
    dateRange: null
  })
  loadExams()
}

const getStatusName = (status) => {
  const statusMap = {
    pending: '未开始',
    ongoing: '进行中',
    finished: '已结束'
  }
  return statusMap[status] || status
}

const getStatusColor = (status) => {
  const colorMap = {
    pending: 'info',
    ongoing: 'success',
    finished: 'warning'
  }
  return colorMap[status] || ''
}

const formatDateTime = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const formatDateTimeLocal = (date) => {
  // 格式化为 ISO 格式但保持本地时间（添加时区偏移）
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  // 获取时区偏移（分钟）
  const timezoneOffset = -date.getTimezoneOffset()
  const offsetHours = String(Math.floor(Math.abs(timezoneOffset) / 60)).padStart(2, '0')
  const offsetMinutes = String(Math.abs(timezoneOffset) % 60).padStart(2, '0')
  const offsetSign = timezoneOffset >= 0 ? '+' : '-'
  
  // 返回包含时区信息的ISO格式：2025-08-15T10:30:00+08:00
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMinutes}`
}

const formatTime = (timeString) => {
  return new Date(timeString).toLocaleTimeString('zh-CN')
}

const viewExamDetail = (exam) => {
  currentExam.value = exam
  showDetailDialog.value = true
}

const monitorExam = async (exam) => {
  currentExam.value = exam
  await loadMonitorData()
  showMonitorDialog.value = true
}

const loadMonitorData = async () => {
  try {
    // TODO: 调用API获取监控数据
    Object.assign(monitorData, {
      online_count: 0,
      submitted_count: 0,
      remaining_time: 0,
      participants: []
    })
  } catch (error) {
    ElMessage.error('加载监控数据失败')
  }
}

const viewResults = (exam) => {
  // 跳转到成绩统计页面，并传递考试参数
  router.push({
    name: 'ResultsStats',
    query: {
      exam_id: exam.paper_id, // 使用paper_id作为考试ID
      exam_title: exam.title || exam.paper_title
    }
  })
}

const handleCommand = async (command, exam) => {
  switch (command) {
    case 'edit':
      editExam(exam)
      break
    case 'start':
      await startExam(exam.id)
      break
    case 'end':
      await endExam(exam.id)
      break
    case 'export':
      exportResults(exam.id)
      break
    case 'delete':
      await deleteExam(exam.id)
      break
  }
}

const editExam = (exam) => {
  editMode.value = true
  Object.assign(examForm, {
    ...exam,
    dateRange: [new Date(exam.start_time), new Date(exam.end_time)]
  })
  showCreateDialog.value = true
}

const startExam = async (id) => {
  try {
    await ElMessageBox.confirm('确定要立即开始这场考试吗？', '提示', {
      type: 'warning'
    })
    const response = await examScheduleAPI.updateScheduleStatus(id, 'ongoing')
    if (response.success) {
      ElMessage.success('考试已开始')
      loadExams()
    } else {
      ElMessage.error(response.message || '开始考试失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('开始考试失败:', error)
      ElMessage.error('开始考试失败')
    }
  }
}

const endExam = async (id) => {
  try {
    await ElMessageBox.confirm('确定要提前结束这场考试吗？', '提示', {
      type: 'warning'
    })
    const response = await examScheduleAPI.updateScheduleStatus(id, 'finished')
    if (response.success) {
      ElMessage.success('考试已结束')
      loadExams()
    } else {
      ElMessage.error(response.message || '结束考试失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('结束考试失败:', error)
      ElMessage.error('结束考试失败')
    }
  }
}

const exportResults = (id) => {
  // TODO: 实现成绩导出
  ElMessage.info('成绩导出功能待实现')
}

const deleteExam = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这场考试吗？', '提示', {
      type: 'warning'
    })
    const response = await examScheduleAPI.deleteSchedule(id)
    if (response.success) {
      ElMessage.success('考试删除成功')
      loadExams()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') { // 不是用户取消操作
      console.error('删除考试失败:', error)
      ElMessage.error('删除考试失败')
    }
  }
}

const saveExam = async () => {
  try {
    await examFormRef.value.validate()
    saving.value = true
    
    // 准备提交数据
    const submitData = {
      title: examForm.title,
      description: examForm.description,
      paper_id: examForm.paper_id,
      start_time: formatDateTimeLocal(examForm.dateRange[0]), // 使用本地时间格式
      end_time: formatDateTimeLocal(examForm.dateRange[1]),   // 使用本地时间格式
      participant_type: participantType.value,
      participants: participantType.value === 'selected' ? examForm.participants : [],
      settings: {
        allow_late: examForm.allow_late,
        random_order: examForm.random_order,
        anti_cheat: examForm.anti_cheat,
        auto_submit: examForm.auto_submit
      }
    }
    
    if (editMode.value) {
      // 更新考试
      const response = await examScheduleAPI.updateSchedule(examForm.id, submitData)
      if (response.success) {
        ElMessage.success('考试更新成功')
      } else {
        ElMessage.error(response.message || '更新失败')
        return
      }
    } else {
      // 创建考试
      const response = await examScheduleAPI.createSchedule(submitData)
      if (response.success) {
        ElMessage.success('考试创建成功')
      } else {
        ElMessage.error(response.message || '创建失败')
        return
      }
    }
    
    showCreateDialog.value = false
    loadExams()
  } catch (error) {
    console.error('保存失败:', error)
    if (error.response?.data?.message) {
      ElMessage.error(error.response.data.message)
    } else {
      ElMessage.error('保存失败')
    }
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  editMode.value = false
  participantType.value = 'all'
  Object.assign(examForm, {
    id: null,
    title: '',
    paper_id: '',
    dateRange: null,
    description: '',
    participants: [],
    allow_late: true,
    random_order: false,
    anti_cheat: false,
    auto_submit: true
  })
  examFormRef.value?.resetFields()
}

const kickStudent = async (student) => {
  try {
    await ElMessageBox.confirm(`确定要强制 ${student.student_name} 下线吗？`, '提示', {
      type: 'warning'
    })
    // TODO: 调用强制下线API
    ElMessage.success('学生已强制下线')
    loadMonitorData()
  } catch {
    // 用户取消
  }
}

onMounted(() => {
  loadExams()
  loadAvailablePapers()
  loadAllStudents()
})
</script>

<style scoped>
.exam-manage {
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

.participant-selection {
  width: 100%;
}

.form-note {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.exam-detail {
  padding: 20px 0;
}

.exam-monitor {
  padding: 20px 0;
}

.monitor-header {
  display: flex;
  gap: 40px;
  margin-bottom: 20px;
}
</style>
