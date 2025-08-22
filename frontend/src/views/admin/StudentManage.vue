<template>
  <div class="student-manage">
    <el-card class="page-header">
      <template #header>
        <div class="header-content">
          <h2>学生管理</h2>
          <div class="header-actions">
            <el-button type="primary" @click="showAddDialog = true">
              <el-icon><Plus /></el-icon>
              添加学生
            </el-button>
            <el-button @click="exportStudents">
              <el-icon><Download /></el-icon>
              导出学生
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <div class="filter-section">
        <el-form :model="filterForm" inline>
          <el-form-item label="学生姓名">
            <el-input v-model="filterForm.name" placeholder="输入学生姓名" clearable style="width: 200px" />
          </el-form-item>
          <el-form-item label="用户名">
            <el-input v-model="filterForm.username" placeholder="输入用户名" clearable style="width: 200px" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="loadStudents">搜索</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </div>
    </el-card>

    <!-- 学生列表 -->
    <el-card>
      <el-table :data="students" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="用户名" width="150" />
        <el-table-column prop="real_name" label="姓名" width="150">
          <template #default="scope">
            {{ scope.row.real_name || '未设置' }}
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="200" />
        <el-table-column prop="created_at" label="注册时间" width="180">
          <template #default="scope">
            {{ formatDate(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button size="small" @click="editStudent(scope.row)">编辑</el-button>
            <el-button size="small" type="danger" @click="confirmDelete(scope.row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加/编辑学生对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editMode ? '编辑学生' : '添加学生'"
      width="500px"
      @closed="resetForm"
    >
      <el-form :model="studentForm" ref="studentFormRef" label-width="100px">
        <el-form-item label="用户名" required>
          <el-input v-model="studentForm.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="姓名" required>
          <el-input v-model="studentForm.real_name" placeholder="请输入学生姓名" />
        </el-form-item>
        <el-form-item label="密码" required v-if="!editMode">
          <el-input v-model="studentForm.password" type="password" placeholder="请输入密码" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="studentForm.email" placeholder="请输入邮箱（可选）" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveStudent" :loading="saving">
          {{ editMode ? '更新' : '保存' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download } from '@element-plus/icons-vue'
import { getStudents, createStudent, updateStudent, deleteStudent } from '@/api/admin'

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const showAddDialog = ref(false)
const editMode = ref(false)

const students = ref([])
const filterForm = reactive({
  name: '',
  username: ''
})

const studentForm = reactive({
  id: null,
  username: '',
  real_name: '',
  password: '',
  email: ''
})

const studentFormRef = ref()

// 方法
const loadStudents = async () => {
  loading.value = true
  try {
    const response = await getStudents()
    if (response.success) {
      students.value = response.data || []
    }
  } catch (error) {
    console.error('加载学生列表失败:', error)
    ElMessage.error('加载学生列表失败')
  } finally {
    loading.value = false
  }
}

const resetFilter = () => {
  filterForm.name = ''
  filterForm.username = ''
  loadStudents()
}

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

const editStudent = (student) => {
  editMode.value = true
  studentForm.id = student.id
  studentForm.username = student.username
  studentForm.real_name = student.real_name
  studentForm.email = student.email || ''
  showAddDialog.value = true
}

const confirmDelete = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除该学生吗？删除后无法恢复', '提示', {
      type: 'warning'
    })
    
    // 实际调用删除API
    const response = await deleteStudent(id)
    if (response.success) {
      ElMessage.success('学生删除成功')
      loadStudents()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const saveStudent = async () => {
  if (!studentForm.username || !studentForm.real_name) {
    ElMessage.error('请填写必填项')
    return
  }

  if (!editMode.value && !studentForm.password) {
    ElMessage.error('请输入密码')
    return
  }

  saving.value = true
  try {
    let response
    if (editMode.value) {
      // 编辑模式 - 更新学生信息
      response = await updateStudent(studentForm.id, {
        username: studentForm.username,
        real_name: studentForm.real_name,
        email: studentForm.email || null
      })
    } else {
      // 新增模式 - 创建学生
      response = await createStudent({
        username: studentForm.username,
        real_name: studentForm.real_name,
        password: studentForm.password,
        email: studentForm.email || null
      })
    }
    
    if (response.success) {
      ElMessage.success(editMode.value ? '学生更新成功' : '学生添加成功')
      showAddDialog.value = false
      loadStudents()
    } else {
      ElMessage.error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error(error.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  editMode.value = false
  studentForm.id = null
  studentForm.username = ''
  studentForm.real_name = ''
  studentForm.password = ''
  studentForm.email = ''
}

const exportStudents = () => {
  ElMessage.info('导出功能待实现')
}

onMounted(() => {
  loadStudents()
})
</script>

<style scoped>
.student-manage {
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
</style>
