import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import App from './App.vue'
import Home from './views/Home.vue'
import Result from './views/Result.vue'
import History from './views/History.vue'
import Planning from './views/Planning.vue'
import Login from './views/Login.vue'
import SharedGuides from './views/SharedGuides.vue'
import { AUTH_UNAUTHORIZED_EVENT, getAccessToken } from '@/utils/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: Login,
      meta: { guestOnly: true }
    },
    {
      path: '/',
      name: 'Home',
      component: Home,
      meta: { requiresAuth: true }
    },
    {
      path: '/planning/:taskId',
      name: 'Planning',
      component: Planning,
      meta: { requiresAuth: true }
    },
    {
      path: '/result/:sessionId',
      name: 'Result',
      component: Result,
      meta: { requiresAuth: true }
    },
    {
      path: '/history',
      name: 'History',
      component: History,
      meta: { requiresAuth: true }
    },
    {
      path: '/shared-guides',
      name: 'SharedGuides',
      component: SharedGuides,
      meta: { requiresAuth: true }
    },
    {
      path: '/result',
      redirect: '/history'
    }
  ]
})

router.beforeEach((to) => {
  const authenticated = Boolean(getAccessToken())
  if (to.meta.requiresAuth && !authenticated) {
    return { name: 'Login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && authenticated) {
    return { name: 'Home' }
  }
  return true
})

window.addEventListener(AUTH_UNAUTHORIZED_EVENT, () => {
  const current = router.currentRoute.value
  if (current.name !== 'Login') {
    void router.replace({ name: 'Login', query: { redirect: current.fullPath } })
  }
})

const app = createApp(App)
app.use(router)
app.use(Antd)
app.mount('#app')
