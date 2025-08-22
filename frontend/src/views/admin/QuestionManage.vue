<template>
  <div class="question-manage">
    <el-card class="page-header">
      <template #header>
        <div class="header-content">
          <h2>题库管理</h2>
          <div class="header-actions">
            <el-button type="primary" @click="showAddDialog = true">
              <el-icon><Plus /></el-icon>
              添加题目
            </el-button>
            <el-button type="success" @click="showImportDialog = true">
              <el-icon><Upload /></el-icon>
              批量导入
            </el-button>
            <el-button @click="exportQuestions">
              <el-icon><Download /></el-icon>
              导出题目
            </el-button>
            <el-button @click="showFileManageDialog = true">
              <el-icon><Folder /></el-icon>
              文件管理
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <div class="filter-section">
        <el-form :model="filterForm" inline>
          <el-form-item label="题目类型">
            <el-select v-model="filterForm.type" placeholder="全部类型" clearable style="width: 150px">
              <el-option label="单选题" value="single" />
              <el-option label="多选题" value="multiple" />
              <el-option label="判断题" value="truefalse" />
              <el-option label="简答题" value="essay" />
              <el-option label="填空题" value="fill" />
            </el-select>
          </el-form-item>
          <el-form-item label="难度">
            <el-select v-model="filterForm.difficulty" placeholder="全部难度" clearable style="width: 120px">
              <el-option label="简单" :value="1" />
              <el-option label="普通" :value="2" />
              <el-option label="困难" :value="3" />
            </el-select>
          </el-form-item>
          <el-form-item label="题目内容">
            <el-input v-model="filterForm.keyword" placeholder="输入题目内容关键词" clearable @keyup.enter="searchByContent" style="width: 220px" />
          </el-form-item>
          <el-form-item label="科目">
            <el-input v-model="filterForm.subject" placeholder="输入科目" clearable />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="searchByContent">搜索</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 题目列表 -->
    <el-card>
      <!-- 批量操作工具栏 -->
      <div class="batch-actions" v-if="selectedQuestions.length > 0">
        <div class="selected-info">
          <el-tag type="info">已选择 {{ selectedQuestions.length }} 道题目</el-tag>
        </div>
        <div class="action-buttons">
          <el-button 
            type="danger" 
            @click="handleBatchDelete"
            :loading="batchDeleting"
          >
            <el-icon><Delete /></el-icon>
            批量删除
          </el-button>
          <el-button @click="clearSelection">取消选择</el-button>
        </div>
      </div>

      <el-table 
        :data="questions" 
        v-loading="loading" 
        style="width: 100%"
        @selection-change="handleSelectionChange"
        ref="questionTableRef"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="title" label="题目标题" min-width="200" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="scope">
            <el-tag :type="getTypeColor(scope.row.type)">
              {{ getTypeName(scope.row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="difficulty" label="难度" width="100">
          <template #default="scope">
            <el-rate v-model="scope.row.difficulty" disabled show-score />
          </template>
        </el-table-column>
        <el-table-column prop="subject" label="科目" width="120" />
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="viewQuestion(scope.row)">查看</el-button>
            <el-button size="small" type="primary" @click="editQuestion(scope.row)">编辑</el-button>
            <el-button 
              size="small" 
              type="danger" 
              @click="handleDeleteQuestion(scope.row.id)"
            >删除</el-button>
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
          @size-change="loadQuestions"
          @current-change="loadQuestions"
        />
      </div>
    </el-card>

    <!-- 添加/编辑题目对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editMode ? '编辑题目' : '添加题目'"
      width="800px"
      @closed="resetForm"
    >
      <el-form :model="questionForm" :rules="questionRules" ref="questionFormRef" label-width="100px">
        <el-form-item label="题目类型" prop="type">
          <el-select v-model="questionForm.type" @change="onTypeChange" style="width: 200px">
            <el-option label="单选题" value="single" />
            <el-option label="多选题" value="multiple" />
            <el-option label="判断题" value="truefalse" />
            <el-option label="简答题" value="essay" />
            <el-option label="填空题" value="fill" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="题目标题" prop="title">
          <el-input v-model="questionForm.title" placeholder="请输入题目标题" />
        </el-form-item>
        
        <el-form-item label="题目内容" prop="content">
          <el-input 
            v-model="questionForm.content" 
            type="textarea" 
            :rows="4" 
            placeholder="请输入题目内容"
          />
        </el-form-item>

        <!-- 选择题选项 -->
        <el-form-item 
          v-if="questionForm.type === 'single' || questionForm.type === 'multiple'" 
          label="选项"
        >
          <div v-for="(option, index) in questionForm.options" :key="index" class="option-item">
            <el-input 
              v-model="option.text" 
              :placeholder="`选项 ${String.fromCharCode(65 + index)}`"
              style="margin-bottom: 10px"
            >
              <template #prepend>{{ String.fromCharCode(65 + index) }}</template>
              <template #append>
                <el-button @click="removeOption(index)" :disabled="questionForm.options.length <= 2">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-input>
          </div>
          <el-button @click="addOption" :disabled="questionForm.options.length >= 6">
            <el-icon><Plus /></el-icon>
            添加选项
          </el-button>
        </el-form-item>

        <el-form-item label="正确答案" prop="correct_answer">
          <!-- 单选题 -->
          <el-radio-group 
            v-if="questionForm.type === 'single'" 
            v-model="questionForm.correct_answer"
          >
            <el-radio 
              v-for="(option, index) in questionForm.options" 
              :key="index" 
              :label="String.fromCharCode(65 + index)"
            >
              {{ String.fromCharCode(65 + index) }}
            </el-radio>
          </el-radio-group>
          
          <!-- 多选题 -->
          <el-checkbox-group 
            v-else-if="questionForm.type === 'multiple'" 
            v-model="questionForm.correct_answer"
          >
            <el-checkbox 
              v-for="(option, index) in questionForm.options" 
              :key="index" 
              :label="String.fromCharCode(65 + index)"
            >
              {{ String.fromCharCode(65 + index) }}
            </el-checkbox>
          </el-checkbox-group>
          
          <!-- 判断题 -->
          <el-radio-group 
            v-else-if="questionForm.type === 'truefalse'" 
            v-model="questionForm.correct_answer"
          >
            <el-radio label="A">正确</el-radio>
            <el-radio label="B">错误</el-radio>
          </el-radio-group>
          
          <!-- 填空题 -->
          <div v-else-if="questionForm.type === 'fill'">
            <el-input 
              v-model="questionForm.correct_answer"
              placeholder="请输入正确答案，多个空格用 || 分隔，如：var||let||const"
              @input="normalizeFillAnswer"
            />
            <div class="fill-answer-tip">
              <el-tag size="small" type="info">
                提示：多个空格的答案请用 || 分隔，避免与答案内容中的逗号冲突
              </el-tag>
              <el-tag size="small" type="warning" style="margin-left: 8px;">
                示例：JavaScript中有___个___关键字 → var||let||const
              </el-tag>
              <el-tag size="small" type="success" style="margin-left: 8px;">
                自动转换：中文｜｜会自动转为英文||
              </el-tag>
            </div>
          </div>
          
          <!-- 简答题 -->
          <el-input 
            v-else-if="questionForm.type === 'essay'" 
            v-model="questionForm.correct_answer"
            type="textarea"
            :rows="3"
            placeholder="请输入参考答案"
          />
        </el-form-item>

        <el-form-item label="答案解析">
          <el-input 
            v-model="questionForm.explanation" 
            type="textarea" 
            :rows="3"
            placeholder="请输入答案解析（可选）"
          />
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="难度" prop="difficulty">
              <el-rate v-model="questionForm.difficulty" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="科目" prop="subject">
              <el-input v-model="questionForm.subject" placeholder="如：数学、语文" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="章节">
          <el-input v-model="questionForm.chapter" placeholder="如：第一章、函数" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveQuestion" :loading="saving">
          {{ editMode ? '更新' : '保存' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="showImportDialog" title="批量导入" width="700px">
      <div class="import-section">
        <!-- 导入方式选择 -->
        <el-radio-group v-model="importType" style="margin-bottom: 20px;">
          <el-radio label="excel">Excel导入</el-radio>
          <el-radio label="word">Word导入</el-radio>
        </el-radio-group>

        <!-- Excel导入说明 -->
        <el-alert
          v-if="importType === 'excel'"
          title="Excel导入说明"
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <p>1. 请下载Excel模板文件，按照格式填写题目信息</p>
          <p>2. 支持的题目类型：single(单选)、multiple(多选)、truefalse(判断)、essay(简答)、fill(填空)</p>
          <p>3. 选择题选项分列填写，如：选项A、选项B、选项C</p>
          <p>4. 填空题答案用"||"分隔，如：var||let||const</p>
        </el-alert>

        <!-- Word导入说明 -->
        <el-alert
          v-if="importType === 'word'"
          title="Word导入说明"
          type="info"
          :closable="false"
          style="margin-bottom: 20px"
        >
          <p>1. 请下载Word模板文件，按照格式编写题目</p>
          <p>2. 题目格式：1. 【单选题】题目标题（支持全角半角符号）</p>
          <p>3. 支持题型标记：【单选题】【多选题】【判断题】【简答题】【填空题】</p>
          <p>4. 选项格式：A. 选项内容 或 A。选项内容（支持全角半角）</p>
          <p>5. 答案格式：答案：A 或 答案：A,B,C</p>
          <p>6. 解析格式：解析：题目解析内容（可选）</p>
          <p>7. 支持文件格式：.docx .doc .txt</p>
        </el-alert>

        <div class="import-actions">
          <el-button @click="handleDownloadTemplate">
            <el-icon><Download /></el-icon>
            下载{{ importType === 'excel' ? 'Excel' : 'Word' }}模板
          </el-button>
          
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :on-change="handleFileChange"
            :accept="importType === 'excel' ? '.xlsx,.xls' : '.docx,.doc,.txt'"
            :limit="1"
          >
            <el-button type="primary">
              <el-icon><Upload /></el-icon>
              选择文件
            </el-button>
          </el-upload>
        </div>

        <div v-if="importFile" class="file-info">
          <p>已选择文件：{{ importFile.name }}</p>
          <el-button type="success" @click="startImport" :loading="importing">
            开始导入
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 文件管理对话框 -->
    <el-dialog v-model="showFileManageDialog" title="文件管理" width="600px">
      <div class="file-manage-section">
        <el-card style="margin-bottom: 20px;">
          <template #header>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span>临时文件清理</span>
              <el-button type="primary" size="small" @click="refreshFileStatus">
                <el-icon><Refresh /></el-icon>
                刷新状态
              </el-button>
            </div>
          </template>
          
          <div v-if="fileStatus">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="文件数量">
                {{ fileStatus.files }}
              </el-descriptions-item>
              <el-descriptions-item label="总大小">
                {{ fileStatus.totalSizeMB }} MB
              </el-descriptions-item>
              <el-descriptions-item label="最旧文件">
                {{ fileStatus.oldestFile ? formatDate(fileStatus.oldestFile) : '无' }}
              </el-descriptions-item>
              <el-descriptions-item label="最新文件">
                {{ fileStatus.newestFile ? formatDate(fileStatus.newestFile) : '无' }}
              </el-descriptions-item>
            </el-descriptions>
            
            <div style="margin-top: 20px; text-align: center;">
              <el-button 
                type="danger" 
                @click="cleanupFiles" 
                :loading="cleaningFiles"
                :disabled="fileStatus.files === 0"
              >
                <el-icon><Delete /></el-icon>
                清理过期文件（超过24小时）
              </el-button>
            </div>
          </div>
          
          <div v-else style="text-align: center; color: #999;">
            点击刷新状态查看文件信息
          </div>
        </el-card>

        <el-alert
          title="文件清理说明"
          type="info"
          :closable="false"
        >
          <p>• 系统会在每次导入完成后自动删除临时文件</p>
          <p>• 此功能用于清理因异常情况遗留的临时文件</p>
          <p>• 只会删除超过24小时的文件，确保安全性</p>
          <p>• 建议定期清理以释放磁盘空间</p>
        </el-alert>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { searchQuestionsByContent } from '@/api/question'
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload, Download, Delete, Folder, Refresh } from '@element-plus/icons-vue'
import { 
  getQuestions, 
  createQuestion, 
  updateQuestion, 
  deleteQuestion,
  batchDeleteQuestions,
  downloadTemplate, 
  downloadWordTemplate,
  importQuestionsFromExcel,
  importQuestionsFromWord,
  cleanupTempFiles,
  getUploadStatus
} from '@/api/question'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const importing = ref(false)
const batchDeleting = ref(false)
const cleaningFiles = ref(false)
const showAddDialog = ref(false)
const showImportDialog = ref(false)
const showFileManageDialog = ref(false)
const editMode = ref(false)
const importFile = ref(null)
const importType = ref('excel') // 新增：导入类型选择
const selectedQuestions = ref([])
const fileStatus = ref(null)

const questions = ref([])
const questionTableRef = ref()
const pagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

const filterForm = reactive({
  type: '',
  difficulty: '',
  subject: '',
  keyword: ''
})
// 按内容搜索题库
const searchByContent = async () => {
  loading.value = true
  try {
    // 如果有内容关键词，使用内容搜索接口
    if (filterForm.keyword && filterForm.keyword.trim()) {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        keyword: filterForm.keyword.trim()
      }
      const response = await searchQuestionsByContent(params)
      if (response.success) {
        questions.value = response.data.questions || []
        pagination.total = response.data.total || 0
      }
    } else {
      // 如果没有内容关键词，回到正常的筛选列表
      await loadQuestions()
    }
  } catch (error) {
    console.error('按内容搜索题目失败:', error)
    ElMessage.error('按内容搜索题目失败')
  } finally {
    loading.value = false
  }
}

const questionForm = reactive({
  id: null,
  type: 'single',
  title: '',
  content: '',
  options: [
    { text: '' },
    { text: '' }
  ],
  correct_answer: '',
  explanation: '',
  difficulty: 1,
  subject: '',
  chapter: ''
})

const questionRules = {
  type: [{ required: true, message: '请选择题目类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入题目标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入题目内容', trigger: 'blur' }],
  correct_answer: [{ required: true, message: '请设置正确答案', trigger: 'change' }],
  difficulty: [{ required: true, message: '请设置难度', trigger: 'change' }],
  subject: [{ required: true, message: '请输入科目', trigger: 'blur' }]
}

const questionFormRef = ref()
const uploadRef = ref()

// 方法
const loadQuestions = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      ...filterForm
    }
    
    const response = await getQuestions(params)
    if (response.success) {
      questions.value = response.data.questions || response.data.list || []
      pagination.total = response.data.total || 0
    }
  } catch (error) {
    console.error('加载题目列表失败:', error)
    ElMessage.error('加载题目列表失败')
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  Object.assign(filterForm, {
    type: '',
    difficulty: '',
    subject: '',
    keyword: ''
  })
  loadQuestions()
}

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

const getTypeColor = (type) => {
  const colorMap = {
    single: 'primary',
    multiple: 'success',
    truefalse: 'warning',
    essay: 'info',
    fill: 'danger'
  }
  return colorMap[type] || ''
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const onTypeChange = () => {
  if (questionForm.type === 'multiple') {
    // 多选题：正确答案应该是数组
    questionForm.correct_answer = []
  } else {
    // 其他题型：正确答案是字符串
    questionForm.correct_answer = ''
  }
  
  if (questionForm.type === 'single' || questionForm.type === 'multiple') {
    questionForm.options = [{ text: '' }, { text: '' }]
  } else {
    questionForm.options = []
  }
}

const addOption = () => {
  questionForm.options.push({ text: '' })
}

const removeOption = (index) => {
  questionForm.options.splice(index, 1)
}

const viewQuestion = (question) => {
  // 显示题目详细信息
  const content = `
    <div style="text-align: left;">
      <h3>${question.title}</h3>
      <p><strong>题目内容：</strong>${question.content}</p>
      <p><strong>题目类型：</strong>${getTypeName(question.type)}</p>
      <p><strong>难度：</strong>${'★'.repeat(question.difficulty)}</p>
      <p><strong>科目：</strong>${question.subject || '未设置'}</p>
      ${question.chapter ? `<p><strong>章节：</strong>${question.chapter}</p>` : ''}
      ${question.options && question.options.length ? `
        <div><strong>选项：</strong></div>
        <ul>
          ${question.options.map(opt => `<li>${opt.key}. ${opt.value}</li>`).join('')}
        </ul>
      ` : ''}
      <p><strong>正确答案：</strong>${question.correct_answer}</p>
      ${question.explanation ? `<p><strong>答案解析：</strong>${question.explanation}</p>` : ''}
    </div>
  `
  
  ElMessageBox.alert(content, '题目详情', {
    dangerouslyUseHTMLString: true,
    confirmButtonText: '关闭'
  })
}

const editQuestion = (question) => {
  editMode.value = true
  
  // 处理正确答案的数据格式
  let correctAnswer = question.correct_answer
  if (question.type === 'multiple' && typeof correctAnswer === 'string') {
    // 多选题：将字符串转换为数组
    correctAnswer = correctAnswer.split(',').map(item => item.trim()).filter(item => item)
  }
  
  Object.assign(questionForm, {
    id: question.id,
    type: question.type,
    title: question.title,
    content: question.content,
    correct_answer: correctAnswer,
    explanation: question.explanation || '',
    difficulty: question.difficulty,
    subject: question.subject || '',
    chapter: question.chapter || ''
  })
  
  // 根据题目类型设置选项
  if (question.type === 'single' || question.type === 'multiple') {
    if (question.options && Array.isArray(question.options)) {
      questionForm.options = question.options.map(opt => ({ text: opt.value || opt.text || '' }))
    } else {
      questionForm.options = [{ text: '' }, { text: '' }]
    }
  } else {
    // 填空题、简答题、判断题不需要选项
    questionForm.options = []
  }
  
  showAddDialog.value = true
}

const handleDeleteQuestion = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这道题目吗？', '提示', {
      type: 'warning'
    })
    
    const response = await deleteQuestion(id)
    if (response.success) {
      ElMessage.success('题目删除成功')
      loadQuestions()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const saveQuestion = async () => {
  try {
    await questionFormRef.value.validate()
    saving.value = true
    
    // 构建请求数据
    const data = {
      type: questionForm.type,
      title: questionForm.title,
      content: questionForm.content,
      correct_answer: Array.isArray(questionForm.correct_answer) 
        ? questionForm.correct_answer.join(',') 
        : questionForm.correct_answer,
      explanation: questionForm.explanation,
      difficulty: questionForm.difficulty,
      subject: questionForm.subject,
      chapter: questionForm.chapter
    }
    
    // 处理选项数据
    if (questionForm.type === 'single' || questionForm.type === 'multiple') {
      data.options = questionForm.options.map((option, index) => ({
        key: String.fromCharCode(65 + index),
        value: option.text
      }))
    } else if (questionForm.type === 'truefalse') {
      data.options = [
        { key: 'A', value: '正确' },
        { key: 'B', value: '错误' }
      ]
    }
    
    let response
    if (editMode.value) {
      response = await updateQuestion(questionForm.id, data)
    } else {
      response = await createQuestion(data)
    }
    
    if (response.success) {
      ElMessage.success(editMode.value ? '题目更新成功' : '题目添加成功')
      showAddDialog.value = false
      loadQuestions()
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  editMode.value = false
  Object.assign(questionForm, {
    id: null,
    type: 'single',
    title: '',
    content: '',
    options: [{ text: '' }, { text: '' }],
    correct_answer: '', // 单选题默认为字符串
    explanation: '',
    difficulty: 1,
    subject: '',
    chapter: ''
  })
  questionFormRef.value?.resetFields()
}

const handleDownloadTemplate = async () => {
  try {
    let response
    if (importType.value === 'excel') {
      response = await downloadTemplate()
    } else {
      response = await downloadWordTemplate()
    }
    
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response]))
    const link = document.createElement('a')
    link.href = url
    link.download = importType.value === 'excel' ? 'question-template.xlsx' : 'question-template.docx'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('下载模板失败:', error)
    ElMessage.error('下载模板失败')
  }
}

const handleFileChange = (file) => {
  importFile.value = file.raw
  
  // 根据文件类型自动切换导入方式
  const fileName = file.name.toLowerCase()
  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    importType.value = 'excel'
  } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc') || fileName.endsWith('.txt')) {
    importType.value = 'word'
  }
}

const startImport = async () => {
  if (!importFile.value) {
    ElMessage.warning('请选择要导入的文件')
    return
  }
  
  importing.value = true
  try {
    const formData = new FormData()
    formData.append('file', importFile.value)
    
    let response
    if (importType.value === 'excel') {
      response = await importQuestionsFromExcel(formData)
    } else {
      response = await importQuestionsFromWord(formData)
    }
    
    if (response.success) {
      ElMessage.success(response.message)
      showImportDialog.value = false
      importFile.value = null
      loadQuestions()
    }
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败: ' + (error.response?.data?.message || error.message))
  } finally {
    importing.value = false
  }
}

const exportQuestions = () => {
  ElMessage.info('导出功能待实现')
}

// 标准化填空题答案输入，自动转换中文符号
const normalizeFillAnswer = () => {
  if (questionForm.correct_answer) {
    questionForm.correct_answer = questionForm.correct_answer
      .replace(/｜｜/g, '||')  // 中文状态的｜｜转换为||
      .replace(/｜/g, '|')     // 中文状态的｜转换为|
  }
}

// 批量操作相关方法
const handleSelectionChange = (selection) => {
  selectedQuestions.value = selection
}

const clearSelection = () => {
  questionTableRef.value?.clearSelection()
}

const handleBatchDelete = async () => {
  if (selectedQuestions.value.length === 0) {
    ElMessage.warning('请先选择要删除的题目')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedQuestions.value.length} 道题目吗？此操作不可恢复！`,
      '批量删除确认',
      {
        type: 'warning',
        confirmButtonText: '确定删除',
        cancelButtonText: '取消'
      }
    )

    batchDeleting.value = true
    const ids = selectedQuestions.value.map(q => q.id)
    
    const response = await batchDeleteQuestions(ids)
    if (response.success) {
      ElMessage.success(response.message)
      clearSelection()
      loadQuestions()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  } finally {
    batchDeleting.value = false
  }
}

// 文件管理相关方法
const refreshFileStatus = async () => {
  try {
    const response = await getUploadStatus()
    if (response.success) {
      fileStatus.value = response.data
    }
  } catch (error) {
    console.error('获取文件状态失败:', error)
    ElMessage.error('获取文件状态失败')
  }
}

const cleanupFiles = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清理过期的临时文件吗？此操作将删除超过24小时的上传文件。',
      '清理文件确认',
      {
        type: 'warning',
        confirmButtonText: '确定清理',
        cancelButtonText: '取消'
      }
    )

    cleaningFiles.value = true
    const response = await cleanupTempFiles()
    
    if (response.success) {
      ElMessage.success(response.message)
      refreshFileStatus() // 刷新状态
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清理文件失败:', error)
      ElMessage.error('清理文件失败')
    }
  } finally {
    cleaningFiles.value = false
  }
}

onMounted(() => {
  loadQuestions()
})
</script>

<style scoped>
.question-manage {
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

.option-item {
  margin-bottom: 10px;
}

.fill-answer-tip {
  margin-top: 8px;
}

.import-section .import-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.file-info {
  padding: 15px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-top: 15px;
}

.batch-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  margin-bottom: 20px;
}

.selected-info {
  display: flex;
  align-items: center;
}

.action-buttons {
  display: flex;
  gap: 10px;
}

.file-manage-section .el-descriptions {
  margin-bottom: 0;
}
</style>
