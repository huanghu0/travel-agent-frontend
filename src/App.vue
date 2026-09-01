<template>
  <div id="app">
    <template v-if="showNavigation">
      <header class="app-navigation">
        <button class="brand" type="button" aria-label="返回规划首页" @click="router.push('/')">
          <span class="brand-mark" aria-hidden="true">行</span>
          <span class="brand-copy">
            <strong>智能旅行家</strong>
            <small>AI TRIP PLANNER</small>
          </span>
        </button>

        <nav aria-label="主导航">
          <router-link to="/">
            <span aria-hidden="true">✦</span>
            规划行程
          </router-link>
          <router-link to="/history">
            <span aria-hidden="true">◷</span>
            历史行程
          </router-link>
          <router-link to="/shared-guides">
            <span aria-hidden="true">◎</span>
            分享广场
          </router-link>
        </nav>

        <div class="account">
          <div class="avatar" aria-hidden="true">{{ userInitial }}</div>
          <div class="account-copy">
            <small>当前账户</small>
            <strong>{{ currentUser?.username || '旅行者' }}</strong>
          </div>
          <a-button class="logout-button" size="small" @click="logout">退出</a-button>
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
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  color: #172a25;
  background: #f4f1ea;
}

button,
input {
  font: inherit;
}

#app {
  min-height: 100vh;
  font-family: 'Noto Sans SC', 'PingFang SC', sans-serif;
}

.app-layout {
  min-height: calc(100vh - 72px);
}

.app-content {
  padding: 24px;
}

.app-navigation {
  position: sticky;
  top: 0;
  z-index: 100;
  display: grid;
  grid-template-columns: minmax(220px, 1fr) auto minmax(220px, 1fr);
  align-items: center;
  gap: 24px;
  min-height: 72px;
  padding: 10px 28px;
  border-bottom: 1px solid rgba(102, 126, 234, 0.16);
  color: #303950;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 6px 24px rgba(51, 57, 93, 0.08);
  backdrop-filter: blur(18px) saturate(150%);
}

.app-navigation::after {
  position: absolute;
  right: 0;
  bottom: -1px;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(102, 126, 234, 0.42), transparent);
  content: '';
  pointer-events: none;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 11px;
  width: fit-content;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.brand-mark {
  position: relative;
  display: grid;
  flex: 0 0 40px;
  width: 40px;
  height: 40px;
  place-items: center;
  overflow: hidden;
  border-radius: 13px 13px 13px 5px;
  color: #fff;
  background: linear-gradient(145deg, #667eea 0%, #7658a6 100%);
  box-shadow: 0 7px 16px rgba(102, 126, 234, 0.28);
  font-family: 'Songti SC', serif;
  font-size: 19px;
  font-weight: 700;
}

.brand-mark::after {
  position: absolute;
  top: -12px;
  right: -10px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.18);
  content: '';
}

.brand-copy {
  display: grid;
  gap: 1px;
  text-align: left;
}

.brand-copy strong {
  color: #303950;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.35;
}

.brand-copy small {
  color: #9298aa;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  line-height: 1.2;
}

.app-navigation nav {
  display: flex;
  gap: 5px;
  padding: 4px;
  border: 1px solid #e8e9f3;
  border-radius: 14px;
  background: #f6f6fb;
}

.app-navigation nav a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 96px;
  padding: 8px 14px;
  border-radius: 10px;
  color: #747b90;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.app-navigation nav a:hover {
  color: #5968ca;
  background: #fff;
}

.app-navigation nav a.router-link-active {
  color: #fff;
  background: linear-gradient(135deg, #667eea 0%, #7658a6 100%);
  box-shadow: 0 5px 13px rgba(102, 126, 234, 0.25);
}

.app-navigation nav a:active {
  transform: translateY(1px);
}

.brand:focus-visible,
.app-navigation nav a:focus-visible {
  outline: 3px solid rgba(102, 126, 234, 0.24);
  outline-offset: 3px;
}

.account {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.account .avatar {
  display: grid;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 12px;
  color: #fff;
  background: linear-gradient(145deg, #7c89e8, #7658a6);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.24);
  font-family: Georgia, serif;
  font-size: 15px;
  font-weight: 700;
}

.account-copy {
  display: grid;
  min-width: 0;
  gap: 1px;
}

.account-copy small {
  color: #9a9fb0;
  font-size: 10px;
  line-height: 1.2;
}

.account-copy strong {
  overflow: hidden;
  max-width: 130px;
  color: #3d465d;
  font-size: 13px;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account .logout-button.ant-btn {
  height: 30px;
  margin-left: 4px;
  padding-inline: 12px;
  border-color: #e1e3ed;
  border-radius: 9px;
  color: #697187;
  background: #fff;
  box-shadow: none;
}

.account .logout-button.ant-btn:hover {
  border-color: #b8c0ed;
  color: #5968ca;
  background: #f7f7ff;
}

@media (max-width: 980px) {
  .app-navigation {
    grid-template-columns: minmax(190px, 1fr) auto auto;
    gap: 16px;
    padding-inline: 20px;
  }

  .account-copy {
    display: none;
  }
}

@media (max-width: 760px) {
  .app-navigation {
    grid-template-areas:
      'brand account'
      'nav nav';
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 9px 12px;
    min-height: 112px;
    padding: 10px 14px;
  }

  .brand {
    grid-area: brand;
  }

  .brand-mark {
    flex-basis: 36px;
    width: 36px;
    height: 36px;
    border-radius: 11px 11px 11px 4px;
  }

  .brand-copy small {
    display: none;
  }

  .app-navigation nav {
    grid-area: nav;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    width: 100%;
  }

  .app-navigation nav a {
    min-width: 0;
    padding: 7px 5px;
    font-size: 12px;
  }

  .account {
    grid-area: account;
  }

  .account .avatar {
    width: 32px;
    height: 32px;
    flex-basis: 32px;
    border-radius: 10px;
  }

  .account .logout-button.ant-btn {
    margin-left: 0;
  }

  .app-content {
    padding: 0;
  }
}

@media (max-width: 420px) {
  .brand-copy strong {
    font-size: 15px;
  }

  .account .avatar {
    display: none;
  }

  .app-navigation nav a {
    gap: 4px;
    font-size: 11px;
  }
}
</style>
