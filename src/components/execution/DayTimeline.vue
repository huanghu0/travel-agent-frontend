<template>
  <section id="execution-timeline" class="timeline-board">
    <header class="section-heading">
      <div>
        <p class="eyebrow">FULL DAY SCHEDULE</p>
        <h2>完整地点时间轴</h2>
      </div>
      <div v-if="report" class="timeline-summary">
        <span>{{ report.feasible_days }} 天可执行</span>
        <span>{{ report.total_transportation_minutes }} 分钟通勤</span>
        <span v-if="report.fallback_route_legs">{{ report.fallback_route_legs }} 段为估算路线</span>
      </div>
    </header>

    <a-empty v-if="!report?.days?.length" description="当前会话尚无时间轴评估" />
    <div v-else class="timeline-days">
      <article v-for="day in report.days" :key="day.day_index" class="timeline-day">
        <div class="day-header">
          <div>
            <span>第 {{ day.day_index + 1 }} 天</span>
            <strong>{{ day.date }}</strong>
          </div>
          <a-tag :color="day.feasible ? 'success' : 'error'">
            {{ day.feasible ? '时间可执行' : `超时 ${day.overtime_minutes} 分钟` }}
          </a-tag>
        </div>
        <div class="timeline-list">
          <div v-for="(item, index) in day.timeline" :key="`${item.start_time}-${index}`" class="timeline-item">
            <div class="time-column">
              <strong>{{ item.start_time }}</strong>
              <span>{{ item.end_time }}</span>
            </div>
            <div class="timeline-node" :class="item.item_type">
              <span>{{ itemIcon(item.item_type) }}</span>
            </div>
            <div class="activity-card">
              <div>
                <small>{{ itemLabel(item.item_type) }}</small>
                <strong>{{ item.name }}</strong>
              </div>
              <div class="activity-meta">
                <span>{{ item.duration_minutes }} 分钟</span>
                <a-tag
                  v-if="item.item_type === 'transportation'"
                  :color="item.transportation_time_source === 'amap' ? 'green' : 'orange'"
                >
                  {{ item.transportation_time_source === 'amap' ? '高德真实路线' : '直线距离估算' }}
                </a-tag>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { ScheduleQualityReport, TimelineItemType } from '@/types'

defineProps<{ report?: ScheduleQualityReport | null }>()

const itemLabel = (type: TimelineItemType) => ({
  attraction: '景点游览',
  transportation: '地点移动',
  meal: '餐饮安排',
  break: '休息缓冲'
}[type])

const itemIcon = (type: TimelineItemType) => ({
  attraction: '◎',
  transportation: '↝',
  meal: '◒',
  break: '◇'
}[type])
</script>

<style scoped>
.timeline-board { margin-top: 24px; padding: 28px; border-radius: 20px; background: #172b25; color: #fff; box-shadow: 0 22px 56px rgba(18, 43, 34, .18); }
.section-heading { display: flex; justify-content: space-between; align-items: flex-end; gap: 20px; margin-bottom: 24px; }
.eyebrow { margin: 0 0 6px; color: #7ec79e; font-size: 11px; font-weight: 800; letter-spacing: .16em; }
h2 { margin: 0; color: #fff; font: 700 28px/1.2 "Microsoft YaHei", sans-serif; }
.timeline-summary { display: flex; flex-wrap: wrap; gap: 8px; }
.timeline-summary span { padding: 7px 10px; border: 1px solid rgba(255,255,255,.14); border-radius: 999px; color: #d7e7de; font-size: 12px; }
.timeline-days { display: grid; gap: 18px; }
.timeline-day { overflow: hidden; border: 1px solid rgba(255,255,255,.12); border-radius: 16px; background: rgba(255,255,255,.045); }
.day-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,.1); }
.day-header div { display: flex; align-items: baseline; gap: 10px; }
.day-header span { color: #84c7a2; font-weight: 700; }
.day-header strong { color: #fff; font-size: 14px; }
.timeline-list { padding: 16px 20px; }
.timeline-item { display: grid; grid-template-columns: 76px 34px minmax(0, 1fr); min-height: 74px; }
.time-column { padding-top: 7px; text-align: right; }
.time-column strong { display: block; color: #fff; font-size: 14px; }
.time-column span { color: #8fa49a; font-size: 11px; }
.timeline-node { position: relative; display: flex; justify-content: center; padding-top: 5px; }
.timeline-node::after { content: ''; position: absolute; top: 30px; bottom: -6px; width: 1px; background: rgba(255,255,255,.16); }
.timeline-item:last-child .timeline-node::after { display: none; }
.timeline-node span { z-index: 1; display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; color: #153126; background: #7ec79e; font-weight: 800; }
.timeline-node.transportation span { background: #7db7c9; }
.timeline-node.meal span { background: #e4bb68; }
.timeline-node.break span { background: #a6a9c8; }
.activity-card { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin: 0 0 12px 8px; padding: 12px 14px; border-radius: 12px; background: rgba(255,255,255,.07); }
.activity-card small { display: block; margin-bottom: 3px; color: #91aa9e; }
.activity-card strong { color: #f5faf7; }
.activity-meta { display: flex; align-items: center; gap: 8px; color: #b9ccc2; font-size: 12px; white-space: nowrap; }
@media (max-width: 700px) {
  .section-heading { align-items: flex-start; flex-direction: column; }
  .timeline-board { padding: 20px 14px; }
  .timeline-item { grid-template-columns: 58px 28px minmax(0, 1fr); }
  .activity-card { align-items: flex-start; flex-direction: column; }
}
</style>
