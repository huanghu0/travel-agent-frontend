<template>
  <main class="planning-shell">
    <div class="map-grid" aria-hidden="true"></div>
    <div class="route-line route-line-a" aria-hidden="true"></div>
    <div class="route-line route-line-b" aria-hidden="true"></div>

    <section class="planning-card">
      <header class="planning-header">
        <div>
          <p class="eyebrow">LIVE ITINERARY BUILD</p>
          <h1>{{ task?.request.city || '正在读取目的地' }} · 行程正在成形</h1>
          <p class="subtitle">
            任务已经交给后台 Worker。关闭页面、刷新或暂时断网都不会中断执行。
          </p>
        </div>
        <div class="connection-pill" :class="{ offline: !sseConnected }">
          <span class="signal-dot"></span>
          {{ sseConnected ? '实时连接' : '自动恢复中' }}
        </div>
      </header>

      <div v-if="loading && !task" class="skeleton-block">
        <a-skeleton active :paragraph="{ rows: 6 }" />
      </div>

      <template v-else-if="task">
        <section class="progress-panel">
          <div class="progress-copy">
            <span class="stage-index">{{ paddedStep }}</span>
            <div>
              <p class="stage-label">当前阶段</p>
              <h2>{{ task.stage_name }}</h2>
              <p>{{ task.message }}</p>
            </div>
          </div>
          <div class="progress-number">{{ Math.round(task.progress_percent) }}<small>%</small></div>
          <a-progress
            class="route-progress"
            :percent="Math.round(task.progress_percent)"
            :show-info="false"
            :stroke-width="8"
            stroke-color="#e85d3f"
            trail-color="#e8e0d2"
          />
        </section>

        <section class="metric-row">
          <article>
            <span>物理步骤</span>
            <strong>{{ task.current_step }} / {{ task.max_steps || '—' }}</strong>
          </article>
          <article>
            <span>执行尝试</span>
            <strong>{{ task.attempt }}</strong>
          </article>
          <article>
            <span>恢复次数</span>
            <strong>{{ task.recovery_count }}</strong>
          </article>
          <article>
            <span>任务状态</span>
            <strong :class="`status-${task.status}`">{{ statusLabel }}</strong>
          </article>
        </section>

        <section v-if="task.failure_report" class="failure-report">
          <div class="failure-mark">!</div>
          <div>
            <p class="failure-code">{{ task.failure_report.code }}</p>
            <h3>{{ task.failure_report.stage_name }}执行失败</h3>
            <p>{{ task.failure_report.message }}</p>
            <dl>
              <template v-if="task.failure_report.provider_code">
                <dt>供应商代码</dt>
                <dd>{{ task.failure_report.provider_code }}</dd>
              </template>
              <dt>异常类型</dt>
              <dd>{{ task.failure_report.exception_type }}</dd>
              <dt>执行位置</dt>
              <dd>{{ task.failure_report.current_step }} / {{ task.failure_report.max_steps }}</dd>
            </dl>
          </div>
        </section>

        <section class="event-section">
          <div class="section-heading">
            <div>
              <p class="eyebrow">EXECUTION LOG</p>
              <h2>后台执行轨迹</h2>
            </div>
            <button class="text-button" type="button" @click="refreshTask">刷新状态</button>
          </div>

          <div class="timeline" aria-live="polite">
            <div v-if="events.length === 0" class="empty-event">等待第一个执行事件...</div>
            <article v-for="event in visibleEvents" :key="event.event_id" class="event-item">
              <span class="event-node" :class="event.event_type"></span>
              <div class="event-copy">
                <div>
                  <strong>{{ event.stage_name }}</strong>
                  <time>{{ formatTime(event.created_at) }}</time>
                </div>
                <p>{{ event.message }}</p>
              </div>
            </article>
          </div>
        </section>

        <footer class="action-bar">
          <div>
            <span>任务编号</span>
            <code>{{ task.task_id }}</code>
          </div>
          <div class="actions">
            <a-button @click="router.push('/history')">查看历史</a-button>
            <a-button
              v-if="canCancel"
              danger
              :loading="cancelling"
              @click="handleCancel"
            >
              取消任务
            </a-button>
            <a-button
              v-if="task.status === 'failed' || task.status === 'timed_out' || task.status === 'cancelled'"
              type="primary"
              @click="router.push('/')"
            >
              重新规划
            </a-button>
          </div>
        </footer>
      </template>

      <a-result
        v-else
        status="404"
        title="未找到这个规划任务"
        sub-title="任务可能已被清理，或者链接不完整。"
      >
        <template #extra>
          <a-button type="primary" @click="router.push('/')">返回首页</a-button>
        </template>
      </a-result>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute, useRouter } from 'vue-router'
import {
  cancelTripTask,
  getTripTask,
  openTripTaskEventStream
} from '@/services/api'
import type { TripTaskSseMessage } from '@/services/api'
import type { TripPlanningTask, TripTaskEvent } from '@/types'

const route = useRoute()
const router = useRouter()
const taskId = computed(() => String(route.params.taskId || ''))
const task = ref<TripPlanningTask | null>(null)
const events = ref<TripTaskEvent[]>([])
const loading = ref(true)
const cancelling = ref(false)
const sseConnected = ref(false)
const lastEventId = ref(0)
const seenEventIds = new Set<number>()
let source: AbortController | null = null
let reconnectTimer: number | null = null
let pollTimer: number | null = null
let redirecting = false

const terminalStatuses = new Set(['succeeded', 'failed', 'cancelled', 'timed_out'])
const eventTypes = [
  'task_queued',
  'task_started',
  'task_recovered',
  'action_started',
  'action_completed',
  'action_retrying',
  'checkpoint_saved',
  'cancellation_requested',
  'task_succeeded',
  'task_failed',
  'task_cancelled',
  'task_timed_out'
]

const visibleEvents = computed(() => [...events.value].slice(-14).reverse())
const canCancel = computed(() => Boolean(task.value && !terminalStatuses.has(task.value.status)))
const paddedStep = computed(() => String(task.value?.current_step || 0).padStart(2, '0'))
const statusLabel = computed(() => {
  const labels: Record<string, string> = {
    queued: '等待中',
    running: '执行中',
    retrying: '重试中',
    succeeded: '已完成',
    failed: '已失败',
    cancelled: '已取消',
    timed_out: '已超时'
  }
  return labels[task.value?.status || ''] || task.value?.status || '未知'
})

function formatTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(new Date(value))
}

async function refreshTask(): Promise<void> {
  if (!taskId.value) return
  try {
    task.value = await getTripTask(taskId.value)
    if (task.value.status === 'succeeded' && task.value.result_session_id && !redirecting) {
      redirecting = true
      closeStreams()
      await router.replace({
        name: 'Result',
        params: { sessionId: task.value.result_session_id }
      })
    }
    if (terminalStatuses.has(task.value.status)) {
      source?.abort()
      source = null
      sseConnected.value = false
    }
  } catch (error: unknown) {
    const detail = error instanceof Error ? error.message : '读取任务状态失败'
    if (!task.value) message.error(detail)
  } finally {
    loading.value = false
  }
}

function consumeEvent(raw: TripTaskSseMessage): void {
  const eventId = Number(raw.lastEventId)
  if (Number.isFinite(eventId) && eventId > 0) {
    if (seenEventIds.has(eventId)) return
    seenEventIds.add(eventId)
    lastEventId.value = Math.max(lastEventId.value, eventId)
  }
  try {
    const event = JSON.parse(raw.data) as TripTaskEvent
    events.value.push(event)
    if (task.value) {
      task.value.current_stage = event.stage
      task.value.stage_name = event.stage_name
      task.value.progress_percent = Math.max(task.value.progress_percent, event.progress_percent)
      task.value.current_step = Math.max(task.value.current_step, event.current_step)
      task.value.message = event.message
    }
    if (event.event_type.startsWith('task_')) void refreshTask()
  } catch {
    // 心跳使用 SSE comment，不会进入此分支；单个坏事件不影响后续重连。
  }
}

function scheduleReconnect(): void {
  if (reconnectTimer !== null || (task.value && terminalStatuses.has(task.value.status))) return
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = null
    connectSse()
  }, 1500)
}

function connectSse(): void {
  if (!taskId.value || source || (task.value && terminalStatuses.has(task.value.status))) return
  source = openTripTaskEventStream(taskId.value, lastEventId.value, {
    onOpen: () => {
      sseConnected.value = true
    },
    onEvent: (event) => {
      if (eventTypes.includes(event.event)) consumeEvent(event)
    },
    onClose: () => {
      source = null
      sseConnected.value = false
      void refreshTask().finally(scheduleReconnect)
    },
    onError: () => {
      source = null
      sseConnected.value = false
      scheduleReconnect()
    }
  })
}

async function handleCancel(): Promise<void> {
  if (!task.value || !window.confirm('确定取消这个旅行规划任务吗？当前外部请求会在安全检查点后停止。')) {
    return
  }
  cancelling.value = true
  try {
    const result = await cancelTripTask(task.value.task_id)
    task.value.cancel_requested = result.cancel_requested
    task.value.status = result.status
    task.value.message = result.message
    message.success(result.status === 'cancelled' ? '任务已取消' : '取消请求已提交')
    await refreshTask()
  } catch (error: unknown) {
    message.error(error instanceof Error ? error.message : '取消任务失败')
  } finally {
    cancelling.value = false
  }
}

function closeStreams(): void {
  source?.abort()
  source = null
  if (reconnectTimer !== null) {
    window.clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (pollTimer !== null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
}

onMounted(async () => {
  await refreshTask()
  connectSse()
  // SSE 之外保留低频状态轮询，代理不支持长连接时仍能恢复进度和终态。
  pollTimer = window.setInterval(() => void refreshTask(), 4000)
})

onBeforeUnmount(closeStreams)
</script>

<style scoped>
.planning-shell {
  --ink: #1d2a26;
  --paper: #f5f0e6;
  --paper-deep: #e8e0d2;
  --route: #e85d3f;
  --forest: #315847;
  position: relative;
  min-height: calc(100vh - 48px);
  overflow: hidden;
  padding: clamp(18px, 4vw, 64px);
  color: var(--ink);
  background:
    radial-gradient(circle at 82% 10%, rgba(232, 93, 63, 0.14), transparent 28%),
    radial-gradient(circle at 5% 90%, rgba(49, 88, 71, 0.16), transparent 34%),
    var(--paper);
  font-family: 'Noto Serif SC', 'Songti SC', Georgia, serif;
}

.map-grid {
  position: absolute;
  inset: 0;
  opacity: 0.26;
  background-image:
    linear-gradient(rgba(49, 88, 71, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(49, 88, 71, 0.12) 1px, transparent 1px);
  background-size: 42px 42px;
  mask-image: linear-gradient(to bottom, black, transparent 85%);
}

.route-line {
  position: absolute;
  width: 360px;
  height: 360px;
  border: 2px dashed rgba(232, 93, 63, 0.38);
  border-radius: 48% 52% 65% 35%;
  pointer-events: none;
}
.route-line-a { top: -170px; right: -80px; transform: rotate(23deg); }
.route-line-b { bottom: -250px; left: -100px; transform: rotate(-18deg); }

.planning-card {
  position: relative;
  z-index: 1;
  width: min(1080px, 100%);
  margin: 0 auto;
  border: 1px solid rgba(29, 42, 38, 0.16);
  background: rgba(255, 253, 248, 0.92);
  box-shadow: 0 28px 80px rgba(49, 64, 57, 0.14);
  backdrop-filter: blur(18px);
  animation: card-in 0.6s ease-out both;
}

.planning-header,
.progress-panel,
.metric-row,
.event-section,
.action-bar { padding: clamp(22px, 4vw, 42px); }

.planning-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 28px;
  border-bottom: 1px solid var(--paper-deep);
}

.eyebrow {
  margin: 0 0 8px;
  color: var(--route);
  font: 700 11px/1.2 ui-monospace, SFMono-Regular, Menlo, monospace;
  letter-spacing: 0.18em;
}

h1, h2, h3, p { margin-top: 0; }
h1 { margin-bottom: 12px; font-size: clamp(28px, 5vw, 48px); line-height: 1.08; letter-spacing: -0.04em; }
.subtitle { max-width: 650px; margin-bottom: 0; color: #66716b; line-height: 1.8; }

.connection-pill {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border: 1px solid rgba(49, 88, 71, 0.22);
  border-radius: 999px;
  color: var(--forest);
  background: rgba(49, 88, 71, 0.08);
  font: 700 12px/1 sans-serif;
}
.connection-pill.offline { color: #86634b; background: #f4e5d5; border-color: #e5c7aa; }
.signal-dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 5px rgba(49, 88, 71, 0.1); animation: pulse 1.8s infinite; }

.progress-panel {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 28px;
  background: linear-gradient(115deg, rgba(49, 88, 71, 0.07), transparent 52%);
}
.progress-copy { display: flex; gap: 20px; align-items: flex-start; }
.stage-index { color: var(--route); font: 300 clamp(44px, 7vw, 76px)/0.9 Georgia, serif; }
.stage-label { margin-bottom: 5px; color: #7a817d; font: 700 11px/1 sans-serif; letter-spacing: 0.12em; text-transform: uppercase; }
.progress-copy h2 { margin-bottom: 8px; font-size: clamp(22px, 3vw, 32px); }
.progress-copy p:last-child { margin-bottom: 0; color: #69736e; }
.progress-number { align-self: center; color: var(--forest); font: 300 clamp(40px, 6vw, 68px)/1 Georgia, serif; }
.progress-number small { font-size: 20px; }
.route-progress { grid-column: 1 / -1; }

.metric-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  padding-top: 0;
  padding-bottom: 0;
  background: var(--paper-deep);
  border-top: 1px solid var(--paper-deep);
  border-bottom: 1px solid var(--paper-deep);
}
.metric-row article { padding: 22px; background: #fffdf8; }
.metric-row span { display: block; margin-bottom: 7px; color: #8a918d; font: 700 11px/1 sans-serif; letter-spacing: 0.08em; }
.metric-row strong { font-size: 20px; }
.status-succeeded { color: #247044; }
.status-failed, .status-timed_out { color: #b53d2c; }
.status-cancelled { color: #766a60; }

.event-section { border-bottom: 1px solid var(--paper-deep); }
.section-heading { display: flex; justify-content: space-between; align-items: end; margin-bottom: 24px; }
.section-heading h2 { margin-bottom: 0; font-size: 25px; }
.text-button { border: 0; color: var(--forest); background: transparent; cursor: pointer; font-weight: 700; }
.timeline { display: grid; gap: 2px; max-height: 440px; overflow: auto; }
.event-item { display: grid; grid-template-columns: 18px 1fr; gap: 15px; padding: 14px 4px; border-bottom: 1px solid #eee7db; }
.event-node { width: 10px; height: 10px; margin-top: 5px; border: 2px solid var(--forest); border-radius: 50%; background: #fffdf8; }
.event-node.action_started { border-color: var(--route); background: var(--route); }
.event-node.task_succeeded { border-color: #247044; background: #247044; }
.event-node.task_failed, .event-node.task_timed_out { border-color: #b53d2c; background: #b53d2c; }
.event-copy > div { display: flex; justify-content: space-between; gap: 20px; }
.event-copy strong { font-size: 15px; }
.event-copy time { color: #8d948f; font: 12px/1.4 ui-monospace, monospace; }
.event-copy p { margin: 5px 0 0; color: #68716c; line-height: 1.55; }
.empty-event { padding: 38px; text-align: center; color: #8d948f; border: 1px dashed #d8cfc0; }

.failure-report {
  display: grid;
  grid-template-columns: 48px 1fr;
  gap: 18px;
  margin: 28px clamp(22px, 4vw, 42px) 0;
  padding: 24px;
  color: #5f2920;
  border: 1px solid #e8b6a9;
  background: #fff1ec;
}
.failure-mark { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; color: white; background: #b53d2c; font: 700 24px/1 sans-serif; }
.failure-code { margin-bottom: 6px; font: 700 11px/1 ui-monospace, monospace; letter-spacing: 0.08em; }
.failure-report h3 { margin-bottom: 8px; }
.failure-report dl { display: grid; grid-template-columns: 110px 1fr; gap: 6px 12px; margin: 16px 0 0; font-size: 13px; }
.failure-report dt { font-weight: 700; }
.failure-report dd { margin: 0; }

.action-bar { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.action-bar > div:first-child span { display: block; margin-bottom: 5px; color: #8c938f; font: 11px/1 sans-serif; }
.action-bar code { color: #43514a; font-size: 12px; word-break: break-all; }
.actions { display: flex; gap: 10px; }
.skeleton-block { padding: 50px; }

@keyframes card-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 50% { opacity: 0.4; transform: scale(0.82); } }

@media (max-width: 760px) {
  .planning-shell { padding: 8px; }
  .planning-header, .action-bar { flex-direction: column; align-items: stretch; }
  .connection-pill { align-self: flex-start; }
  .progress-panel { grid-template-columns: 1fr; }
  .progress-number { position: absolute; right: 24px; }
  .metric-row { grid-template-columns: repeat(2, 1fr); }
  .actions { width: 100%; }
  .actions :deep(.ant-btn) { flex: 1; }
}
</style>
