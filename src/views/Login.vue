<template>
  <main class="auth-page">
    <div class="atlas-grid" aria-hidden="true"></div>
    <div class="route route-one" aria-hidden="true"></div>
    <div class="route route-two" aria-hidden="true"></div>

    <section class="story-panel">
      <p class="eyebrow">PERSONAL TRAVEL ATLAS</p>
      <h1>把每一段旅程，<br />收藏进自己的地图。</h1>
      <p class="intro">
        登录后，你的规划任务、行程版本、执行记录和质量报告都会独立保存，其他用户无法查看。
      </p>
      <div class="feature-list">
        <article><span>01</span><div><strong>断线继续</strong><p>后台规划不中断，重新登录即可恢复。</p></div></article>
        <article><span>02</span><div><strong>会话隔离</strong><p>历史行程、草稿和任务只属于当前账号。</p></div></article>
        <article><span>03</span><div><strong>持续打磨</strong><p>编辑、重新评估并保留每个确认版本。</p></div></article>
      </div>
    </section>

    <section class="auth-card">
      <div class="brand-mark" aria-hidden="true">行</div>
      <p class="card-kicker">{{ mode === 'login' ? 'WELCOME BACK' : 'CREATE YOUR ATLAS' }}</p>
      <h2>{{ mode === 'login' ? '继续规划下一站' : '创建旅行账户' }}</h2>
      <p class="card-subtitle">
        {{ mode === 'login' ? '登录后查看你的历史行程与进行中的任务。' : '注册成功后将自动登录。' }}
      </p>

      <div class="mode-switch" role="tablist" aria-label="登录或注册">
        <button :class="{ active: mode === 'login' }" type="button" @click="switchMode('login')">登录</button>
        <button :class="{ active: mode === 'register' }" type="button" @click="switchMode('register')">注册</button>
      </div>

      <a-form :model="form" layout="vertical" @finish="submit">
        <a-form-item
          label="用户名"
          name="username"
          :rules="[
            { required: true, message: '请输入用户名' },
            { pattern: /^[A-Za-z0-9_]{3,32}$/, message: '请输入 3～32 位字母、数字或下划线' }
          ]"
        >
          <a-input v-model:value="form.username" size="large" autocomplete="username" placeholder="例如 travel_lover" />
        </a-form-item>

        <a-form-item
          label="密码"
          name="password"
          :rules="[
            { required: true, message: '请输入密码' },
            { min: 8, max: 72, message: '密码长度需要为 8～72 位' }
          ]"
        >
          <a-input-password
            v-model:value="form.password"
            size="large"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            placeholder="至少 8 位字符"
          />
        </a-form-item>

        <a-form-item
          v-if="mode === 'register'"
          label="确认密码"
          name="confirmPassword"
          :rules="[{ validator: validateConfirmPassword, trigger: 'change' }]"
        >
          <a-input-password v-model:value="form.confirmPassword" size="large" autocomplete="new-password" placeholder="再次输入密码" />
        </a-form-item>

        <a-button class="submit-button" type="primary" html-type="submit" size="large" block :loading="submitting">
          {{ mode === 'login' ? '登录并继续' : '注册并开始规划' }}
        </a-button>
      </a-form>

      <p class="security-note">密码使用 Argon2id 加密保存 · 登录凭证默认有效 7 天</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { useRoute, useRouter } from 'vue-router'
import { loginUser, registerUser } from '@/services/api'

type AuthMode = 'login' | 'register'

const route = useRoute()
const router = useRouter()
const mode = ref<AuthMode>('login')
const submitting = ref(false)
const form = reactive({ username: '', password: '', confirmPassword: '' })

function switchMode(nextMode: AuthMode): void {
  mode.value = nextMode
  form.password = ''
  form.confirmPassword = ''
}

async function validateConfirmPassword(_rule: Rule, value: string): Promise<void> {
  if (!value) throw new Error('请再次输入密码')
  if (value !== form.password) throw new Error('两次输入的密码不一致')
}

async function submit(): Promise<void> {
  submitting.value = true
  try {
    const credentials = { username: form.username, password: form.password }
    const response = mode.value === 'login'
      ? await loginUser(credentials)
      : await registerUser(credentials)
    message.success(mode.value === 'login' ? `欢迎回来，${response.user.username}` : '注册成功，欢迎开始规划')
    const redirect = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/'
    await router.replace(redirect)
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : '认证失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.auth-page {
  --ink: #172a25;
  --forest: #244e3f;
  --route: #e85d3f;
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(380px, 0.85fr);
  position: relative;
  overflow: hidden;
  color: var(--ink);
  background: #efe9dd;
  font-family: 'Noto Serif SC', 'Songti SC', Georgia, serif;
}
.atlas-grid { position: absolute; inset: 0; opacity: .25; background-image: linear-gradient(rgba(36,78,63,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(36,78,63,.1) 1px, transparent 1px); background-size: 42px 42px; mask-image: linear-gradient(90deg, #000 0 60%, transparent 88%); }
.route { position: absolute; width: 44vw; height: 44vw; border: 2px dashed rgba(232,93,63,.34); border-radius: 50%; pointer-events: none; }
.route-one { left: -17vw; bottom: -21vw; }
.route-two { left: 32vw; top: -34vw; }
.story-panel { position: relative; z-index: 1; display: flex; flex-direction: column; justify-content: center; padding: clamp(54px, 8vw, 130px); background: radial-gradient(circle at 22% 18%, rgba(232,93,63,.18), transparent 28%); }
.eyebrow, .card-kicker { color: var(--route); font: 800 11px/1 sans-serif; letter-spacing: .22em; }
.story-panel h1 { margin: 22px 0; max-width: 720px; font-size: clamp(48px, 6vw, 88px); font-weight: 500; line-height: 1.08; letter-spacing: -.045em; }
.intro { max-width: 620px; color: #596761; font-size: 17px; line-height: 1.9; }
.feature-list { display: grid; gap: 18px; margin-top: 52px; max-width: 620px; }
.feature-list article { display: grid; grid-template-columns: 46px 1fr; gap: 16px; padding-top: 18px; border-top: 1px solid rgba(36,78,63,.18); }
.feature-list span { color: var(--route); font: 700 12px/1.6 ui-monospace, monospace; }
.feature-list strong { font-size: 17px; }
.feature-list p { margin: 5px 0 0; color: #6b756f; }
.auth-card { position: relative; z-index: 2; align-self: center; width: min(470px, calc(100% - 48px)); margin: 40px auto; padding: clamp(34px, 5vw, 56px); border: 1px solid rgba(36,78,63,.14); background: rgba(255,253,248,.94); box-shadow: 0 36px 90px rgba(42,53,47,.16); backdrop-filter: blur(18px); animation: enter .55s ease both; }
.brand-mark { display: grid; place-items: center; width: 50px; height: 50px; margin-bottom: 28px; color: #fff; background: var(--forest); border-radius: 50% 50% 50% 12%; font-size: 22px; }
.auth-card h2 { margin: 10px 0 8px; font-size: 31px; }
.card-subtitle { margin-bottom: 28px; color: #728079; }
.mode-switch { display: grid; grid-template-columns: 1fr 1fr; margin-bottom: 28px; padding: 4px; background: #ede8de; border-radius: 10px; }
.mode-switch button { padding: 10px; border: 0; border-radius: 7px; color: #79817d; background: transparent; cursor: pointer; font-weight: 700; transition: .2s ease; }
.mode-switch button.active { color: var(--forest); background: #fffdf8; box-shadow: 0 4px 14px rgba(36,78,63,.1); }
.submit-button { height: 48px; margin-top: 8px; border-color: var(--forest); background: var(--forest); font-weight: 700; }
.submit-button:hover { border-color: #326a55 !important; background: #326a55 !important; }
.security-note { margin: 22px 0 0; color: #8a918d; font: 12px/1.6 sans-serif; text-align: center; }
@keyframes enter { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 900px) {
  .auth-page { grid-template-columns: 1fr; }
  .story-panel { display: none; }
  .auth-card { min-height: auto; }
}
</style>
