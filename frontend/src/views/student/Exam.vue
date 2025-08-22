<template>
  <div class="exam-container">
    <!-- 考试头部信息 -->
    <div class="exam-header">
      <div class="exam-info">
        <h2>{{ examInfo.paperTitle }}</h2>
        <p>总分：{{ examInfo.totalScore }}分 | 题目数量：{{ examInfo.totalQuestions }}题</p>
      </div>
      <div class="exam-timer">
        <div class="timer-display" :class="{ 'timer-warning': timeWarning }">
          <el-icon><Clock /></el-icon>
          <span v-if="examInfo.type === 'practice'">练习模式</span>
          <span v-else>{{ formatTime(remainingTime) }}</span>
        </div>
      </div>
    </div>

    <!-- 考试内容 -->
    <div class="exam-content">
      <el-row :gutter="20">
        <!-- 题目区域 -->
        <el-col :span="18">
          <el-card class="question-card" v-if="currentQuestion">
            <div class="question-header">
              <div class="question-nav">
                <el-button 
                  :disabled="currentQuestionIndex === 0"
                  @click="prevQuestion"
                >
                  <el-icon><ArrowLeft /></el-icon>
                  上一题
                </el-button>
                <span class="question-counter">
                  {{ currentQuestionIndex + 1 }} / {{ questions.length }}
                </span>
                <el-button 
                  :disabled="currentQuestionIndex === questions.length - 1"
                  @click="nextQuestion"
                >
                  下一题
                  <el-icon><ArrowRight /></el-icon>
                </el-button>
              </div>
            </div>

            <div class="question-content">
              <div class="question-info">
                <el-tag :type="getQuestionTypeColor(currentQuestion.type)">
                  {{ getQuestionTypeText(currentQuestion.type) }}
                </el-tag>
                <span class="question-score">{{ currentQuestion.score }}分</span>
              </div>

              <div class="question-title">
                <h3>{{ currentQuestionIndex + 1 }}. {{ currentQuestion.content }}</h3>
              </div>

              <!-- 单选题 -->
              <div v-if="currentQuestion.type === 'single'" class="question-options">
                <el-radio-group 
                  v-model="answers[currentQuestion.id]" 
                  @change="saveAnswer"
                >
                  <el-radio 
                    v-for="(option, index) in getQuestionOptions(currentQuestion)" 
                    :key="index"
                    :label="option.key"
                    class="option-item"
                  >
                    {{ option.key }}. {{ option.value }}
                  </el-radio>
                </el-radio-group>
              </div>

              <!-- 多选题 -->
              <div v-else-if="currentQuestion.type === 'multiple'" class="question-options">
                <el-checkbox-group 
                  v-model="answers[currentQuestion.id]" 
                  @change="saveAnswer"
                >
                  <el-checkbox 
                    v-for="(option, index) in getQuestionOptions(currentQuestion)" 
                    :key="index"
                    :label="option.key"
                    class="option-item"
                  >
                    {{ option.key }}. {{ option.value }}
                  </el-checkbox>
                </el-checkbox-group>
              </div>

              <!-- 判断题 -->
              <div v-else-if="currentQuestion.type === 'truefalse'" class="question-options">
                <el-radio-group 
                  v-model="answers[currentQuestion.id]" 
                  @change="saveAnswer"
                >
                  <el-radio 
                    v-for="(option, index) in getQuestionOptions(currentQuestion)" 
                    :key="index"
                    :label="option.key"
                    class="option-item"
                  >
                    {{ option.key }}. {{ option.value }}
                  </el-radio>
                </el-radio-group>
              </div>

              <!-- 简答题 -->
              <div v-else-if="currentQuestion.type === 'essay'" class="question-options">
                <el-input
                  v-model="answers[currentQuestion.id]"
                  type="textarea"
                  :rows="8"
                  placeholder="请输入您的答案..."
                  @blur="saveAnswer"
                />
                <div class="word-count">
                  字数：{{ (answers[currentQuestion.id] || '').length }}
                </div>
              </div>

              <!-- 填空题 -->
              <div v-else-if="currentQuestion.type === 'fill'" class="question-options">
                <div class="fill-question">
                  <div class="fill-inputs">
                    <!-- 根据题目内容中的空格数量渲染多个输入框 -->
                    <div v-if="getFillBlanksCount(currentQuestion) > 1" class="multiple-fill-inputs">
                      <div v-for="(blank, index) in getFillBlanksCount(currentQuestion)" :key="index" class="fill-input-item">
                        <label class="fill-label">第{{ index + 1 }}空：</label>
                        <el-input
                          v-model="fillAnswers[currentQuestion.id][index]"
                          :placeholder="`请填写第${index + 1}个空格的答案`"
                          @blur="updateFillAnswer"
                          size="small"
                          style="width: 200px;"
                        />
                      </div>
                      <div class="fill-tip">
                        <el-tag size="small" type="info">
                          提示：每个空格单独填写，系统会自动合并答案
                        </el-tag>
                      </div>
                    </div>
                    
                    <!-- 单个填空或使用传统输入方式 -->
                    <div v-else class="single-fill-input">
                      <el-input
                        v-model="answers[currentQuestion.id]"
                        placeholder="请输入答案，多个空格可用 || 或中文逗号分隔..."
                        @blur="saveAnswer"
                      />
                      <div class="fill-tip">
                        <el-tag size="small" type="info">
                          提示：多个空格答案可用 || 或中文逗号（，）分隔
                        </el-tag>
                        <el-tag size="small" type="success" style="margin-left: 8px;">
                          推荐用 || 分隔，如：var||let||const
                        </el-tag>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <!-- 答题卡 -->
        <el-col :span="6">
          <el-card class="answer-sheet">
            <template #header>
              <span>答题卡</span>
            </template>
            
            <div class="answer-grid">
              <div 
                v-for="(question, index) in questions" 
                :key="question.id"
                class="answer-item"
                :class="{
                  'current': index === currentQuestionIndex,
                  'answered': isAnswered(question.id),
                  'unanswered': !isAnswered(question.id)
                }"
                @click="goToQuestion(index)"
              >
                {{ index + 1 }}
              </div>
            </div>

            <div class="answer-stats">
              <div class="stat-item">
                <span class="stat-label">已答：</span>
                <span class="stat-value answered-count">{{ answeredCount }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">未答：</span>
                <span class="stat-value unanswered-count">{{ questions.length - answeredCount }}</span>
              </div>
            </div>

            <div class="exam-actions">
              <el-button 
                type="success" 
                size="large" 
                class="submit-button"
                @click="submitExam"
              >
                <el-icon><Check /></el-icon>
                提交试卷
              </el-button>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Clock, ArrowLeft, ArrowRight, Check
} from '@element-plus/icons-vue'
import { examAPI } from '@/api/exam'

const router = useRouter()
const route = useRoute()

// 考试基本信息
const examInfo = ref({})
const questions = ref([])
const answers = reactive({})

// 填空题专用答案存储（支持多个输入框）
const fillAnswers = reactive({})

// 当前题目
const currentQuestionIndex = ref(0)
const currentQuestion = computed(() => questions.value[currentQuestionIndex.value])

// 计时器
const remainingTime = ref(0)
const timer = ref(null)
const timeWarning = computed(() => remainingTime.value <= 300) // 最后5分钟警告

// 已答题数量
const answeredCount = computed(() => {
  return Object.keys(answers).filter(questionId => {
    const answer = answers[questionId]
    if (Array.isArray(answer)) {
      return answer.length > 0
    }
    return answer !== null && answer !== undefined && answer !== ''
  }).length
})

// 获取考试信息
const getExamInfo = async () => {
  try {
    const examRecordId = route.params.id
    console.log('正在获取考试详情，ID:', examRecordId)
    
    const response = await examAPI.getExamDetail(examRecordId)
    console.log('考试详情响应:', response)
    
    if (response.success && response.data) {
      const examData = response.data
      
      // 检查考试状态（练习模式不检查completed/timeout状态）
      // 只有当考试确实已经完成且有结束时间时才跳转
      if (examData.type === 'exam' && (examData.status === 'completed' || examData.status === 'timeout') && examData.end_time) {
        ElMessage.warning('考试已结束，正在跳转到结果页面...')
        router.push(`/student/result/${examRecordId}`)
        return
      }
      
      // 设置考试基本信息
      examInfo.value = {
        paperTitle: examData.paper.title,
        description: examData.paper.description,
        duration: examData.paper.duration,
        totalScore: examData.paper.total_score,
        totalQuestions: examData.questions ? examData.questions.length : 0,
        type: examData.type // 添加考试类型
      }
      
      // 设置题目列表
      questions.value = examData.questions || []
      console.log('题目列表:', questions.value)
      
      // 设置已保存的答案
      if (examData.questions) {
        examData.questions.forEach(q => {
          if (q.user_answer) {
            answers[q.id] = q.user_answer
            
            // 如果是填空题，初始化多输入框答案数组
            if (q.type === 'fill') {
              const blanksCount = getFillBlanksCount(q)
              initFillAnswers(q.id, blanksCount)
              
              // 如果有已保存的答案，拆分到各个输入框
              if (q.user_answer) {
                const separators = ['||', '，', ',']
                let splitAnswers = [q.user_answer]
                
                for (const sep of separators) {
                  if (q.user_answer.includes(sep)) {
                    splitAnswers = q.user_answer.split(sep).map(a => a.trim())
                    break
                  }
                }
                
                // 将拆分后的答案填入对应的输入框
                splitAnswers.forEach((answer, index) => {
                  if (index < fillAnswers[q.id].length) {
                    fillAnswers[q.id][index] = answer
                  }
                })
              }
            }
          } else if (q.type === 'fill') {
            // 没有保存答案的填空题也要初始化
            const blanksCount = getFillBlanksCount(q)
            initFillAnswers(q.id, blanksCount)
          }
        })
      }
      
      // 计算剩余时间（只对正式考试计时）
      if (examData.type === 'exam' && examData.start_time && examInfo.value.duration) {
        const startTime = new Date(examData.start_time)
        const duration = examInfo.value.duration * 60 * 1000 // 转换为毫秒
        const elapsed = Date.now() - startTime.getTime()
        remainingTime.value = Math.max(0, Math.floor((duration - elapsed) / 1000))
        
        console.log('正式考试 - 开始时间:', examData.start_time)
        console.log('考试时长(分钟):', examInfo.value.duration)
        console.log('已过时间(秒):', Math.floor(elapsed / 1000))
        console.log('剩余时间(秒):', remainingTime.value)
        
        // 如果时间已到，自动提交并跳转
        if (remainingTime.value === 0) {
          ElMessage.warning('考试时间已到，正在自动提交...')
          await autoSubmitExam()
          return
        }
      } else if (examData.type === 'practice') {
        // 练习模式不计时
        remainingTime.value = examInfo.value.duration * 60 // 显示总时长但不倒计时
        console.log('练习模式 - 不启用计时器')
      } else {
        // 如果没有开始时间，使用默认时长
        remainingTime.value = (examInfo.value.duration || 60) * 60
        console.log('使用默认时长:', remainingTime.value, '秒')
      }
      
      console.log('剩余时间:', remainingTime.value)
      
      // 只对正式考试启用计时器
      if (examInfo.value.type === 'exam') {
        startTimer()
      } else {
        console.log('练习模式不启用计时器')
      }
    } else {
      console.error('响应格式错误:', response)
      ElMessage.error(response.message || '获取考试信息失败')
      router.push('/student/exams')
    }
  } catch (error) {
    console.error('获取考试信息失败:', error)
    ElMessage.error('获取考试信息失败')
    router.push('/student/exams')
  }
}

// 开始计时器
const startTimer = () => {
  timer.value = setInterval(() => {
    remainingTime.value--
    
    if (remainingTime.value <= 0) {
      clearInterval(timer.value)
      autoSubmitExam()
    }
  }, 1000)
}

// 格式化时间显示
const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

// 获取题型颜色
const getQuestionTypeColor = (type) => {
  const colorMap = {
    'single': 'primary',
    'multiple': 'success',
    'truefalse': 'warning',
    'essay': 'danger',
    'fill': 'info'
  }
  return colorMap[type] || ''
}

// 获取题型文本
const getQuestionTypeText = (type) => {
  const textMap = {
    'single': '单选题',
    'multiple': '多选题',
    'truefalse': '判断题',
    'essay': '简答题',
    'fill': '填空题'
  }
  return textMap[type] || '未知题型'
}

// 处理题目选项格式
const getQuestionOptions = (question) => {
  if (!question || !question.options) {
    return []
  }
  
  try {
    // 如果是字符串，先解析为JSON
    let options = question.options
    if (typeof options === 'string') {
      options = JSON.parse(options)
    }
    
    // 如果是对象数组格式，直接返回
    if (Array.isArray(options) && options.length > 0 && typeof options[0] === 'object') {
      return options
    }
    
    // 如果是简单数组，转换为对象格式
    if (Array.isArray(options)) {
      return options.map((option, index) => ({
        key: String.fromCharCode(65 + index),
        value: option
      }))
    }
    
    return []
  } catch (error) {
    console.error('解析题目选项失败:', error, question.options)
    return []
  }
}

// 检查题目是否已答
const isAnswered = (questionId) => {
  const answer = answers[questionId]
  if (Array.isArray(answer)) {
    return answer.length > 0
  }
  return answer !== null && answer !== undefined && answer !== ''
}

// 获取填空题的空格数量
const getFillBlanksCount = (question) => {
  if (!question || question.type !== 'fill') return 1
  
  // 尝试从题目内容中计算空格数量
  const content = question.content || ''
  
  // 方法1：统计______（下划线）的数量
  const underscoreMatches = content.match(/_{2,}/g)
  if (underscoreMatches && underscoreMatches.length > 0) {
    return underscoreMatches.length
  }
  
  // 方法2：统计()或（）括号的数量
  const bracketMatches = content.match(/\([^)]*\)|（[^）]*）/g)
  if (bracketMatches && bracketMatches.length > 0) {
    return bracketMatches.length
  }
  
  // 方法3：从正确答案推断空格数量
  if (question.correct_answer) {
    const separators = ['||', '，', ',']
    for (const sep of separators) {
      if (question.correct_answer.includes(sep)) {
        return question.correct_answer.split(sep).length
      }
    }
  }
  
  // 默认为1个空格
  return 1
}

// 初始化填空题答案数组
const initFillAnswers = (questionId, blanksCount) => {
  if (!fillAnswers[questionId]) {
    fillAnswers[questionId] = new Array(blanksCount).fill('')
  }
}

// 更新填空题答案
const updateFillAnswer = () => {
  const questionId = currentQuestion.value.id
  const fillAnswerArray = fillAnswers[questionId] || []
  
  // 将多个输入框的答案合并为一个字符串，用||分隔
  const combinedAnswer = fillAnswerArray.filter(answer => answer.trim() !== '').join('||')
  answers[questionId] = combinedAnswer
  
  // 保存答案
  saveAnswer()
}

// 保存答案
const saveAnswer = async () => {
  try {
    const examRecordId = route.params.id
    const questionId = currentQuestion.value.id
    const answer = answers[questionId]
    
    // 如果答案为空，不需要发送请求
    if (answer === null || answer === undefined || answer === '' || 
        (Array.isArray(answer) && answer.length === 0)) {
      return
    }
    
    await examAPI.saveAnswer({
      examRecordId: parseInt(examRecordId),
      questionId: parseInt(questionId),
      answer: answer
    })
  } catch (error) {
    console.error('保存答案失败:', error)
    // 不显示错误消息，避免干扰用户
  }
}

// 上一题
const prevQuestion = () => {
  if (currentQuestionIndex.value > 0) {
    currentQuestionIndex.value--
  }
}

// 下一题
const nextQuestion = () => {
  if (currentQuestionIndex.value < questions.value.length - 1) {
    currentQuestionIndex.value++
  }
}

// 跳转到指定题目
const goToQuestion = (index) => {
  currentQuestionIndex.value = index
}

// 提交考试
const submitExam = async () => {
  try {
    const unansweredCount = questions.value.length - answeredCount.value
    let confirmMessage = '确定要提交试卷吗？'
    
    if (unansweredCount > 0) {
      confirmMessage = `还有 ${unansweredCount} 道题未答，确定要提交试卷吗？`
    }
    
    await ElMessageBox.confirm(confirmMessage, '提交试卷', {
      confirmButtonText: '确定提交',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await doSubmitExam()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('提交试卷失败:', error)
      ElMessage.error('提交试卷失败')
    }
  }
}

// 执行提交
const doSubmitExam = async () => {
  try {
    const examRecordId = route.params.id
    const response = await examAPI.submitExam(parseInt(examRecordId))
    
    if (response.success && response.code === 200) {
      clearInterval(timer.value)
      ElMessage.success('试卷提交成功')
      router.push(`/student/result/${examRecordId}`)
    } else {
      throw new Error(response.message || '提交失败')
    }
  } catch (error) {
    console.error('提交试卷失败:', error)
    ElMessage.error('提交试卷失败')
  }
}

// 自动提交（时间到）
const autoSubmitExam = async () => {
  try {
    ElMessage.warning('考试时间已到，系统将自动提交试卷')
    clearInterval(timer.value)
    
    const examRecordId = route.params.id
    const response = await examAPI.submitExam(parseInt(examRecordId))
    
    if (response.success && response.code === 200) {
      ElMessage.success('试卷已自动提交')
      router.push(`/student/result/${examRecordId}`)
    } else {
      // 如果提交失败，直接跳转到结果页面
      ElMessage.warning('考试已结束，正在跳转到结果页面...')
      router.push(`/student/result/${examRecordId}`)
    }
  } catch (error) {
    console.error('自动提交失败:', error)
    // 即使提交失败也要跳转到结果页面
    ElMessage.warning('考试已结束，正在跳转到结果页面...')
    const examRecordId = route.params.id
    router.push(`/student/result/${examRecordId}`)
  }
}

// 页面离开确认
const handleBeforeUnload = (e) => {
  const confirmationMessage = '确定要离开考试页面吗？未保存的答案可能会丢失。'
  e.returnValue = confirmationMessage
  return confirmationMessage
}

onMounted(() => {
  getExamInfo()
  window.addEventListener('beforeunload', handleBeforeUnload)
})

onBeforeUnmount(() => {
  if (timer.value) {
    clearInterval(timer.value)
  }
  window.removeEventListener('beforeunload', handleBeforeUnload)
})
</script>

<style scoped>
.exam-container {
  min-height: 100vh;
  background: #f5f5f5;
}

.exam-header {
  background: white;
  padding: 20px;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.exam-info h2 {
  margin: 0 0 8px 0;
  color: #333;
  font-size: 24px;
}

.exam-info p {
  margin: 0;
  color: #666;
  font-size: 14px;
}

.timer-display {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #333;
  padding: 8px 16px;
  background: #f0f9ff;
  border-radius: 8px;
  border: 2px solid #0ea5e9;
}

.timer-warning {
  color: #dc2626;
  background: #fef2f2;
  border-color: #dc2626;
}

.exam-content {
  padding: 20px;
}

.question-card {
  margin-bottom: 20px;
}

.question-header {
  margin-bottom: 20px;
}

.question-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-counter {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.question-content {
  margin-top: 20px;
}

.question-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.question-score {
  color: #f56c6c;
  font-weight: 500;
}

.question-title h3 {
  margin: 0 0 20px 0;
  color: #333;
  line-height: 1.6;
  font-size: 16px;
}

.question-options {
  margin-left: 20px;
}

.option-item {
  display: block;
  margin-bottom: 12px;
  line-height: 1.6;
}

.word-count {
  text-align: right;
  color: #999;
  font-size: 12px;
  margin-top: 8px;
}

.answer-sheet {
  position: sticky;
  top: 20px;
}

.answer-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.answer-item {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #e6e6e6;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
}

.answer-item.current {
  border-color: #409eff;
  background: #409eff;
  color: white;
}

.answer-item.answered {
  border-color: #67c23a;
  background: #67c23a;
  color: white;
}

.answer-item.unanswered {
  border-color: #e6e6e6;
  background: white;
  color: #666;
}

.answer-item:hover {
  border-color: #409eff;
}

.answer-stats {
  margin-bottom: 20px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.stat-item:last-child {
  margin-bottom: 0;
}

.stat-label {
  color: #666;
}

.answered-count {
  color: #67c23a;
  font-weight: 500;
}

.unanswered-count {
  color: #f56c6c;
  font-weight: 500;
}

.submit-button {
  width: 100%;
  height: 44px;
  font-size: 16px;
  font-weight: 500;
}

/* 填空题样式 */
.fill-question {
  width: 100%;
}

.fill-inputs {
  margin-bottom: 15px;
}

.multiple-fill-inputs {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fill-input-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fill-label {
  min-width: 60px;
  color: #666;
  font-weight: 500;
}

.single-fill-input {
  width: 100%;
}

.fill-tip {
  margin-top: 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .exam-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .exam-content {
    padding: 10px;
  }
  
  .answer-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
