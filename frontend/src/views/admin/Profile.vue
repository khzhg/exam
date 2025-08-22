<template>
  <div class="admin-profile">
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
              <el-descriptions-item label="用户名">{{ userInfo.username }}</el-descriptions-item>
              <el-descriptions-item label="姓名">{{ userInfo.name }}</el-descriptions-item>
              <el-descriptions-item label="角色">
                <el-tag type="danger">管理员</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="邮箱">{{ userInfo.email }}</el-descriptions-item>
              <el-descriptions-item label="电话">{{ userInfo.phone || '-' }}</el-descriptions-item>
              <el-descriptions-item label="注册时间">{{ formatDate(userInfo.created_at) }}</el-descriptions-item>
              <el-descriptions-item label="最后登录">{{ formatDate(userInfo.last_login) }}</el-descriptions-item>
            </el-descriptions>
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
                <el-form-item label="部门">
                  <el-input v-model="profileForm.department" placeholder="请输入部门" />
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

    <!-- 系统设置 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <span>系统设置</span>
      </template>
      
      <el-form :model="settingsForm" label-width="150px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="邮件通知">
              <el-switch v-model="settingsForm.email_notifications" />
              <div class="setting-note">接收系统邮件通知</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="短信通知">
              <el-switch v-model="settingsForm.sms_notifications" />
              <div class="setting-note">接收系统短信通知</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="考试提醒">
              <el-switch v-model="settingsForm.exam_reminders" />
              <div class="setting-note">考试开始前提醒</div>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="成绩通知">
              <el-switch v-model="settingsForm.score_notifications" />
              <div class="setting-note">成绩发布时通知</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="界面语言">
          <el-select v-model="settingsForm.language" style="width: 200px">
            <el-option label="简体中文" value="zh-CN" />
            <el-option label="English" value="en-US" />
          </el-select>
        </el-form-item>

        <el-form-item label="时区">
          <el-select v-model="settingsForm.timezone" style="width: 200px">
            <el-option label="北京时间 (UTC+8)" value="Asia/Shanghai" />
            <el-option label="协调世界时 (UTC+0)" value="UTC" />
          </el-select>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="updateSettings" :loading="savingSettings">
            保存设置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作日志 -->
    <el-card style="margin-top: 20px">
      <template #header>
        <span>最近操作日志</span>
      </template>
      
      <el-table :data="operationLogs" style="width: 100%">
        <el-table-column prop="action" label="操作" width="200" />
        <el-table-column prop="target" label="操作对象" min-width="200" />
        <el-table-column prop="ip_address" label="IP地址" width="150" />
        <el-table-column prop="user_agent" label="浏览器" min-width="200">
          <template #default="scope">
            <el-tooltip :content="scope.row.user_agent" placement="top">
              <span>{{ getBrowserName(scope.row.user_agent) }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="操作时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination" style="margin-top: 20px">
        <el-pagination
          v-model:current-page="logPagination.page"
          v-model:page-size="logPagination.limit"
          :page-sizes="[10, 20, 50]"
          :total="logPagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadOperationLogs"
          @current-change="loadOperationLogs"
        />
      </div>
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
import { ElMessage } from 'element-plus'
import { UserFilled, Plus } from '@element-plus/icons-vue'

// 响应式数据
const saving = ref(false)
const changingPassword = ref(false)
const savingSettings = ref(false)
const uploadingAvatar = ref(false)
const showAvatarDialog = ref(false)
const previewAvatar = ref('')

const userInfo = reactive({
  id: null,
  username: '',
  name: '',
  email: '',
  phone: '',
  department: '',
  bio: '',
  avatar: '',
  created_at: '',
  last_login: ''
})

const profileForm = reactive({
  name: '',
  email: '',
  phone: '',
  department: '',
  bio: ''
})

const passwordForm = reactive({
  current_password: '',
  new_password: '',
  confirm_password: ''
})

const settingsForm = reactive({
  email_notifications: true,
  sms_notifications: false,
  exam_reminders: true,
  score_notifications: true,
  language: 'zh-CN',
  timezone: 'Asia/Shanghai'
})

const operationLogs = ref([])
const logPagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

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
      username: 'admin',
      name: '系统管理员',
      email: 'admin@example.com',
      phone: '13800138000',
      department: '信息技术部',
      bio: '负责系统管理和维护工作',
      avatar: '',
      created_at: '2024-01-01T00:00:00Z',
      last_login: new Date().toISOString()
    })
    
    // 同步到表单
    Object.assign(profileForm, {
      name: userInfo.name,
      email: userInfo.email,
      phone: userInfo.phone,
      department: userInfo.department,
      bio: userInfo.bio
    })
  } catch (error) {
    ElMessage.error('加载用户信息失败')
  }
}

const loadSettings = async () => {
  try {
    // TODO: 调用API获取用户设置
    // 模拟数据
    Object.assign(settingsForm, {
      email_notifications: true,
      sms_notifications: false,
      exam_reminders: true,
      score_notifications: true,
      language: 'zh-CN',
      timezone: 'Asia/Shanghai'
    })
  } catch (error) {
    ElMessage.error('加载设置失败')
  }
}

const loadOperationLogs = async () => {
  try {
    // TODO: 调用API获取操作日志
    operationLogs.value = []
    logPagination.total = 0
  } catch (error) {
    ElMessage.error('加载操作日志失败')
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
    department: userInfo.department,
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

const updateSettings = async () => {
  savingSettings.value = true
  try {
    // TODO: 调用API更新设置
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    ElMessage.success('设置保存成功')
  } catch (error) {
    ElMessage.error('设置保存失败')
  } finally {
    savingSettings.value = false
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

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const getBrowserName = (userAgent) => {
  if (userAgent.includes('Chrome')) return 'Chrome'
  if (userAgent.includes('Firefox')) return 'Firefox'
  if (userAgent.includes('Safari')) return 'Safari'
  if (userAgent.includes('Edge')) return 'Edge'
  return '未知浏览器'
}

onMounted(() => {
  loadUserInfo()
  loadSettings()
  loadOperationLogs()
})
</script>

<style scoped>
.admin-profile {
  padding: 20px;
}

.profile-info {
  text-align: center;
}

.avatar-section {
  padding: 20px 0;
}

.setting-note {
  font-size: 12px;
  color: #999;
  margin-top: 5px;
}

.pagination {
  text-align: right;
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
