<template>
  <div class="exam-review">
    <el-card v-if="examData">
      <!-- 考试信息头部 -->
      <div class="review-header">
        <h2>{{ examData.paper.title }} - 答题解析</h2>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="考试类型">
            {{ examData.examRecord.type === 'practice' ? '练习模式' : '正式考试' }}
          </el-descriptions-item>
          <el-descriptions-item label="考试时间">
            {{ formatDate(examData.examRecord.start_time) }}
          </el-descriptions-item>
          <el-descriptions-item label="用时">
            {{ formatDuration(examData.examRecord.duration) }}
          </el-descriptions-item>
          <el-descriptions-item label="得分">
            {{ examData.examRecord.obtained_score }} / {{ examData.paper.total_score }}
          </el-descriptions-item>
          <el-descriptions-item label="正确率">
            {{ examData.statistics.accuracy }}%
          </el-descriptions-item>
          <el-descriptions-item label="题目数量">
            {{ examData.statistics.total_questions }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 筛选器 -->
      <el-divider content-position="left">答题详情</el-divider>
      
      <div class="detail-filters">
        <el-radio-group v-model="filterType" @change="filterAnswers">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="correct">正确</el-radio-button>
          <el-radio-button label="wrong">错误</el-radio-button>
          <el-radio-button label="single">单选题</el-radio-button>
          <el-radio-button label="multiple">多选题</el-radio-button>
          <el-radio-button label="truefalse">判断题</el-radio-button>
          <el-radio-button label="fill">填空题</el-radio-button>
          <el-radio-button label="essay">简答题</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 答题详情列表 -->
      <div class="answer-list">
        <div 
          v-for="(answer, index) in filteredAnswers" 
          :key="answer.question_id"
          class="answer-item"
          :class="{ 'correct': answer.is_correct, 'wrong': !answer.is_correct }"
        >
          <div class="question-header">
            <span class="question-number">第 {{ getQuestionNumber(answer) }} 题</span>
            <el-tag :type="getQuestionTypeColor(answer.type)" size="small">
              {{ getTypeName(answer.type) }}
            </el-tag>
            <el-tag :type="answer.is_correct ? 'success' : 'danger'" size="small">
              {{ answer.is_correct ? '正确' : '错误' }}
            </el-tag>
            <span class="question-score">{{ answer.score }} 分</span>
          </div>

          <div class="question-content">
            <div class="question-title">{{ answer.title }}</div>
            <div class="question-text">{{ answer.content }}</div>
            
            <!-- 选择题选项 -->
            <div v-if="answer.type !== 'essay' && answer.type !== 'fill'" class="question-options">
              <div 
                v-for="(option, optionIndex) in answer.options" 
                :key="optionIndex"
                class="option-item"
                :class="{
                  'correct-option': isCorrectOption(option, answer.correct_answer),
                  'user-option': isUserOption(option, answer.user_answer),
                  'wrong-option': isUserOption(option, answer.user_answer) && !isCorrectOption(option, answer.correct_answer)
                }"
              >
                <span class="option-label">{{ option.key }}.</span>
                <span class="option-text">{{ option.value }}</span>
                <span v-if="isCorrectOption(option, answer.correct_answer)" class="option-mark">✓</span>
                <span v-if="isUserOption(option, answer.user_answer) && !isCorrectOption(option, answer.correct_answer)" class="option-mark">✗</span>
              </div>
            </div>

            <!-- 填空题答案 -->
            <div v-if="answer.type === 'fill'" class="fill-answers">
              <div class="user-answer">
                <h4>我的答案：</h4>
                <div class="answer-content">{{ answer.user_answer || '未作答' }}</div>
              </div>
              <div class="correct-answer">
                <h4>参考答案：</h4>
                <div class="answer-content">{{ answer.correct_answer }}</div>
              </div>
            </div>

            <!-- 简答题答案 -->
            <div v-if="answer.type === 'essay'" class="essay-answers">
              <div class="user-answer">
                <h4>我的答案：</h4>
                <div class="answer-content">{{ answer.user_answer || '未作答' }}</div>
              </div>
              <div class="correct-answer">
                <h4>参考答案：</h4>
                <div class="answer-content">{{ answer.correct_answer }}</div>
              </div>
            </div>

            <!-- 答案解析 -->
            <div v-if="answer.explanation" class="answer-explanation">
              <h4>答案解析：</h4>
              <p>{{ answer.explanation }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="review-actions">
        <el-button @click="goBack">返回</el-button>
        <el-button type="primary" @click="addToWrongQuestions" v-if="wrongAnswers.length > 0">
          将错题加入错题本
        </el-button>
      </div>
    </el-card>

    <!-- 加载状态 -->
    <div v-else class="loading-container">
      <el-skeleton :rows="10" animated />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

// 响应式数据
const examData = ref(null)
const filterType = ref('all')

// 计算属性
const filteredAnswers = computed(() => {
  if (!examData.value) return []
  
  let answers = examData.value.answers || []
  
  if (filterType.value === 'all') {
    return answers
  } else if (filterType.value === 'correct') {
    return answers.filter(answer => answer.is_correct)
  } else if (filterType.value === 'wrong') {
    return answers.filter(answer => !answer.is_correct)
  } else {
    return answers.filter(answer => answer.type === filterType.value)
  }
})

const wrongAnswers = computed(() => {
  if (!examData.value) return []
  return examData.value.answers.filter(answer => !answer.is_correct)
})

// 方法
const loadExamData = async () => {
  try {
    const examRecordId = route.params.examRecordId
    if (!examRecordId) {
      ElMessage.error('缺少考试记录ID')
      router.push('/student/exams')
      return
    }

    const response = await request.get(`/exam/${examRecordId}/result`)
    if (response.success) {
      examData.value = response.data
    } else {
      throw new Error(response.message || '获取考试数据失败')
    }
  } catch (error) {
    console.error('加载考试数据失败:', error)
    ElMessage.error(error.message || '加载考试数据失败')
  }
}

const getTypeName = (type) => {
  const typeMap = {
    single: '单选题',
    multiple: '多选题',
    truefalse: '判断题',
    fill: '填空题',
    essay: '简答题'
  }
  return typeMap[type] || type
}

const getQuestionTypeColor = (type) => {
  const colorMap = {
    single: 'primary',
    multiple: 'success',
    truefalse: 'warning',
    fill: 'info',
    essay: 'info'
  }
  return colorMap[type] || 'primary'
}

const getQuestionNumber = (answer) => {
  if (!examData.value) return 0
  const index = examData.value.answers.findIndex(a => a.question_id === answer.question_id)
  return index + 1
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const formatDuration = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟${secs}秒`
  } else if (minutes > 0) {
    return `${minutes}分钟${secs}秒`
  } else {
    return `${secs}秒`
  }
}

const isCorrectOption = (option, correctAnswer) => {
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.includes(option.key)
  }
  return correctAnswer && correctAnswer.split(',').includes(option.key)
}

const isUserOption = (option, userAnswer) => {
  if (!userAnswer) return false
  
  // 处理多选题的情况
  if (userAnswer === '[object Object]') return false
  
  if (Array.isArray(userAnswer)) {
    return userAnswer.includes(option.key)
  }
  
  // 处理字符串形式的答案
  const answers = userAnswer.toString().split(',').map(a => a.trim())
  return answers.includes(option.key)
}

const filterAnswers = () => {
  // 筛选逻辑已在computed中处理
}

const goBack = () => {
  router.go(-1)
}

const addToWrongQuestions = async () => {
  try {
    const wrongQuestionIds = wrongAnswers.value.map(answer => answer.question_id)
    
    const response = await request.post('/wrong-questions/batch', {
      question_ids: wrongQuestionIds
    })
    
    if (response.success) {
      ElMessage.success('错题已加入错题本')
    } else {
      throw new Error(response.message || '加入错题本失败')
    }
  } catch (error) {
    console.error('加入错题本失败:', error)
    ElMessage.error(error.message || '加入错题本失败')
  }
}

// 生命周期
onMounted(() => {
  loadExamData()
})
</script>

<style scoped>
.exam-review {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.review-header {
  margin-bottom: 30px;
}

.review-header h2 {
  margin-bottom: 20px;
  color: #303133;
}

.detail-filters {
  margin: 20px 0;
  text-align: center;
}

.answer-list {
  margin-top: 20px;
}

.answer-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 20px;
  overflow: hidden;
}

.answer-item.correct {
  border-color: #67C23A;
}

.answer-item.wrong {
  border-color: #F56C6C;
}

.question-header {
  background-color: #f5f7fa;
  padding: 15px 20px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 10px;
}

.question-number {
  font-weight: bold;
  color: #303133;
}

.question-score {
  margin-left: auto;
  font-weight: bold;
  color: #409EFF;
}

.question-content {
  padding: 20px;
}

.question-title {
  font-weight: bold;
  margin-bottom: 10px;
}

.question-text {
  margin-bottom: 15px;
  line-height: 1.6;
}

.question-options {
  margin: 15px 0;
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

.option-item.wrong-option {
  background-color: #fde7e7;
  border: 1px solid #F56C6C;
}

.option-item.user-option:not(.wrong-option) {
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

.option-mark {
  font-weight: bold;
  margin-left: auto;
}

.fill-answers,
.essay-answers {
  margin: 15px 0;
}

.user-answer,
.correct-answer {
  margin: 15px 0;
}

.user-answer h4,
.correct-answer h4 {
  margin-bottom: 10px;
  color: #409EFF;
}

.answer-content {
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
  line-height: 1.6;
}

.answer-explanation {
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e4e7ed;
}

.answer-explanation h4 {
  margin-bottom: 10px;
  color: #909399;
}

.review-actions {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.loading-container {
  padding: 20px;
}
</style>
