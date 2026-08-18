import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import App from './App.vue'
import Home from './views/Home.vue'
import Result from './views/Result.vue'
import History from './views/History.vue'
import Planning from './views/Planning.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home
    },
    {
      path: '/planning/:taskId',
      name: 'Planning',
      component: Planning
    },
    {
      path: '/result/:sessionId',
      name: 'Result',
      component: Result
    },
    {
      path: '/history',
      name: 'History',
      component: History
    },
    {
      path: '/result',
      redirect: '/history'
    }
  ]
})

const app = createApp(App)

app.use(router)
app.use(Antd)

app.mount('#app')

