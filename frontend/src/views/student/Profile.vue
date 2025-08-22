<template>
  <div class="student-profile">
    <el-row :gutter="20">
      <!-- 个人信息 -->
      <el-col :span="8">
        <el-card>
          <template #header>
            <span>个人信息</span>
          </template>
          
          <div class="profile-info">
            <div class="avatar-section">
              <el-avatar :size="80" :src="userInfo.avatar" :icon="UserFilled" />
              <el-button size="small" @click="showAvatarDialog = true" style="margin-top: 10px">
                更换头像
              </el-button>
            </div>
            
            <el-descriptions :column="1" style="margin-top: 20px">
              <el-descriptions-item label="学号">{{ userInfo.student_id }}</el-descriptions-item>
              <el-descriptions-item label="姓名">{{ userInfo.name }}</el-descriptions-item>
              <el-descriptions-item label="用户名">{{ userInfo.username }}</el-descriptions-item>
              <el-descriptions-item label="班级">{{ userInfo.class_name || '-' }}</el-descriptions-item>
              <el-descriptions-item label="邮箱">{{ userInfo.email }}</el-descriptions-item>
              <el-descriptions-item label="电话">{{ userInfo.phone || '-' }}</el-descriptions-item>
              <el-descriptions-item label="注册时间">{{ formatDate(userInfo.created_at) }}</el-descriptions-item>
              <el-descriptions-item label="最后登录">{{ formatDate(userInfo.last_login) }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-card>

        <!-- 学习统计 -->
        <el-card style="margin-top: 20px">
          <template #header>
            <span>学习统计</span>
          </template>
          
          <div class="study-stats">
            <el-row :gutter="15">
              <el-col :span="12">
                <el-statistic title="总考试次数" :value="studyStats.total_exams" />
              </el-col>
              <el-col :span="12">
                <el-statistic title="平均分" :value="studyStats.avg_score" :precision="1" />
              </el-col>
            </el-row>
            <el-row :gutter="15" style="margin-top: 20px">
              <el-col :span="12">
                <el-statistic title="最高分" :value="studyStats.max_score" />
              </el-col>
              <el-col :span="12">
                <el-statistic title="及格率" :value="studyStats.pass_rate" suffix="%" />
              </el-col>
            </el-row>
            <el-row :gutter="15" style="margin-top: 20px">
              <el-col :span="12">
                <el-statistic title="错题数量" :value="studyStats.wrong_questions" />
              </el-col>
              <el-col :span="12">
                <el-statistic title="学习天数" :value="studyStats.study_days" />
              </el-col>
            </el-row>
          </div>
        </el-card>
      </el-col>

      <!-- 编辑信息 -->
      <el-col :span="16">
        <el-card>
          <template #header>
            <span>编辑信息</span>
          </template>
          
          <el-form :model="profileForm" :rules="profileRules" ref="profileFormRef" label-width="100px">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="姓名" prop="name">
                  <el-input v-model="profileForm.name" placeholder="请输入姓名" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="邮箱" prop="email">
                  <el-input v-model="profileForm.email" placeholder="请输入邮箱" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="电话">
                  <el-input v-model="profileForm.phone" placeholder="请输入电话" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="班级">
                  <el-input v-model="profileForm.class_name" placeholder="请输入班级" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="个人简介">
              <el-input 
                v-model="profileForm.bio" 
                type="textarea" 
                :rows="3"
                placeholder="请输入个人简介"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="updateProfile" :loading="saving">
                保存修改
              </el-button>
              <el-button @click="resetProfile">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>

        <!-- 修改密码 -->
        <el-card style="margin-top: 20px">
          <template #header>
            <span>修改密码</span>
          </template>
          
          <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-width="100px">
            <el-form-item label="当前密码" prop="current_password">
              <el-input 
                v-model="passwordForm.current_password" 
                type="password" 
                placeholder="请输入当前密码"
                show-password
              />
            </el-form-item>

            <el-form-item label="新密码" prop="new_password">
              <el-input 
                v-model="passwordForm.new_password" 
                type="password" 
                placeholder="请输入新密码"
                show-password
              />
            </el-form-item>

            <el-form-item label="确认密码" prop="confirm_password">
              <el-input 
                v-model="passwordForm.confirm_password" 
                type="password" 
                placeholder="请再次输入新密码"
                show-password
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="changePassword" :loading="changingPassword">
                修改密码
              </el-button>
              <el-button @click="resetPassword">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <!-- 学习偏好设置 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <span>学习偏好</span>
      </template>
      
      <el-form :model="preferencesForm" label-width="150px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="考试提醒">
              <el-switch v-model="preferencesForm.exam_reminders" />
              <div class="setting-note">考试开始前提醒</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="成绩通知">
              <el-switch v-model="preferencesForm.score_notifications" />
              <div class="setting-note">成绩发布时通知</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="错题提醒">
              <el-switch v-model="preferencesForm.wrong_question_reminders" />
              <div class="setting-note">定期提醒复习错题</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="练习记录">
              <el-switch v-model="preferencesForm.practice_history" />
              <div class="setting-note">保存练习历史记录</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="默认练习数量">
          <el-input-number 
            v-model="preferencesForm.default_practice_count" 
            :min="5" 
            :max="50"
            controls-position="right"
          />
          <span style="margin-left: 10px; color: #999">题</span>
        </el-form-item>

        <el-form-item label="偏好科目">
          <el-select 
            v-model="preferencesForm.favorite_subjects" 
            multiple 
            placeholder="选择偏好科目"
            style="width: 300px"
          >
            <el-option label="数学" value="数学" />
            <el-option label="语文" value="语文" />
            <el-option label="英语" value="英语" />
            <el-option label="物理" value="物理" />
            <el-option label="化学" value="化学" />
            <el-option label="生物" value="生物" />
            <el-option label="历史" value="历史" />
            <el-option label="地理" value="地理" />
            <el-option label="政治" value="政治" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="updatePreferences" :loading="savingPreferences">
            保存偏好
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 最近考试记录 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <div class="card-header">
          <span>最近考试记录</span>
          <el-button type="text" @click="viewAllExams">查看全部</el-button>
        </div>
      </template>
      
      <el-table :data="recentExams" style="width: 100%">
        <el-table-column prop="exam_title" label="考试名称" min-width="200" />
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
            {{ scope.row.accuracy_rate }}%
          </template>
        </el-table-column>
        <el-table-column prop="rank" label="排名" width="100">
          <template #default="scope">
            第 {{ scope.row.rank }} 名
          </template>
        </el-table-column>
        <el-table-column prop="exam_date" label="考试时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.exam_date) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button size="small" @click="viewExamResult(scope.row)">查看详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 更换头像对话框 -->
    <el-dialog v-model="showAvatarDialog" title="更换头像" width="400px">
      <div class="avatar-upload">
        <el-upload
          ref="avatarUploadRef"
          :auto-upload="false"
          :on-change="handleAvatarChange"
          :show-file-list="false"
          accept="image/*"
        >
          <div class="avatar-preview">
            <img v-if="previewAvatar" :src="previewAvatar" alt="头像预览" />
            <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
          </div>
        </el-upload>
        <div class="avatar-tips">
          <p>支持 JPG、PNG 格式，文件大小不超过 2MB</p>
          <p>建议上传正方形图片，获得最佳显示效果</p>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showAvatarDialog = false">取消</el-button>
        <el-button type="primary" @click="uploadAvatar" :loading="uploadingAvatar">
          保存头像
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UserFilled, Plus } from '@element-plus/icons-vue'

const router = useRouter()

// 响应式数据
const saving = ref(false)
const changingPassword = ref(false)
const savingPreferences = ref(false)
const uploadingAvatar = ref(false)
const showAvatarDialog = ref(false)
const previewAvatar = ref('')

const userInfo = reactive({
  id: null,
  student_id: '',
  username: '',
  name: '',
  email: '',
  phone: '',
  class_name: '',
  bio: '',
  avatar: '',
  created_at: '',
  last_login: ''
})

const studyStats = reactive({
  total_exams: 0,
  avg_score: 0,
  max_score: 0,
  pass_rate: 0,
  wrong_questions: 0,
  study_days: 0
})

const profileForm = reactive({
  name: '',
  email: '',
  phone: '',
  class_name: '',
  bio: ''
})

const passwordForm = reactive({
  current_password: '',
  new_password: '',
  confirm_password: ''
})

const preferencesForm = reactive({
  exam_reminders: true,
  score_notifications: true,
  wrong_question_reminders: true,
  practice_history: true,
  default_practice_count: 20,
  favorite_subjects: []
})

const recentExams = ref([])

const profileRules = {
  name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const passwordRules = {
  current_password: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  new_password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirm_password: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    { 
      validator: (rule, value, callback) => {
        if (value !== passwordForm.new_password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      }, 
      trigger: 'blur' 
    }
  ]
}

const profileFormRef = ref()
const passwordFormRef = ref()
const avatarUploadRef = ref()

// 方法
const loadUserInfo = async () => {
  try {
    // TODO: 调用API获取用户信息
    // 模拟数据
    Object.assign(userInfo, {
      id: 1,
      student_id: 'STU001',
      username: 'student',
      name: '张三',
      email: 'student@example.com',
      phone: '13800138000',
      class_name: '高三(1)班',
      bio: '热爱学习，追求进步',
      avatar: '',
      created_at: '2024-01-01T00:00:00Z',
      last_login: new Date().toISOString()
    })
    
    // 同步到表单
    Object.assign(profileForm, {
      name: userInfo.name,
      email: userInfo.email,
      phone: userInfo.phone,
      class_name: userInfo.class_name,
      bio: userInfo.bio
    })
  } catch (error) {
    ElMessage.error('加载用户信息失败')
  }
}

const loadStudyStats = async () => {
  try {
    // TODO: 调用API获取学习统计
    Object.assign(studyStats, {
      total_exams: 15,
      avg_score: 85.5,
      max_score: 98,
      pass_rate: 93.3,
      wrong_questions: 25,
      study_days: 120
    })
  } catch (error) {
    ElMessage.error('加载学习统计失败')
  }
}

const loadPreferences = async () => {
  try {
    // TODO: 调用API获取用户偏好
    Object.assign(preferencesForm, {
      exam_reminders: true,
      score_notifications: true,
      wrong_question_reminders: true,
      practice_history: true,
      default_practice_count: 20,
      favorite_subjects: ['数学', '物理']
    })
  } catch (error) {
    ElMessage.error('加载偏好设置失败')
  }
}

const loadRecentExams = async () => {
  try {
    // TODO: 调用API获取最近考试记录
    recentExams.value = []
  } catch (error) {
    ElMessage.error('加载考试记录失败')
  }
}

const updateProfile = async () => {
  try {
    await profileFormRef.value.validate()
    saving.value = true
    
    // TODO: 调用API更新个人信息
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 更新本地数据
    Object.assign(userInfo, profileForm)
    
    ElMessage.success('个人信息更新成功')
  } catch (error) {
    console.error('更新失败:', error)
  } finally {
    saving.value = false
  }
}

const resetProfile = () => {
  Object.assign(profileForm, {
    name: userInfo.name,
    email: userInfo.email,
    phone: userInfo.phone,
    class_name: userInfo.class_name,
    bio: userInfo.bio
  })
}

const changePassword = async () => {
  try {
    await passwordFormRef.value.validate()
    changingPassword.value = true
    
    // TODO: 调用API修改密码
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElMessage.success('密码修改成功')
    resetPassword()
  } catch (error) {
    console.error('密码修改失败:', error)
  } finally {
    changingPassword.value = false
  }
}

const resetPassword = () => {
  Object.assign(passwordForm, {
    current_password: '',
    new_password: '',
    confirm_password: ''
  })
  passwordFormRef.value?.resetFields()
}

const updatePreferences = async () => {
  savingPreferences.value = true
  try {
    // TODO: 调用API更新偏好设置
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElMessage.success('偏好设置保存成功')
  } catch (error) {
    ElMessage.error('偏好设置保存失败')
  } finally {
    savingPreferences.value = false
  }
}

const handleAvatarChange = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    previewAvatar.value = e.target.result
  }
  reader.readAsDataURL(file.raw)
}

const uploadAvatar = async () => {
  if (!previewAvatar.value) {
    ElMessage.warning('请选择头像图片')
    return
  }
  
  uploadingAvatar.value = true
  try {
    // TODO: 调用API上传头像
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    userInfo.avatar = previewAvatar.value
    showAvatarDialog.value = false
    previewAvatar.value = ''
    ElMessage.success('头像更新成功')
  } catch (error) {
    ElMessage.error('头像上传失败')
  } finally {
    uploadingAvatar.value = false
  }
}

const getScoreClass = (score, passScore) => {
  if (score >= 90) return 'score-excellent'
  if (score >= passScore) return 'score-pass'
  return 'score-fail'
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const viewAllExams = () => {
  router.push('/student/exam-history')
}

const viewExamResult = (exam) => {
  router.push(`/student/exam-result/${exam.id}`)
}

onMounted(() => {
  loadUserInfo()
  loadStudyStats()
  loadPreferences()
  loadRecentExams()
})
</script>

<style scoped>
.student-profile {
  padding: 20px;
}

.profile-info {
  text-align: center;
}

.avatar-section {
  padding: 20px 0;
}

.study-stats {
  padding: 10px 0;
}

.setting-note {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
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

.avatar-upload {
  text-align: center;
}

.avatar-preview {
  width: 120px;
  height: 120px;
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  overflow: hidden;
}

.avatar-preview:hover {
  border-color: #409EFF;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
}

.avatar-tips {
  font-size: 12px;
  color: #999;
  line-height: 1.5;
}
</style>
