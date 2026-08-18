<template>
  <section id="execution-quality" class="quality-board">
    <header>
      <div>
        <p>DETERMINISTIC CHECKS</p>
        <h2>通勤质量与约束报告</h2>
      </div>
      <a-tag :color="constraint?.feasible !== false ? 'success' : 'error'">
        {{ constraint?.feasible !== false ? '整体可执行' : '存在阻断约束' }}
      </a-tag>
    </header>

    <div class="score-grid">
      <div class="score-card route">
        <span>路线质量</span>
        <strong>{{ score(route?.quality_score) }}</strong>
        <small>{{ route?.unavailable_legs || 0 }} 段不可用 · {{ route?.excessive_duration_legs || 0 }} 段过长</small>
      </div>
      <div class="score-card schedule">
        <span>日程质量</span>
        <strong>{{ score(schedule?.quality_score) }}</strong>
        <small>{{ schedule?.infeasible_days || 0 }} 天超时 · {{ schedule?.total_overtime_minutes || 0 }} 分钟</small>
      </div>
      <div class="score-card constraint">
        <span>约束质量</span>
        <strong>{{ score(constraint?.quality_score) }}</strong>
        <small>{{ constraint?.error_count || 0 }} 错误 · {{ constraint?.warning_count || 0 }} 警告</small>
      </div>
      <div class="score-card commute">
        <span>通勤超限</span>
        <strong>{{ commute?.excessive_segment_count || 0 }}</strong>
        <small>最长 {{ formatDuration(commute?.max_duration_seconds) }}</small>
      </div>
    </div>

    <div v-if="commute?.issues?.length || constraint?.issues?.length" class="issue-grid">
      <div v-if="commute?.issues?.length" class="issue-panel">
        <h3>过长通勤分段</h3>
        <div v-for="issue in commute.issues" :key="`${issue.day_index}-${issue.leg_index}`" class="issue-item">
          <span class="issue-index">D{{ issue.day_index + 1 }}</span>
          <div>
            <strong>{{ issue.origin_name }} → {{ issue.destination_name }}</strong>
            <p>实际 {{ formatDuration(issue.duration_seconds) }}，超过限制 {{ formatDuration(issue.excess_seconds) }}</p>
          </div>
        </div>
      </div>
      <div v-if="constraint?.issues?.length" class="issue-panel">
        <h3>可执行性约束</h3>
        <div v-for="issue in constraint.issues" :key="`${issue.code}-${issue.path}`" class="issue-item">
          <span class="issue-index" :class="issue.severity">{{ issue.severity === 'error' ? '错' : '警' }}</span>
          <div>
            <strong>{{ issue.message }}</strong>
            <p>{{ issue.repair_hint }}</p>
          </div>
        </div>
      </div>
    </div>

    <a-alert
      v-else
      type="success"
      show-icon
      message="未发现需要展示的通勤或可执行性冲突"
      description="路线、日程和行程结构已经通过当前确定性规则检查。"
    />
  </section>
</template>

<script setup lang="ts">
import type {
  CommuteConstraintReport,
  RouteQualityReport,
  ScheduleQualityReport,
  TripConstraintReport
} from '@/types'

defineProps<{
  route?: RouteQualityReport | null
  schedule?: ScheduleQualityReport | null
  commute?: CommuteConstraintReport | null
  constraint?: TripConstraintReport | null
}>()

const score = (value?: number | null) => value == null ? '—' : value.toFixed(0)
const formatDuration = (seconds?: number | null) => {
  if (!seconds) return '0 分钟'
  const minutes = Math.round(seconds / 60)
  return minutes < 60 ? `${minutes} 分钟` : `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`
}
</script>

<style scoped>
.quality-board { margin-top: 24px; padding: 28px; border: 1px solid #e7dfd0; border-radius: 20px; background: #fffdf8; box-shadow: 0 18px 45px rgba(83, 63, 31, .08); }
header { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 22px; }
header p { margin: 0 0 5px; color: #a36e24; font-size: 11px; font-weight: 800; letter-spacing: .16em; }
h2 { margin: 0; color: #4c3821; font: 700 28px/1.2 "Microsoft YaHei", sans-serif; }
.score-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.score-card { position: relative; overflow: hidden; min-height: 130px; padding: 18px; border-radius: 15px; color: #fff; background: #315d4b; }
.score-card::after { content: ''; position: absolute; right: -25px; bottom: -35px; width: 90px; height: 90px; border: 18px solid rgba(255,255,255,.1); border-radius: 50%; }
.score-card.schedule { background: #355e73; }
.score-card.constraint { background: #7b5a2f; }
.score-card.commute { background: #70483d; }
.score-card span { display: block; color: rgba(255,255,255,.75); font-size: 12px; }
.score-card strong { display: block; margin: 5px 0; font-size: 38px; line-height: 1; }
.score-card small { color: rgba(255,255,255,.76); }
.issue-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; margin-top: 18px; }
.issue-panel { padding: 18px; border: 1px solid #eadfca; border-radius: 14px; background: #fff; }
h3 { margin: 0 0 12px; color: #5a4226; font-size: 15px; }
.issue-item { display: flex; gap: 10px; padding: 11px 0; border-top: 1px solid #f0e8da; }
.issue-item:first-of-type { border-top: 0; }
.issue-index { flex: 0 0 34px; display: grid; place-items: center; align-self: flex-start; height: 28px; border-radius: 8px; color: #784f15; background: #f4e4c4; font-size: 11px; font-weight: 800; }
.issue-index.error { color: #a82e21; background: #fee5df; }
.issue-index.warning { color: #8b631c; background: #fff2cc; }
.issue-item strong { color: #4c3821; font-size: 13px; }
.issue-item p { margin: 4px 0 0; color: #7e7160; font-size: 12px; }
@media (max-width: 900px) { .score-grid { grid-template-columns: repeat(2, 1fr); } .issue-grid { grid-template-columns: 1fr; } }
@media (max-width: 520px) { .score-grid { grid-template-columns: 1fr; } .quality-board { padding: 20px 14px; } }
</style>
