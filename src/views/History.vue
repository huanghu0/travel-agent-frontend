<template>
  <div class="history-page">
    <div class="history-shell">
      <header class="history-header">
        <div>
          <div class="eyebrow">SESSION ARCHIVE</div>
          <h1>历史行程</h1>
        </div>
        <a-space wrap>
          <a-button size="large" @click="router.push('/')">返回首页</a-button>
          <a-button type="primary" size="large" :loading="loading" @click="loadSessions">
            刷新列表
          </a-button>
        </a-space>
      </header>

      <a-card :bordered="false" class="filter-card">
        <div class="filter-row">
          <div>
            <div class="filter-label">会话状态</div>
            <a-select
              v-model:value="statusFilter"
              allow-clear
              placeholder="全部状态"
              style="width: 220px"
              @change="loadSessions"
            >
              <a-select-option v-for="status in statuses" :key="status" :value="status">
                {{ getAgentStatusLabel(status) }}
              </a-select-option>
            </a-select>
          </div>
          <div class="session-count">共 {{ sessions.length }} 条最近会话</div>
        </div>
      </a-card>

      <div v-if="loading" class="loading-panel">
        <a-spin size="large" tip="正在读取历史会话..." />
      </div>

      <a-empty v-else-if="!sessions.length" description="没有找到符合条件的历史行程" />

      <div v-else class="session-grid">
        <article v-for="session in sessions" :key="session.session_id" class="session-card">
          <div class="card-topline">
            <a-tag :color="getAgentStatusColor(session.status)">
              {{ getAgentStatusLabel(session.status) }}
            </a-tag>
            <span>{{ formatSessionDate(session.updated_at) }}</span>
          </div>

          <div class="city-row">
            <div class="city-mark">{{ session.city.slice(0, 1) }}</div>
            <div>
              <h2>{{ session.city || '未知城市' }}</h2>
              <p>{{ session.action_count }} 个动作记录</p>
            </div>
          </div>

          <a-progress
            :percent="getProgress(session)"
            :status="session.status === 'failed' ? 'exception' : 'normal'"
            :show-info="false"
          />
          <div class="progress-caption">
            <span>执行进度</span>
            <strong>{{ session.current_step }} / {{ session.max_steps }}</strong>
          </div>

          <!-- <div class="session-id">{{ session.session_id }}</div> -->

          <div class="card-actions">
            <!-- <a-button @click="openDetails(session.session_id)">执行详情</a-button> -->
            <a-button @click="openResult(session.session_id)">查看行程</a-button>
            <a-popconfirm
              title="确定永久删除这条会话吗？"
              description="关联任务、草稿和版本也会一并删除，且无法恢复。"
              ok-text="确认删除"
              cancel-text="取消"
              @confirm="removeSession(session.session_id)"
            >
              <a-button danger :loading="deletingSessionId === session.session_id">删除</a-button>
            </a-popconfirm>
            <a-button
              v-if="canResumeSession(session.status)"
              type="primary"
              :loading="resumingSessionId === session.session_id"
              @click="resumeSession(session.session_id)"
            >
              恢复执行
            </a-button>
          </div>
        </article>
      </div>
    </div>

    <SessionDetailDrawer
      :open="detailOpen"
      :loading="detailLoading"
      :state="selectedState"
      @close="detailOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import SessionDetailDrawer from '@/components/SessionDetailDrawer.vue'
import { deleteTripSession, getTripSession, listTripSessions, resumeTripSession } from '@/services/api'
import type { AgentSessionSummary, AgentState, AgentStatus } from '@/types'
import {
  canResumeSession,
  formatSessionDate,
  getAgentStatusColor,
  getAgentStatusLabel
} from '@/utils/session'

const router = useRouter()
const loading = ref(false)
const sessions = ref<AgentSessionSummary[]>([])
const statusFilter = ref<AgentStatus | undefined>(undefined)
const resumingSessionId = ref('')
const deletingSessionId = ref('')
const detailOpen = ref(false)
const detailLoading = ref(false)
const selectedState = ref<AgentState | null>(null)

const statuses: AgentStatus[] = [
  'pending',
  'running',
  'completed',
  'failed',
  'max_steps_reached',
  'budget_exhausted',
  'convergence_stopped',
  'cancelled'
]

const loadSessions = async () => {
  loading.value = true
  try {
    sessions.value = await listTripSessions({
      limit: 100,
      status: statusFilter.value
    })
  } catch (error) {
    message.error(error instanceof Error ? error.message : '历史行程加载失败')
  } finally {
    loading.value = false
  }
}

const getProgress = (session: AgentSessionSummary): number => {
  if (session.status === 'completed') return 100
  return Math.min(100, Math.round((session.current_step / Math.max(1, session.max_steps)) * 100))
}

const openResult = (sessionId: string) => {
  router.push({ name: 'Result', params: { sessionId } })
}

const openDetails = async (sessionId: string) => {
  detailOpen.value = true
  detailLoading.value = true
  selectedState.value = null
  try {
    selectedState.value = await getTripSession(sessionId)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '会话详情加载失败')
  } finally {
    detailLoading.value = false
  }
}

const resumeSession = async (sessionId: string) => {
  resumingSessionId.value = sessionId
  try {
    const state = await resumeTripSession(sessionId)
    message.success(state.status === 'completed' ? '会话恢复完成' : '会话已从检查点继续执行')
    await loadSessions()
    if (state.trip_plan) {
      openResult(sessionId)
    } else {
      selectedState.value = state
      detailOpen.value = true
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '恢复会话失败')
  } finally {
    resumingSessionId.value = ''
  }
}

const removeSession = async (sessionId: string) => {
  deletingSessionId.value = sessionId
  try {
    await deleteTripSession(sessionId)
    sessions.value = sessions.value.filter((item) => item.session_id !== sessionId)
    if (selectedState.value?.session_id === sessionId) {
      detailOpen.value = false
      selectedState.value = null
    }
    message.success('旅行会话已永久删除')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '删除会话失败')
  } finally {
    deletingSessionId.value = ''
  }
}

onMounted(loadSessions)
</script>

<style scoped>
.history-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 8% 8%, rgba(14, 116, 144, 0.18), transparent 30%),
    radial-gradient(circle at 92% 16%, rgba(245, 158, 11, 0.16), transparent 28%),
    #f4f1ea;
  padding: 48px 24px 72px;
}

.history-shell {
  margin: 0 auto;
  max-width: 1280px;
}

.history-header {
  align-items: flex-end;
  display: flex;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 28px;
}

.eyebrow {
  color: #0e7490;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.22em;
}

.history-header h1 {
  color: #17313a;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(36px, 5vw, 64px);
  line-height: 1;
  margin: 10px 0 12px;
}

.history-header p {
  color: #64748b;
  font-size: 16px;
  margin: 0;
}

.filter-card {
  background: rgba(255, 255, 255, 0.78);
  border-radius: 18px;
  box-shadow: 0 18px 50px rgba(42, 55, 62, 0.08);
  margin-bottom: 24px;
}

.filter-row {
  align-items: flex-end;
  display: flex;
  justify-content: space-between;
  gap: 20px;
}

.filter-label {
  color: #475569;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
}

.session-count {
  color: #64748b;
}

.loading-panel {
  display: grid;
  min-height: 320px;
  place-items: center;
}

.session-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.session-card {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(14, 116, 144, 0.08);
  border-radius: 22px;
  box-shadow: 0 18px 50px rgba(42, 55, 62, 0.08);
  padding: 22px;
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.session-card:hover {
  box-shadow: 0 24px 60px rgba(42, 55, 62, 0.14);
  transform: translateY(-4px);
}

.card-topline,
.progress-caption,
.card-actions,
.city-row {
  align-items: center;
  display: flex;
}

.card-topline,
.progress-caption {
  justify-content: space-between;
}

.card-topline {
  color: #94a3b8;
  font-size: 12px;
}

.city-row {
  gap: 14px;
  margin: 24px 0;
}

.city-mark {
  background: #17313a;
  border-radius: 16px;
  color: #f8d477;
  display: grid;
  font-family: Georgia, serif;
  font-size: 28px;
  height: 56px;
  place-items: center;
  width: 56px;
}

.city-row h2 {
  color: #17313a;
  font-size: 24px;
  margin: 0 0 4px;
}

.city-row p,
.progress-caption {
  color: #64748b;
  font-size: 13px;
  margin: 0;
}

.progress-caption {
  margin-top: 8px;
}

.session-id {
  background: #f8fafc;
  border-radius: 8px;
  color: #94a3b8;
  font-family: Consolas, monospace;
  font-size: 11px;
  margin: 18px 0;
  overflow: hidden;
  padding: 9px 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

@media (max-width: 1000px) {
  .session-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 680px) {
  .history-page { padding: 28px 14px 48px; }
  .history-header, .filter-row { align-items: flex-start; flex-direction: column; }
  .session-grid { grid-template-columns: 1fr; }
}
</style>
