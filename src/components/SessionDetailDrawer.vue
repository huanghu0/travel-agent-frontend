<template>
  <a-drawer
    :open="open"
    title="智能体会话详情"
    width="min(760px, 92vw)"
    @close="emit('close')"
  >
    <div v-if="loading" class="drawer-loading">
      <a-spin tip="正在读取 SQLite 会话检查点..." />
    </div>

    <template v-else-if="state">
      <a-descriptions :column="2" bordered size="small">
        <a-descriptions-item label="会话状态">
          <a-tag :color="getAgentStatusColor(state.status)">
            {{ getAgentStatusLabel(state.status) }}
          </a-tag>
        </a-descriptions-item>
        <a-descriptions-item label="目的地">{{ state.request.city }}</a-descriptions-item>
        <a-descriptions-item label="日期">
          {{ state.request.start_date }} 至 {{ state.request.end_date }}
        </a-descriptions-item>
        <a-descriptions-item label="执行进度">
          {{ state.current_step }} / {{ state.max_steps }}
        </a-descriptions-item>
        <a-descriptions-item label="工具调用">{{ state.tool_call_count }}</a-descriptions-item>
        <a-descriptions-item label="LLM 调用">{{ state.llm_call_count }}</a-descriptions-item>
        <a-descriptions-item label="重试次数">{{ state.total_retry_count }}</a-descriptions-item>
        <a-descriptions-item label="累计耗时">
          {{ formatDuration(state.total_duration_ms) }}
        </a-descriptions-item>
        <a-descriptions-item label="创建时间">
          {{ formatSessionDate(state.created_at) }}
        </a-descriptions-item>
        <a-descriptions-item label="更新时间">
          {{ formatSessionDate(state.updated_at) }}
        </a-descriptions-item>
        <a-descriptions-item label="会话 ID" :span="2">
          <span class="session-code">{{ state.session_id }}</span>
        </a-descriptions-item>
      </a-descriptions>

      <a-card v-if="state.acceptance_report" title="质量验收" size="small" class="detail-card">
        <div class="quality-row">
          <a-tag :color="state.acceptance_report.accepted ? 'success' : 'warning'">
            {{ state.acceptance_report.accepted ? '达到交付标准' : '尚未达到交付标准' }}
          </a-tag>
          <strong>{{ state.acceptance_report.quality_score.toFixed(1) }} 分</strong>
        </div>
        <p class="detail-reason">{{ state.acceptance_report.reason }}</p>
        <a-alert
          v-if="state.acceptance_report.blocking_reasons.length"
          type="error"
          show-icon
          message="阻断原因"
          :description="state.acceptance_report.blocking_reasons.join('；')"
        />
      </a-card>

      <a-alert
        v-if="state.errors.length"
        type="error"
        show-icon
        message="执行错误"
        class="detail-card"
      >
        <template #description>
          <ul class="error-list">
            <li v-for="error in state.errors" :key="error">{{ error }}</li>
          </ul>
        </template>
      </a-alert>

      <a-card title="动作历史" size="small" class="detail-card">
        <a-empty v-if="!state.action_history.length" description="暂无动作记录" />
        <a-timeline v-else>
          <a-timeline-item
            v-for="(record, index) in [...state.action_history].reverse()"
            :key="`${record.step}-${record.action}-${index}`"
            :color="record.success ? 'green' : 'red'"
          >
            <div class="action-title">
              <strong>步骤 {{ record.step }} · {{ getAgentActionLabel(record.action) }}</strong>
              <a-tag v-if="record.compressed" color="blue">压缩执行</a-tag>
              <a-tag :color="record.success ? 'success' : 'error'">
                {{ record.success ? '成功' : '失败' }}
              </a-tag>
            </div>
            <div class="action-meta">
              尝试 {{ record.attempt }} · {{ record.duration_ms }}ms ·
              {{ formatSessionDate(record.recorded_at) }}
            </div>
            <div class="action-reason">{{ record.reason }}</div>
            <div v-if="record.error" class="action-error">{{ record.error }}</div>
          </a-timeline-item>
        </a-timeline>
      </a-card>
    </template>

    <a-empty v-else description="暂无会话详情" />
  </a-drawer>
</template>

<script setup lang="ts">
import type { AgentState } from '@/types'
import {
  formatSessionDate,
  getAgentActionLabel,
  getAgentStatusColor,
  getAgentStatusLabel
} from '@/utils/session'

defineProps<{
  open: boolean
  loading?: boolean
  state: AgentState | null
}>()

const emit = defineEmits<{
  close: []
}>()

const formatDuration = (durationMs: number): string => {
  if (durationMs < 1000) return `${durationMs}ms`
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)} 秒`
  return `${(durationMs / 60000).toFixed(1)} 分钟`
}
</script>

<style scoped>
.drawer-loading {
  display: grid;
  min-height: 280px;
  place-items: center;
}

.detail-card {
  margin-top: 18px;
}

.session-code {
  color: #475569;
  font-family: Consolas, 'Courier New', monospace;
  word-break: break-all;
}

.quality-row,
.action-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.detail-reason,
.action-reason {
  color: #475569;
  line-height: 1.7;
  margin: 10px 0 0;
}

.action-meta {
  color: #94a3b8;
  font-size: 12px;
  margin-top: 4px;
}

.action-error {
  background: #fff1f0;
  border-radius: 6px;
  color: #cf1322;
  margin-top: 8px;
  padding: 8px 10px;
}

.error-list {
  margin: 0;
  padding-left: 20px;
}
</style>
