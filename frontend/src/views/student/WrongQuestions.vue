<template>
  <div class="wrong-questions">
    <el-card class="page-header">
      <template #header>
        <div class="header-content">
          <h2>错题本</h2>
          <div class="header-actions">
            <el-button type="primary" @click="startPractice" :disabled="selectedQuestions.length === 0">
              <el-icon><VideoPlay /></el-icon>
              开始练习 ({{ selectedQuestions.length }})
            </el-button>
            <el-button @click="exportWrongQuestions">
              <el-icon><Download /></el-icon>
              导出错题
            </el-button>
          </div>
        </div>
      </template>

      <!-- 统计概览 -->
      <el-row :gutter="20" style="margin-bottom: 20px">
        <el-col :span="6">
          <el-statistic title="错题总数" :value="statistics.total_wrong" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="已掌握" :value="statistics.mastered" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="待复习" :value="statistics.need_review" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="掌握率" :value="statistics.mastery_rate" suffix="%" />
        </el-col>
      </el-row>

      <!-- 搜索筛选 -->
      <div class="filter-section">
        <el-form :model="filterForm" inline>
          <el-form-item label="题目类型">
            <el-select v-model="filterForm.type" placeholder="全部类型" clearable>
              <el-option label="单选题" value="single" />
              <el-option label="多选题" value="multiple" />
              <el-option label="判断题" value="truefalse" />
              <el-option label="简答题" value="essay" />
              <el-option label="填空题" value="fill" />
            </el-select>
          </el-form-item>
          <el-form-item label="难度">
            <el-select v-model="filterForm.difficulty" placeholder="全部难度" clearable>
              <el-option label="简单" :value="1" />
              <el-option label="普通" :value="2" />
              <el-option label="困难" :value="3" />
            </el-select>
          </el-form-item>
          <el-form-item label="科目">
            <el-input v-model="filterForm.subject" placeholder="输入科目" clearable />
          </el-form-item>
          <el-form-item label="掌握状态">
            <el-select v-model="filterForm.mastery_status" placeholder="全部状态" clearable>
              <el-option label="未掌握" value="not_mastered" />
              <el-option label="部分掌握" value="partially_mastered" />
              <el-option label="已掌握" value="mastered" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadWrongQuestions">搜索</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 错题统计图表 -->
    <el-row :gutter="20" style="margin-bottom: 20px">
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>错题类型分布</span>
          </template>
          <div ref="typeDistributionChart" style="height: 250px"></div>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card>
          <template #header>
            <span>掌握程度统计</span>
          </template>
          <div ref="masteryChart" style="height: 250px"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 错题列表 -->
    <el-card>
      <template #header>
        <div class="table-header">
          <span>错题列表</span>
          <div class="batch-actions">
            <el-checkbox 
              v-model="selectAll" 
              @change="handleSelectAll"
              :indeterminate="isIndeterminate"
            >
              全选
            </el-checkbox>
            <el-button 
              size="small" 
              @click="batchMarkMastered" 
              :disabled="selectedQuestions.length === 0"
            >
              标记已掌握
            </el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="batchRemove" 
              :disabled="selectedQuestions.length === 0"
            >
              批量移除
            </el-button>
          </div>
        </div>
      </template>

      <el-table 
        :data="wrongQuestions" 
        v-loading="loading" 
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="题目标题" min-width="200">
          <template #default="scope">
            <div class="question-title-cell">
              <span class="title-text">{{ scope.row.title }}</span>
              <el-tag v-if="scope.row.is_favorite" type="warning" size="small">收藏</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100">
          <template #default="scope">
            <el-tag :type="getTypeColor(scope.row.type)" size="small">
              {{ getTypeName(scope.row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="difficulty" label="难度" width="120">
          <template #default="scope">
            <el-rate v-model="scope.row.difficulty" disabled size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="subject" label="科目" width="120" />
        <el-table-column prop="wrong_count" label="错误次数" width="100">
          <template #default="scope">
            <el-tag type="danger" size="small">{{ scope.row.wrong_count }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="practice_count" label="练习次数" width="100" />
        <el-table-column prop="correct_rate" label="正确率" width="120">
          <template #default="scope">
            <el-progress 
              :percentage="scope.row.correct_rate" 
              :color="getCorrectRateColor(scope.row.correct_rate)"
              :show-text="false"
              style="width: 60px"
            />
            <span style="margin-left: 10px">{{ scope.row.correct_rate }}%</span>
          </template>
        </el-table-column>
        <el-table-column prop="mastery_status" label="掌握状态" width="120">
          <template #default="scope">
            <el-tag :type="getMasteryColor(scope.row.mastery_status)" size="small">
              {{ getMasteryName(scope.row.mastery_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="last_wrong_date" label="最近错误" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.last_wrong_date) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="viewQuestion(scope.row)">查看</el-button>
            <el-button size="small" type="primary" @click="practiceQuestion(scope.row)">练习</el-button>
            <el-dropdown @command="handleCommand($event, scope.row)">
              <el-button size="small">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="scope.row.is_favorite ? 'unfavorite' : 'favorite'">
                    {{ scope.row.is_favorite ? '取消收藏' : '收藏' }}
                  </el-dropdown-item>
                  <el-dropdown-item command="markMastered" v-if="scope.row.mastery_status !== 'mastered'">
                    标记已掌握
                  </el-dropdown-item>
                  <el-dropdown-item command="addNote">添加笔记</el-dropdown-item>
                  <el-dropdown-item command="viewHistory">练习历史</el-dropdown-item>
                  <el-dropdown-item command="remove" divided>移除错题</el-dropdown-item>
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
          @size-change="loadWrongQuestions"
          @current-change="loadWrongQuestions"
        />
      </div>
    </el-card>

    <!-- 题目详情对话框 -->
    <el-dialog v-model="showQuestionDialog" title="题目详情" width="800px">
      <div class="question-detail" v-if="currentQuestion">
        <div class="question-header">
          <h3>{{ currentQuestion.title }}</h3>
          <div class="question-meta">
            <el-tag :type="getTypeColor(currentQuestion.type)">
              {{ getTypeName(currentQuestion.type) }}
            </el-tag>
            <el-rate v-model="currentQuestion.difficulty" disabled />
            <span>{{ currentQuestion.subject }}</span>
          </div>
        </div>

        <div class="question-content">
          <p>{{ currentQuestion.content }}</p>
          
          <!-- 选择题选项 -->
          <div v-if="currentQuestion.type !== 'essay'" class="question-options">
            <div 
              v-for="(option, index) in getQuestionOptions(currentQuestion)" 
              :key="index"
              class="option-item"
              :class="{ 'correct-option': isCorrectOption(index, currentQuestion.correct_answer) }"
            >
              <span class="option-label">{{ String.fromCharCode(65 + index) }}.</span>
              <span class="option-text">{{ getOptionText(option) }}</span>
            </div>
          </div>

          <!-- 正确答案 -->
          <div class="correct-answer">
            <h4>正确答案：</h4>
            <p>{{ formatCorrectAnswer(currentQuestion) }}</p>
          </div>

          <!-- 答案解析 -->
          <div v-if="currentQuestion.explanation" class="answer-explanation">
            <h4>答案解析：</h4>
            <p>{{ currentQuestion.explanation }}</p>
          </div>

          <!-- 个人笔记 -->
          <div class="personal-note">
            <h4>个人笔记：</h4>
            <el-input 
              v-model="currentQuestion.note" 
              type="textarea" 
              :rows="3"
              placeholder="在这里记录你的学习心得..."
              @blur="saveNote"
            />
          </div>

          <!-- 错误历史 -->
          <div class="error-history">
            <h4>错误历史：</h4>
            <el-timeline>
              <el-timeline-item 
                v-for="error in currentQuestion.error_history" 
                :key="error.id"
                :timestamp="formatDate(error.date)"
              >
                <p>在《{{ error.exam_title }}》中答错</p>
                <p class="error-answer">我的答案：{{ error.my_answer }}</p>
              </el-timeline-item>
            </el-timeline>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 练习设置对话框 -->
    <el-dialog v-model="showPracticeDialog" title="练习设置" width="500px">
      <el-form :model="practiceForm" label-width="120px">
        <el-form-item label="练习模式">
          <el-radio-group v-model="practiceForm.mode">
            <el-radio label="selected">选中题目</el-radio>
            <el-radio label="filtered">筛选结果</el-radio>
            <el-radio label="random">随机练习</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="题目数量" v-if="practiceForm.mode === 'random'">
          <el-input-number 
            v-model="practiceForm.count" 
            :min="1" 
            :max="50"
            controls-position="right"
          />
        </el-form-item>

        <el-form-item label="练习设置">
          <el-checkbox v-model="practiceForm.show_answer">显示答案</el-checkbox>
          <el-checkbox v-model="practiceForm.show_explanation">显示解析</el-checkbox>
          <el-checkbox v-model="practiceForm.shuffle_options">打乱选项</el-checkbox>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showPracticeDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmPractice">开始练习</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { VideoPlay, Download, ArrowDown } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import request from '@/utils/request'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const showQuestionDialog = ref(false)
const showPracticeDialog = ref(false)
const selectAll = ref(false)
const currentQuestion = ref(null)

const wrongQuestions = ref([])
const selectedQuestions = ref([])

const statistics = reactive({
  total_wrong: 0,
  mastered: 0,
  need_review: 0,
  mastery_rate: 0
})

const pagination = reactive({
  page: 1,
  limit: 20,
  total: 0
})

const filterForm = reactive({
  type: '',
  difficulty: '',
  subject: '',
  mastery_status: ''
})

const practiceForm = reactive({
  mode: 'selected',
  count: 20,
  show_answer: true,
  show_explanation: true,
  shuffle_options: false
})

// 图表引用
const typeDistributionChart = ref()
const masteryChart = ref()
let typeDistributionChartInstance = null
let masteryChartInstance = null

// 计算属性
const isIndeterminate = computed(() => {
  return selectedQuestions.value.length > 0 && selectedQuestions.value.length < wrongQuestions.value.length
})

// 方法
const loadWrongQuestions = async () => {
  loading.value = true
  try {
    // 调用API获取错题列表
    const response = await request.get('/students/wrong-questions', {
      params: {
        page: pagination.page,
        limit: pagination.limit,
        questionType: filterForm.type,
        difficulty: filterForm.difficulty,
        subject: filterForm.subject,
        mastery_status: filterForm.mastery_status
      }
    })
    
    if (response.success) {
      wrongQuestions.value = response.data.questions || []
      pagination.total = response.data.total || 0
      
      // 计算统计信息
      const stats = calculateWrongQuestionStats()
      Object.assign(statistics, stats)
      
      ElMessage.success('错题列表加载成功')
      updateCharts()
    } else {
      throw new Error(response.message || '获取错题失败')
    }
  } catch (error) {
    console.error('加载错题列表失败:', error)
    ElMessage.error('加载错题列表失败')
  } finally {
    loading.value = false
  }
}

// 计算错题统计信息
const calculateWrongQuestionStats = () => {
  const total = wrongQuestions.value.length
  const mastered = wrongQuestions.value.filter(q => q.mastery_status === 'mastered').length
  const needReview = total - mastered
  const masteryRate = total > 0 ? Math.round((mastered / total) * 100) : 0
  
  return {
    total_wrong: total,
    mastered,
    need_review: needReview,
    mastery_rate: masteryRate
  }
}

const resetFilter = () => {
  Object.assign(filterForm, {
    type: '',
    difficulty: '',
    subject: '',
    mastery_status: ''
  })
  loadWrongQuestions()
}

const handleSelectionChange = (selection) => {
  selectedQuestions.value = selection
  selectAll.value = selection.length === wrongQuestions.value.length
}

const handleSelectAll = (checked) => {
  // 此处由 Element Plus 表格自动处理
}

const getTypeName = (type) => {
  const typeMap = {
    single: '单选题',
    multiple: '多选题',
    truefalse: '判断题',
    essay: '简答题',
    fill: '填空题'
  }
  return typeMap[type] || '未知类型'
}

const getTypeColor = (type) => {
  const colorMap = {
    single: 'primary',
    multiple: 'success',
    truefalse: 'warning',
    essay: 'info',
    fill: 'danger'
  }
  return colorMap[type] || 'info' // 默认返回 'info' 而不是空字符串
}

const getCorrectRateColor = (rate) => {
  if (rate >= 80) return '#67C23A'
  if (rate >= 50) return '#E6A23C'
  return '#F56C6C'
}

const getMasteryColor = (status) => {
  const colorMap = {
    not_mastered: 'danger',
    partially_mastered: 'warning',
    mastered: 'success'
  }
  return colorMap[status] || 'info' // 默认返回 'info' 而不是空字符串
}

const getMasteryName = (status) => {
  const nameMap = {
    not_mastered: '未掌握',
    partially_mastered: '部分掌握',
    mastered: '已掌握'
  }
  return nameMap[status] || '未知状态'
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const viewQuestion = async (question) => {
  try {
    // 使用question_id或id字段
    const questionId = question.question_id || question.id
    
    // 获取题目详情
    const response = await request.get(`/students/wrong-questions/${questionId}/detail`)
    
    if (response.success) {
      currentQuestion.value = {
        ...question,
        ...response.data,
        note: response.data.note || '',
        error_history: response.data.error_history || []
      }
    } else {
      // 如果API不存在，使用现有数据
      currentQuestion.value = {
        ...question,
        note: '',
        error_history: []
      }
    }
    
    showQuestionDialog.value = true
  } catch (error) {
    console.error('加载题目详情失败:', error)
    // 降级处理：使用列表中的基本数据
    currentQuestion.value = {
      ...question,
      note: '',
      error_history: []
    }
    showQuestionDialog.value = true
  }
}

const practiceQuestion = (question) => {
  selectedQuestions.value = [question]
  showPracticeDialog.value = true
}

const handleCommand = async (command, question) => {
  switch (command) {
    case 'favorite':
    case 'unfavorite':
      await toggleFavorite(question)
      break
    case 'markMastered':
      await markMastered(question)
      break
    case 'addNote':
      viewQuestion(question)
      break
    case 'viewHistory':
      viewPracticeHistory(question)
      break
    case 'remove':
      await removeQuestion(question)
      break
  }
}

const toggleFavorite = async (question) => {
  try {
    // TODO: 调用API切换收藏状态
    question.is_favorite = !question.is_favorite
    ElMessage.success(question.is_favorite ? '已收藏' : '已取消收藏')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const markMastered = async (question) => {
  try {
    // TODO: 调用API标记已掌握
    question.mastery_status = 'mastered'
    ElMessage.success('已标记为掌握')
  } catch (error) {
    ElMessage.error('标记失败')
  }
}

const viewPracticeHistory = (question) => {
  // TODO: 显示练习历史
  ElMessage.info('查看练习历史功能待实现')
}

const removeQuestion = async (question) => {
  try {
    await ElMessageBox.confirm('确定要从错题本中移除这道题目吗？', '提示', {
      type: 'warning'
    })
    
    // TODO: 调用API移除错题
    ElMessage.success('错题已移除')
    loadWrongQuestions()
  } catch {
    // 用户取消
  }
}

const batchMarkMastered = async () => {
  try {
    await ElMessageBox.confirm(`确定要将选中的 ${selectedQuestions.value.length} 道题目标记为已掌握吗？`, '提示', {
      type: 'warning'
    })
    
    // TODO: 调用API批量标记已掌握
    ElMessage.success('批量标记成功')
    loadWrongQuestions()
  } catch {
    // 用户取消
  }
}

const batchRemove = async () => {
  try {
    await ElMessageBox.confirm(`确定要移除选中的 ${selectedQuestions.value.length} 道错题吗？`, '提示', {
      type: 'warning'
    })
    
    // TODO: 调用API批量移除
    ElMessage.success('批量移除成功')
    loadWrongQuestions()
  } catch {
    // 用户取消
  }
}

const startPractice = () => {
  if (selectedQuestions.value.length === 0) {
    ElMessage.warning('请先选择要练习的题目')
    return
  }
  showPracticeDialog.value = true
}

const confirmPractice = () => {
  // TODO: 跳转到练习页面
  ElMessage.info('跳转到练习页面')
  showPracticeDialog.value = false
}

const saveNote = async () => {
  try {
    if (!currentQuestion.value || !currentQuestion.value.question_id) {
      ElMessage.error('错题信息异常')
      return
    }
    
    const response = await request.put(`/students/wrong-questions/${currentQuestion.value.question_id}/note`, {
      note: currentQuestion.value.note
    })
    
    if (response.success) {
      ElMessage.success('笔记已保存')
    } else {
      throw new Error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('保存笔记失败:', error)
    ElMessage.error('保存笔记失败')
  }
}

const exportWrongQuestions = () => {
  // TODO: 实现导出功能
  ElMessage.info('导出功能待实现')
}

const isCorrectOption = (optionIndex, correctAnswer) => {
  if (Array.isArray(correctAnswer)) {
    const optionLetter = String.fromCharCode(65 + optionIndex)
    return correctAnswer.includes(optionLetter)
  }
  return String.fromCharCode(65 + optionIndex) === correctAnswer
}

const getQuestionOptions = (question) => {
  if (!question || !question.options) return []
  
  // 如果options是字符串，尝试解析
  if (typeof question.options === 'string') {
    try {
      return JSON.parse(question.options)
    } catch (e) {
      console.error('解析题目选项失败:', e)
      return []
    }
  }
  
  // 如果options是数组，直接返回
  if (Array.isArray(question.options)) {
    return question.options
  }
  
  return []
}

const getOptionText = (option) => {
  // 兼容不同的选项格式
  if (typeof option === 'string') {
    return option
  }
  
  // 标准格式: {key: "A", value: "内容"}
  if (typeof option === 'object' && option.value) {
    return option.value
  }
  
  // 兼容格式: {text: "内容"}
  if (typeof option === 'object' && option.text) {
    return option.text
  }
  
  // 兼容格式: {content: "内容"}
  if (typeof option === 'object' && option.content) {
    return option.content
  }
  
  return String(option)
}

const formatCorrectAnswer = (question) => {
  if (!question || !question.correct_answer) return ''
  
  if (question.type === 'essay') {
    return question.correct_answer
  }
  
  if (question.type === 'truefalse') {
    return question.correct_answer === 'true' || question.correct_answer === 'T' ? '正确' : '错误'
  }
  
  // 单选题和多选题
  if (Array.isArray(question.correct_answer)) {
    return question.correct_answer.join(', ')
  }
  
  return question.correct_answer
}

const initCharts = async () => {
  await nextTick()
  
  // 错题类型分布图
  if (typeDistributionChart.value) {
    typeDistributionChartInstance = echarts.init(typeDistributionChart.value)
    const typeOption = {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        data: []
      }]
    }
    typeDistributionChartInstance.setOption(typeOption)
  }

  // 掌握程度统计图
  if (masteryChart.value) {
    masteryChartInstance = echarts.init(masteryChart.value)
    const masteryOption = {
      tooltip: { trigger: 'axis' },
      xAxis: {
        type: 'category',
        data: ['未掌握', '部分掌握', '已掌握']
      },
      yAxis: { type: 'value' },
      series: [{
        type: 'bar',
        data: [],
        itemStyle: {
          color: function(params) {
            const colors = ['#F56C6C', '#E6A23C', '#67C23A']
            return colors[params.dataIndex]
          }
        }
      }]
    }
    masteryChartInstance.setOption(masteryOption)
  }
}

const updateCharts = () => {
  // TODO: 根据实际数据更新图表
}

onMounted(() => {
  loadWrongQuestions()
  initCharts()
})
</script>

<style scoped>
.wrong-questions {
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

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.question-title-cell {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-text {
  flex: 1;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.question-detail {
  padding: 20px 0;
}

.question-header {
  margin-bottom: 20px;
}

.question-header h3 {
  margin: 0 0 10px 0;
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 15px;
}

.question-content {
  line-height: 1.6;
}

.question-options {
  margin: 20px 0;
}

.option-item {
  padding: 10px;
  margin: 5px 0;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.option-item.correct-option {
  background-color: #e7f5e7;
  border: 1px solid #67C23A;
}

.option-label {
  font-weight: bold;
  min-width: 20px;
}

.option-text {
  flex: 1;
}

.correct-answer,
.answer-explanation,
.personal-note,
.error-history {
  margin: 20px 0;
  padding-top: 15px;
  border-top: 1px solid #e4e7ed;
}

.correct-answer h4,
.answer-explanation h4,
.personal-note h4,
.error-history h4 {
  margin-bottom: 10px;
  color: #409EFF;
}

.error-answer {
  font-size: 12px;
  color: #F56C6C;
}
</style>
