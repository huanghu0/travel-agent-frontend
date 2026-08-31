<template>
  <div id="app">
    <template v-if="showNavigation">
      <header class="app-navigation">
        <button class="brand" type="button" @click="router.push('/')">
          <span>行</span>
          <strong>智能旅行助手</strong>
        </button>
        <nav aria-label="主导航">
          <router-link to="/">规划行程</router-link>
          <router-link to="/history">历史行程</router-link>
          <router-link to="/shared-guides">分享广场</router-link>
        </nav>
        <div class="account">
          <div class="avatar">{{ userInitial }}</div>
          <div><small>当前账户</small><strong>{{ currentUser?.username || '旅行者' }}</strong></div>
          <a-button size="small" @click="logout">退出</a-button>
        </div>
      </header>
      <a-layout class="app-layout">
        <a-layout-content class="app-content"><router-view /></a-layout-content>
      </a-layout>
    </template>
    <router-view v-else />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getCurrentUser } from '@/services/api'
import { authSession, clearAuthSession } from '@/utils/auth'

const route = useRoute()
const router = useRouter()
const showNavigation = computed(() => route.name !== 'Login')
const currentUser = computed(() => authSession.currentUser.value)
const userInitial = computed(() => (currentUser.value?.username || '旅').slice(0, 1).toUpperCase())

function logout(): void {
  clearAuthSession()
  void router.replace({ name: 'Login' })
}

onMounted(() => {
  if (authSession.isAuthenticated.value) void getCurrentUser().catch(() => undefined)
})
</script>

<style>
* { box-sizing: border-box; }
body { margin: 0; color: #172a25; background: #f4f1ea; }
button, input { font: inherit; }
#app { min-height: 100vh; font-family: 'Noto Sans SC', 'PingFang SC', sans-serif; }
.app-layout { min-height: calc(100vh - 68px); }
.app-content { padding: 24px; }
.app-navigation { position: sticky; top: 0; z-index: 100; height: 68px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 24px; padding: 0 28px; color: #f7f2e8; background: rgba(25,55,46,.96); border-bottom: 1px solid rgba(255,255,255,.1); backdrop-filter: blur(14px); }
.brand { display: flex; align-items: center; gap: 11px; width: fit-content; padding: 0; color: inherit; border: 0; background: transparent; cursor: pointer; }
.brand span { display: grid; place-items: center; width: 34px; height: 34px; color: #244e3f; background: #f2b84b; border-radius: 50% 50% 50% 8px; font-family: 'Songti SC', serif; }
.brand strong { letter-spacing: .04em; }
.app-navigation nav { display: flex; gap: 8px; }
.app-navigation nav a { padding: 9px 14px; color: rgba(255,255,255,.68); border-radius: 999px; text-decoration: none; transition: .2s ease; }
.app-navigation nav a:hover, .app-navigation nav a.router-link-active { color: #fff; background: rgba(255,255,255,.1); }
.account { justify-self: end; display: flex; align-items: center; gap: 10px; }
.account .avatar { display: grid; place-items: center; width: 34px; height: 34px; color: #fff; background: #e85d3f; border-radius: 50%; font-family: Georgia, serif; }
.account div:nth-child(2) { display: grid; gap: 2px; }
.account small { color: rgba(255,255,255,.58); font-size: 10px; }
.account strong { font-size: 13px; }
.account .ant-btn { margin-left: 6px; color: #fff; border-color: rgba(255,255,255,.28); background: transparent; }
@media (max-width: 760px) {
  .app-navigation {
    height: auto;
    min-height: 68px;
    grid-template-areas: 'brand account' 'nav nav';
    grid-template-columns: 1fr auto;
    gap: 8px 12px;
    padding: 10px 14px 9px;
  }
  .brand { grid-area: brand; }
  .app-navigation nav { grid-area: nav; display: flex; width: 100%; gap: 4px; }
  .app-navigation nav a { flex: 1; padding: 7px 6px; text-align: center; }
  .account { grid-area: account; }
  .account div:nth-child(2) { display: none; }
  .app-content { padding: 0; }
}
</style>


