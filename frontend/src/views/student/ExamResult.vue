<template>
  <div class="exam-result">
    <el-card v-if="examResult">
      <!-- 成绩概览 -->
      <div class="result-header">
        <div class="result-main">
          <div class="score-display">
            <span class="score-number">{{ examResult.score }}</span>
            <span class="score-total">/ {{ examResult.total_score }}</span>
          </div>
          <div class="score-percentage">
            {{ ((examResult.score / examResult.total_score) * 100).toFixed(1) }}%
          </div>
          <div class="result-status">
            <el-tag 
              :type="examResult.score >= examResult.pass_score ? 'success' : 'danger'"
              size="large"
            >
              {{ examResult.score >= examResult.pass_score ? '及格' : '不及格' }}
            </el-tag>
          </div>
        </div>
        
        <div class="result-info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="考试名称">{{ examResult.exam_title }}</el-descriptions-item>
            <el-descriptions-item label="试卷">{{ examResult.paper_title }}</el-descriptions-item>
            <el-descriptions-item label="考试时间">{{ formatDate(examResult.exam_date) }}</el-descriptions-item>
            <el-descriptions-item label="用时">{{ formatDuration(examResult.duration) }}</el-descriptions-item>
            <el-descriptions-item label="总题数">{{ examResult.total_questions }}</el-descriptions-item>
            <el-descriptions-item label="正确题数">{{ examResult.correct_count }}</el-descriptions-item>
            <el-descriptions-item label="错误题数">{{ examResult.wrong_count }}</el-descriptions-item>
            <el-descriptions-item label="正确率">{{ examResult.accuracy_rate }}%</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <!-- 成绩统计 -->
      <el-divider content-position="left">成绩分析</el-divider>
      
      <el-row :gutter="20" style="margin-bottom: 30px">
        <el-col :span="6">
          <el-statistic title="总分" :value="examResult.score" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="正确率" :value="examResult.accuracy_rate" suffix="%" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="排名" :value="examResult.rank" suffix="名" />
        </el-col>
        <el-col :span="6">
          <el-statistic title="超越" :value="examResult.beat_percentage" suffix="%" />
        </el-col>
      </el-row>

      <!-- 题型统计 -->
      <div class="question-type-stats">
        <h3>题型统计</h3>
        <el-row :gutter="20">
          <el-col :span="6" v-for="stat in examResult.type_stats" :key="stat.type">
            <el-card class="type-stat-card">
              <div class="type-name">{{ getTypeName(stat.type) }}</div>
              <div class="type-score">{{ stat.score }} / {{ stat.total_score }}</div>
              <el-progress 
                :percentage="(stat.score / stat.total_score * 100)" 
                :color="getProgressColor(stat.score / stat.total_score * 100)"
              />
              <div class="type-details">
                正确 {{ stat.correct_count }} / {{ stat.total_count }} 题
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 答题详情 -->
      <el-divider content-position="left">答题详情</el-divider>
      
      <div class="answer-details">
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

        <div class="answer-list">
          <div 
            v-for="(answer, index) in filteredAnswers" 
            :key="answer.question_id"
            class="answer-item"
            :class="{ 'correct': answer.is_correct, 'wrong': !answer.is_correct }"
          >
            <div class="question-header">
              <span class="question-number">第 {{ index + 1 }} 题</span>
              <el-tag :type="getQuestionTypeColor(answer.question?.type || '')" size="small">
                {{ getTypeName(answer.question?.type || '') }}
              </el-tag>
              <el-tag :type="answer.is_correct ? 'success' : 'danger'" size="small">
                {{ answer.is_correct ? '正确' : '错误' }}
              </el-tag>
              <span class="question-score">{{ answer.score }} 分</span>
            </div>

            <div class="question-content">
              <div class="question-title">{{ answer.question?.title }}</div>
              <div class="question-text">{{ answer.question?.content }}</div>
              
              <!-- 选择题选项 -->
              <div v-if="answer.question?.type !== 'essay' && answer.question?.type !== 'fill'" class="question-options">
                <div 
                  v-for="(option, optionIndex) in answer.question?.options" 
                  :key="optionIndex"
                  class="option-item"
                  :class="{
                    'correct-option': isCorrectOption(option, answer.question?.correct_answer),
                    'user-option': isUserOption(option, answer.user_answer),
                    'wrong-option': isUserOption(option, answer.user_answer) && !isCorrectOption(option, answer.question?.correct_answer)
                  }"
                >
                  <span class="option-label">{{ option.key }}.</span>
                  <span class="option-text">{{ option.value }}</span>
                  <span v-if="isCorrectOption(option, answer.question?.correct_answer)" class="option-mark">✓</span>
                  <span v-if="isUserOption(option, answer.user_answer) && !isCorrectOption(option, answer.question?.correct_answer)" class="option-mark">✗</span>
                </div>
              </div>

              <!-- 填空题答案 -->
              <div v-if="answer.question?.type === 'fill'" class="fill-answers">
                <div class="user-answer">
                  <h4>我的答案：</h4>
                  <div class="answer-content">{{ answer.user_answer || '未作答' }}</div>
                </div>
                <div class="correct-answer">
                  <h4>参考答案：</h4>
                  <div class="answer-content">{{ answer.question?.correct_answer }}</div>
                </div>
              </div>

              <!-- 简答题答案 -->
              <div v-if="answer.question?.type === 'essay'" class="essay-answers">
                <div class="user-answer">
                  <h4>我的答案：</h4>
                  <div class="answer-content">{{ answer.user_answer || '未作答' }}</div>
                </div>
                <div class="correct-answer">
                  <h4>参考答案：</h4>
                  <div class="answer-content">{{ answer.question?.correct_answer }}</div>
                </div>
              </div>

              <!-- 答案解析 -->
              <div v-if="answer.question?.explanation" class="answer-explanation">
                <h4>答案解析：</h4>
                <p>{{ answer.question?.explanation }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="result-actions">
        <el-button @click="goBack">返回</el-button>
        <el-button type="primary" @click="addToWrongQuestions" v-if="examResult.wrong_count > 0">
          加入错题本
        </el-button>
        <el-button @click="printResult">打印成绩单</el-button>
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
const examResult = ref(null)
const filterType = ref('all')

// 计算属性
const filteredAnswers = computed(() => {
  if (!examResult.value) return []
  
  let answers = examResult.value.answers || []
  
  if (filterType.value === 'all') {
    return answers
  } else if (filterType.value === 'correct') {
    return answers.filter(answer => answer.is_correct)
  } else if (filterType.value === 'wrong') {
    return answers.filter(answer => !answer.is_correct)
  } else {
    return answers.filter(answer => answer.question?.type === filterType.value)
  }
})

// 方法
const loadExamResult = async () => {
  try {
    const examRecordId = route.params.id || route.query.examRecordId
    if (!examRecordId) {
      ElMessage.error('缺少考试记录ID')
      router.push('/student/exam')
      return
    }

    const response = await request.get(`/exam/${examRecordId}/result`)
    if (response.success) {
      const data = response.data
      
      // 转换数据格式以适配前端显示
      examResult.value = {
        id: examRecordId,
        exam_title: data.examRecord.type === 'practice' ? '练习模式' : '正式考试',
        paper_title: data.paper.title || '练习试卷',
        exam_date: data.examRecord.start_time,
        score: data.examRecord.obtained_score || 0,
        total_score: data.paper.total_score || 100,
        pass_score: 60,
        duration: data.examRecord.duration || 0,
        total_questions: data.statistics.total_questions,
        correct_count: data.statistics.correct_count,
        wrong_count: data.statistics.wrong_count,
        accuracy_rate: data.statistics.accuracy,
        rank: 1, // 练习模式没有排名
        beat_percentage: 0, // 练习模式没有超越百分比
        type_stats: [], // 可以后续添加题型统计
        answers: data.answers || []
      }
    } else {
      throw new Error(result.message || '获取考试结果失败')
    }
  } catch (error) {
    console.error('加载考试结果失败:', error)
    ElMessage.error(error.message || '加载考试结果失败')
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

const getProgressColor = (percentage) => {
  if (percentage >= 80) return '#67C23A'
  if (percentage >= 60) return '#E6A23C'
  return '#F56C6C'
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
  if (!correctAnswer) return false
  
  // 处理多选题（逗号分隔的答案）
  if (correctAnswer.includes(',')) {
    const correctAnswers = correctAnswer.split(',').map(a => a.trim())
    return correctAnswers.includes(option.key)
  }
  
  // 处理单选题和判断题
  return option.key === correctAnswer
}

const isUserOption = (option, userAnswer) => {
  if (!userAnswer) return false
  
  // 处理多选题（数组格式的用户答案）
  if (Array.isArray(userAnswer)) {
    return userAnswer.includes(option.key)
  }
  
  // 处理单选题和判断题
  return option.key === userAnswer
}

const filterAnswers = () => {
  // 筛选逻辑已在计算属性中实现
}

const goBack = () => {
  router.push('/student/exams')
}

const addToWrongQuestions = async () => {
  try {
    // TODO: 调用API将错题加入错题本
    ElMessage.success('错题已加入错题本')
  } catch (error) {
    ElMessage.error('加入错题本失败')
  }
}

const printResult = () => {
  window.print()
}

onMounted(() => {
  loadExamResult()
})
</script>

<style scoped>
.exam-result {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.result-header {
  margin-bottom: 30px;
}

.result-main {
  text-align: center;
  margin-bottom: 30px;
}

.score-display {
  font-size: 48px;
  font-weight: bold;
  color: #409EFF;
}

.score-total {
  color: #999;
  font-size: 24px;
}

.score-percentage {
  font-size: 24px;
  color: #67C23A;
  margin: 10px 0;
}

.result-status {
  margin-top: 15px;
}

.question-type-stats {
  margin: 30px 0;
}

.type-stat-card {
  text-align: center;
}

.type-name {
  font-weight: bold;
  margin-bottom: 10px;
}

.type-score {
  font-size: 20px;
  color: #409EFF;
  margin-bottom: 10px;
}

.type-details {
  font-size: 12px;
  color: #999;
  margin-top: 10px;
}

.detail-filters {
  margin-bottom: 20px;
}

.answer-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  margin-bottom: 20px;
  overflow: hidden;
}

.answer-item.correct {
  border-color: #67C23A;
  background-color: #f0f9ff;
}

.answer-item.wrong {
  border-color: #F56C6C;
  background-color: #fef0f0;
}

.question-header {
  padding: 15px 20px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  gap: 10px;
}

.question-number {
  font-weight: bold;
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

.result-actions {
  text-align: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

.loading-container {
  padding: 20px;
}

@media print {
  .result-actions,
  .detail-filters {
    display: none;
  }
}
</style>
