<template>
  <section id="execution-routes" class="route-board">
    <header class="section-heading">
      <div class="heading-title">
        <span class="heading-icon" aria-hidden="true">🧭</span>
        <h2>真实路线分段</h2>
      </div>
      <p class="section-note">距离与耗时来自后端高德路线结果，地图仅展示地点分布</p>
    </header>

    <div class="board-content">
      <a-empty v-if="!segments.length" description="当前会话尚无真实路线分段" />

      <div v-else class="day-routes">
        <article v-for="group in groupedSegments" :key="group.dayIndex" class="route-day">
          <div class="day-rail">
            <span class="day-label">DAY</span>
            <strong>{{ group.dayIndex + 1 }}</strong>
            <small>{{ group.date || '日期待定' }}</small>
          </div>

          <div class="segment-list">
            <div
              v-for="(segment, index) in group.segments"
              :key="`${segment.leg_type}-${segment.leg_index}-${index}`"
              class="segment-card"
              :class="{ unavailable: !segment.available }"
            >
              <div class="segment-kind" :class="segment.leg_type">
                <span aria-hidden="true">{{ legIcon(segment.leg_type) }}</span>
                {{ legLabel(segment.leg_type) }}
              </div>

              <div class="segment-path">
                <div class="place origin"><span></span>{{ segment.origin_name }}</div>
                <div class="path-line">
                  <i></i>
                  <span>{{ modeLabel(segment.mode) }}</span>
                </div>
                <div class="place destination"><span></span>{{ segment.destination_name }}</div>
              </div>

              <div class="segment-metrics">
                <div class="metric-block">
                  <small>距离</small>
                  <strong>{{ formatDistance(segment.distance_meters) }}</strong>
                </div>
                <div class="metric-block">
                  <small>预计时间</small>
                  <strong>{{ formatDuration(segment.duration_seconds) }}</strong>
                </div>
                <div class="status-tags">
                  <a-tag :color="segment.available ? 'success' : 'error'">
                    {{ segment.available ? '路线可用' : '查询失败' }}
                  </a-tag>
                  <a-tag v-if="segment.cache_hit" color="blue">缓存命中</a-tag>
                </div>
              </div>

              <p v-if="!segment.available" class="route-error">
                {{ segment.error_message || segment.error_code || '该路线暂不可用' }}
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type {
  RouteEstimate,
  RouteExecutionSummary,
  RouteLegType,
  RouteMode,
  RouteQualityReport
} from '@/types'

const props = defineProps<{
  segments: RouteEstimate[]
  summary: RouteExecutionSummary
  quality?: RouteQualityReport | null
}>()

const groupedSegments = computed(() => {
  const groups = new Map<number, { dayIndex: number; date: string; segments: RouteEstimate[] }>()
  props.segments.forEach((segment) => {
    const group = groups.get(segment.day_index) || {
      dayIndex: segment.day_index,
      date: segment.date,
      segments: []
    }
    group.segments.push(segment)
    groups.set(segment.day_index, group)
  })
  return [...groups.values()].sort((a, b) => a.dayIndex - b.dayIndex)
})

const legLabel = (type: RouteLegType) => ({
  hotel_departure: '酒店出发',
  between_attractions: '景点通勤',
  hotel_return: '返回酒店'
}[type])

const legIcon = (type: RouteLegType) => ({
  hotel_departure: '↗',
  between_attractions: '→',
  hotel_return: '↙'
}[type])

const modeLabel = (mode: RouteMode) => ({ walking: '步行', driving: '驾车', transit: '公共交通' }[mode])

const formatDistance = (meters?: number | null) => {
  if (meters == null) return '待确认'
  return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`
}

const formatDuration = (seconds?: number | null) => {
  if (seconds == null) return '待确认'
  const minutes = Math.max(1, Math.round(seconds / 60))
  if (minutes < 60) return `${minutes} 分钟`
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`
}
</script>

<style scoped>
.route-board {
  overflow: hidden;
  border: 1px solid var(--execution-border, #e8e8f2);
  border-radius: var(--execution-radius, 12px);
  background: var(--execution-surface, #fff);
  box-shadow: var(--execution-shadow, 0 4px 12px rgba(0, 0, 0, 0.08));
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.route-board:hover {
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

.day-routes {
  display: grid;
  gap: 16px;
}

.route-day {
  display: grid;
  grid-template-columns: 86px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid #e7e9f3;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(71, 78, 120, 0.06);
}

.day-rail {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 116px;
  padding: 18px 10px;
  color: #fff;
  background: linear-gradient(165deg, #667eea 0%, #5966c8 58%, #7658a6 100%);
}

.day-rail::after {
  position: absolute;
  right: -22px;
  bottom: -30px;
  width: 76px;
  height: 76px;
  border: 14px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  content: '';
}

.day-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.2em;
  opacity: 0.72;
}

.day-rail strong {
  margin-top: 2px;
  font-size: 32px;
  line-height: 1;
}

.day-rail small {
  margin-top: 8px;
  color: rgba(255, 255, 255, 0.78);
  font-size: 11px;
  text-align: center;
}

.segment-list {
  display: grid;
  gap: 1px;
  background: #eceef5;
}

.segment-card {
  position: relative;
  display: grid;
  grid-template-columns: 108px minmax(220px, 1fr) auto;
  gap: 18px;
  align-items: center;
  padding: 17px 18px;
  background: rgba(255, 255, 255, 0.98);
  transition: background 0.2s ease;
}

.segment-card:hover {
  background: #fafaff;
}

.segment-card.unavailable {
  background: #fff8f7;
}

.segment-kind {
  justify-self: start;
  padding: 6px 10px;
  border: 1px solid #dce1ff;
  border-radius: 999px;
  color: #5564c4;
  background: #f0f2ff;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.segment-kind.hotel_return {
  border-color: #eedfc4;
  color: #8a6226;
  background: #fff7e8;
}

.segment-kind.between_attractions {
  border-color: #cfe7ee;
  color: #277087;
  background: #eef9fc;
}

.segment-kind span {
  margin-right: 4px;
}

.segment-path {
  min-width: 0;
}

.place {
  display: flex;
  align-items: center;
  gap: 9px;
  overflow: hidden;
  color: #273149;
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.place > span {
  flex: 0 0 9px;
  width: 9px;
  height: 9px;
  border: 2px solid #667eea;
  border-radius: 50%;
  background: #fff;
}

.place.destination > span {
  background: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.12);
}

.path-line {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 25px;
  margin-left: 4px;
  color: #8a91a4;
  font-size: 11px;
}

.path-line i {
  width: 1px;
  height: 21px;
  background: repeating-linear-gradient(to bottom, #aeb7dd 0 4px, transparent 4px 7px);
}

.segment-metrics {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

.metric-block {
  min-width: 74px;
  padding: 7px 10px;
  border-radius: 9px;
  background: #f7f8fc;
}

.metric-block small {
  display: block;
  color: #9299aa;
  font-size: 10px;
}

.metric-block strong {
  display: block;
  margin-top: 2px;
  color: #353f59;
  font-size: 13px;
  white-space: nowrap;
}

.status-tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
  max-width: 112px;
}

.status-tags :deep(.ant-tag) {
  margin-inline-end: 0;
  border-radius: 999px;
  font-size: 11px;
}

.route-error {
  grid-column: 2 / -1;
  margin: -8px 0 0;
  padding: 8px 10px;
  border-radius: 8px;
  color: #b64235;
  background: #fff0ed;
  font-size: 12px;
}

.board-content :deep(.ant-empty) {
  margin-block: 32px;
}

@media (max-width: 1100px) {
  .segment-card {
    grid-template-columns: 100px minmax(180px, 1fr);
  }

  .segment-metrics {
    grid-column: 2;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .route-error {
    grid-column: 2;
  }
}

@media (max-width: 760px) {
  .board-content {
    padding: 14px;
  }

  .route-day {
    grid-template-columns: 1fr;
  }

  .day-rail {
    min-height: auto;
    flex-direction: row;
    justify-content: flex-start;
    gap: 7px;
    padding: 13px 16px;
  }

  .day-rail strong {
    font-size: 20px;
  }

  .day-rail small {
    margin: 0 0 0 auto;
  }

  .segment-card {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 16px;
  }

  .segment-metrics,
  .route-error {
    grid-column: 1;
  }

  .segment-metrics {
    justify-content: flex-start;
  }

  .status-tags {
    max-width: none;
    justify-content: flex-start;
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

  .metric-block {
    flex: 1;
  }
}
</style>
