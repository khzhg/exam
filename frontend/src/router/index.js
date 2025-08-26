import { createRouter, createWebHistory } from 'vue-router'

// 路由组件懒加载
const Login = () => import('@/views/Login.vue')
const Register = () => import('@/views/Register.vue')

// 学生页面
const StudentDashboard = () => import('@/views/student/Dashboard.vue')
const ExamList = () => import('@/views/student/ExamList.vue')
const Exam = () => import('@/views/student/Exam.vue')
const ExamResult = () => import('@/views/student/ExamResult.vue')
const ExamReview = () => import('@/views/student/ExamReview.vue')
const ExamHistory = () => import('@/views/student/ExamHistory.vue')
const WrongQuestions = () => import('@/views/student/WrongQuestions.vue')
const StudentProfile = () => import('@/views/student/Profile.vue')

// 管理员页面
const AdminDashboard = () => import('@/views/admin/Dashboard.vue')
const QuestionManage = () => import('@/views/admin/QuestionManage.vue')
const PaperManage = () => import('@/views/admin/PaperManage.vue')
const ExamManage = () => import('@/views/admin/ExamManage.vue')
const StudentManage = () => import('@/views/admin/StudentManage.vue')
const ResultsStats = () => import('@/views/admin/ResultsStats.vue')
const AdminProfile = () => import('@/views/admin/Profile.vue')

// 404页面
const NotFound = () => import('@/views/NotFound.vue')

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { requiresGuest: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: Register,
    meta: { requiresGuest: true }
  },
  
  // 学生路由
  {
    path: '/student',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'StudentDashboard',
        component: StudentDashboard
      },
      {
        path: 'exams',
        name: 'ExamList',
        component: ExamList
      },
      {
        path: 'exam/:id',
        name: 'Exam',
        component: Exam,
        props: true
      },
      {
        path: 'result/:id',
        name: 'ExamResult',
        component: ExamResult,
        props: true
      },
      {
        path: 'review/:examRecordId',
        name: 'ExamReview',
        component: ExamReview,
        props: true
      },
      {
        path: 'results',
        name: 'ExamHistory',
        component: ExamHistory
      },
      {
        path: 'wrong-questions',
        name: 'WrongQuestions',
        component: WrongQuestions
      },
      {
        path: 'profile',
        name: 'StudentProfile',
        component: StudentProfile
      }
    ]
  },
  
  // 管理员路由
  {
    path: '/admin',
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: AdminDashboard
      },
      {
        path: 'questions',
        name: 'QuestionManage',
        component: QuestionManage
      },
      {
        path: 'papers',
        name: 'PaperManage',
        component: PaperManage
      },
      {
        path: 'exams',
        name: 'ExamManage',
        component: ExamManage
      },
      {
        path: 'users',
        name: 'StudentManage',
        component: StudentManage
      },
      {
        path: 'results',
        name: 'ResultsStats',
        component: ResultsStats
      },
      {
        path: 'profile',
        name: 'AdminProfile',
        component: AdminProfile
      }
    ]
  },
  
  // 404页面
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const userInfo = JSON.parse(localStorage.getItem('user') || 'null')
  
  // 检查是否需要登录
  if (to.meta.requiresAuth) {
    if (!token || !userInfo) {
      next('/login')
      return
    }
    
    // 检查角色权限
    if (to.meta.role && userInfo.role !== to.meta.role) {
      // 根据用户角色重定向到对应的仪表板
      if (userInfo.role === 'admin') {
        next('/admin/dashboard')
      } else {
        next('/student/dashboard')
      }
      return
    }
  }
  
  // 检查是否需要游客状态（未登录）
  if (to.meta.requiresGuest && token && userInfo) {
    // 根据用户角色重定向到对应的仪表板
    if (userInfo.role === 'admin') {
      next('/admin/dashboard')
    } else {
      next('/student/dashboard')
    }
    return
  }
  
  next()
})

export default router
