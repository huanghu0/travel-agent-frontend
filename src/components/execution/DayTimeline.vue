<template>
  <section id="execution-timeline" class="timeline-board">
    <header class="section-heading">
      <div class="heading-title">
        <span class="heading-icon" aria-hidden="true">⏱️</span>
        <h2>完整地点时间轴</h2>
      </div>
      <p class="section-note">按游览、通勤、餐饮与休息顺序整理每天的可执行安排</p>
    </header>

    <div class="board-content">
      <a-empty v-if="!report?.days?.length" description="当前会话尚无时间轴评估" />

      <div v-else class="timeline-days">
        <article v-for="day in report.days" :key="day.day_index" class="timeline-day">
          <div class="day-header">
            <div class="day-identity">
              <span class="day-index">D{{ day.day_index + 1 }}</span>
              <div>
                <strong>第 {{ day.day_index + 1 }} 天</strong>
                <small>{{ day.date }}</small>
              </div>
            </div>
            <a-tag :color="day.feasible ? 'success' : 'error'">
              {{ day.feasible ? '时间可执行' : `超时 ${day.overtime_minutes} 分钟` }}
            </a-tag>
          </div>

          <div class="timeline-list">
            <div
              v-for="(item, index) in day.timeline"
              :key="`${item.start_time}-${index}`"
              class="timeline-item"
            >
              <div class="time-column">
                <strong>{{ item.start_time }}</strong>
                <span>{{ item.end_time }}</span>
              </div>

              <div class="timeline-node" :class="item.item_type">
                <span>{{ itemIcon(item.item_type) }}</span>
              </div>

              <div class="activity-card" :class="item.item_type">
                <div class="activity-copy">
                  <small>{{ itemLabel(item.item_type) }}</small>
                  <strong>{{ item.name }}</strong>
                </div>
                <div class="activity-meta">
                  <span class="duration-chip">{{ item.duration_minutes }} 分钟</span>
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
.timeline-board {
  overflow: hidden;
  border: 1px solid var(--execution-border, #e8e8f2);
  border-radius: var(--execution-radius, 12px);
  background: var(--execution-surface, #fff);
  box-shadow: var(--execution-shadow, 0 4px 12px rgba(0, 0, 0, 0.08));
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.timeline-board:hover {
  box-shadow: var(--execution-shadow-hover, 0 8px 24px rgba(0, 0, 0, 0.12));
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  min-height: 57px;
  padding: 0 24px;
  color: #fff;
  background: var(--execution-header, linear-gradient(135deg, #667eea 0%, #764ba2 100%));
}

.heading-title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.heading-icon {
  display: inline-flex;
  align-items: center;
  font-size: 18px;
  line-height: 1;
}

h2 {
  margin: 0;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.section-note {
  overflow: hidden;
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
  font-size: 12px;
  line-height: 1.5;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.board-content {
  padding: 20px;
  background:
    radial-gradient(circle at 100% 0, rgba(102, 126, 234, 0.07), transparent 32%),
    #fff;
}

.timeline-days {
  display: grid;
  gap: 16px;
}

.timeline-day {
  overflow: hidden;
  border: 1px solid #e7e9f3;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(71, 78, 120, 0.06);
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 13px 16px;
  border-bottom: 1px solid #e9ebf4;
  background: linear-gradient(90deg, #f5f6ff 0%, #fbfbfe 72%, #f7f2fb 100%);
}

.day-identity {
  display: flex;
  align-items: center;
  gap: 11px;
}

.day-index {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 11px;
  color: #fff;
  background: linear-gradient(145deg, #667eea, #7658a6);
  box-shadow: 0 5px 12px rgba(102, 126, 234, 0.24);
  font-size: 12px;
  font-weight: 800;
}

.day-identity strong,
.day-identity small {
  display: block;
}

.day-identity strong {
  color: #303950;
  font-size: 15px;
}

.day-identity small {
  margin-top: 2px;
  color: #8a91a4;
  font-size: 11px;
}

.day-header :deep(.ant-tag) {
  margin-inline-end: 0;
  border-radius: 999px;
}

.timeline-list {
  padding: 18px 18px 8px;
}

.timeline-item {
  display: grid;
  grid-template-columns: 68px 36px minmax(0, 1fr);
  min-height: 78px;
}

.time-column {
  padding-top: 8px;
  text-align: right;
}

.time-column strong {
  display: block;
  color: #3a4359;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.time-column span {
  color: #9aa0af;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.timeline-node {
  position: relative;
  display: flex;
  justify-content: center;
  padding-top: 5px;
}

.timeline-node::after {
  position: absolute;
  top: 33px;
  bottom: -3px;
  width: 2px;
  border-radius: 999px;
  background: #e1e4f1;
  content: '';
}

.timeline-item:last-child .timeline-node::after {
  display: none;
}

.timeline-node span {
  z-index: 1;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 4px solid #eef0ff;
  border-radius: 50%;
  color: #fff;
  background: #667eea;
  box-shadow: 0 0 0 1px rgba(102, 126, 234, 0.18);
  font-size: 12px;
  font-weight: 800;
}

.timeline-node.transportation span {
  border-color: #e9f6fa;
  background: #4f9ab1;
  box-shadow: 0 0 0 1px rgba(79, 154, 177, 0.2);
}

.timeline-node.meal span {
  border-color: #fff5df;
  background: #d89b35;
  box-shadow: 0 0 0 1px rgba(216, 155, 53, 0.22);
}

.timeline-node.break span {
  border-color: #f0edf8;
  background: #8b78ad;
  box-shadow: 0 0 0 1px rgba(139, 120, 173, 0.2);
}

.activity-card {
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  min-width: 0;
  margin: 0 0 12px 8px;
  padding: 13px 14px 13px 16px;
  border: 1px solid #e8eaf2;
  border-radius: 11px;
  background: #fff;
  box-shadow: 0 3px 10px rgba(57, 64, 100, 0.045);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.activity-card::before {
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 0;
  width: 3px;
  border-radius: 0 4px 4px 0;
  background: #667eea;
  content: '';
}

.activity-card.transportation::before {
  background: #4f9ab1;
}

.activity-card.meal::before {
  background: #d89b35;
}

.activity-card.break::before {
  background: #8b78ad;
}

.activity-card:hover {
  border-color: #d7daf0;
  box-shadow: 0 7px 18px rgba(57, 64, 100, 0.08);
  transform: translateY(-1px);
}

.activity-copy {
  min-width: 0;
}

.activity-copy small {
  display: block;
  margin-bottom: 3px;
  color: #8b92a4;
  font-size: 11px;
}

.activity-copy strong {
  display: block;
  overflow: hidden;
  color: #303950;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 7px;
  color: #737b8f;
  font-size: 12px;
  white-space: nowrap;
}

.duration-chip {
  padding: 5px 9px;
  border-radius: 999px;
  color: #59637b;
  background: #f3f4f8;
  font-size: 11px;
  font-weight: 600;
}

.activity-meta :deep(.ant-tag) {
  margin-inline-end: 0;
  border-radius: 999px;
  font-size: 11px;
}

.board-content :deep(.ant-empty) {
  margin-block: 32px;
}

@media (max-width: 700px) {
  .board-content {
    padding: 14px;
  }

  .timeline-list {
    padding: 16px 12px 6px 8px;
  }

  .timeline-item {
    grid-template-columns: 54px 30px minmax(0, 1fr);
  }

  .activity-card {
    align-items: flex-start;
    flex-direction: column;
    gap: 9px;
    margin-left: 5px;
  }

  .activity-meta {
    justify-content: flex-start;
    white-space: normal;
  }
}

@media (max-width: 520px) {
  .section-heading {
    min-height: 56px;
    padding: 0 16px;
  }

  .section-note {
    display: none;
  }

  .day-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .timeline-item {
    grid-template-columns: 48px 28px minmax(0, 1fr);
  }
}
</style>
