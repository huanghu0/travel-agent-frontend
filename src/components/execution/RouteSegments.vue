<template>
  <section id="execution-routes" class="route-board">
    <header class="section-heading">
      <div>
        <p class="eyebrow">AMAP VERIFIED COMMUTE</p>
        <h2>真实路线分段</h2>
        <p class="section-note">距离与耗时来自后端高德路线结果；地图只标记地点，不绘制坐标直线。</p>
      </div>
      <div class="route-summary">
        <strong>{{ summary.evaluated_legs }}</strong>
        <span>已评估分段</span>
        <i></i>
        <strong>{{ formatDistance(quality?.total_distance_meters) }}</strong>
        <span>总通勤距离</span>
      </div>
    </header>

    <a-empty v-if="!segments.length" description="当前会话尚无真实路线分段" />

    <div v-else class="day-routes">
      <article v-for="group in groupedSegments" :key="group.dayIndex" class="route-day">
        <div class="day-rail">
          <span>DAY</span>
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
              <span>{{ legIcon(segment.leg_type) }}</span>
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
              <div><small>距离</small><strong>{{ formatDistance(segment.distance_meters) }}</strong></div>
              <div><small>预计时间</small><strong>{{ formatDuration(segment.duration_seconds) }}</strong></div>
              <a-tag :color="segment.available ? 'success' : 'error'">
                {{ segment.available ? '路线可用' : '查询失败' }}
              </a-tag>
              <a-tag v-if="segment.cache_hit" color="cyan">缓存命中</a-tag>
            </div>
            <p v-if="!segment.available" class="route-error">
              {{ segment.error_message || segment.error_code || '该路线暂不可用' }}
            </p>
          </div>
        </div>
      </article>
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
  margin-top: 24px;
  padding: 28px;
  border: 1px solid #dce6df;
  border-radius: 20px;
  background: #f7faf7;
  box-shadow: 0 20px 50px rgba(29, 67, 48, 0.08);
}
.section-heading { display: flex; justify-content: space-between; gap: 28px; align-items: flex-end; margin-bottom: 24px; }
.eyebrow { margin: 0 0 6px; color: #27865c; font-size: 11px; font-weight: 800; letter-spacing: .16em; }
h2 { margin: 0; color: #173c2b; font: 700 28px/1.2 "Microsoft YaHei", sans-serif; }
.section-note { margin: 8px 0 0; color: #64756b; }
.route-summary { display: grid; grid-template-columns: auto auto 1px auto auto; align-items: center; gap: 9px; min-width: 360px; padding: 14px 18px; border-radius: 14px; background: #173c2b; color: #fff; }
.route-summary strong { font-size: 20px; }
.route-summary span { color: #cde0d4; font-size: 12px; }
.route-summary i { width: 1px; height: 32px; background: rgba(255,255,255,.22); }
.day-routes { display: grid; gap: 18px; }
.route-day { display: grid; grid-template-columns: 92px minmax(0, 1fr); overflow: hidden; border: 1px solid #dfe9e2; border-radius: 16px; background: #fff; }
.day-rail { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 18px 10px; color: #fff; background: #245c43; }
.day-rail span { font-size: 10px; letter-spacing: .2em; opacity: .7; }
.day-rail strong { font-size: 34px; line-height: 1.1; }
.day-rail small { margin-top: 6px; color: #c9ddd1; font-size: 11px; text-align: center; }
.segment-list { display: grid; gap: 1px; background: #e9efeb; }
.segment-card { position: relative; display: grid; grid-template-columns: 110px minmax(260px, 1fr) auto; gap: 20px; align-items: center; padding: 18px 20px; background: #fff; }
.segment-card.unavailable { background: #fff8f6; }
.segment-kind { justify-self: start; padding: 7px 10px; border-radius: 999px; color: #245c43; background: #e8f4ed; font-size: 12px; font-weight: 700; }
.segment-kind.hotel_return { color: #69552a; background: #f8efd9; }
.segment-kind.between_attractions { color: #1f5d72; background: #e4f2f6; }
.segment-kind span { margin-right: 4px; }
.segment-path { min-width: 0; }
.place { display: flex; align-items: center; gap: 8px; color: #20372b; font-weight: 600; }
.place span { flex: 0 0 8px; height: 8px; border: 2px solid #2d8b60; border-radius: 50%; }
.place.destination span { background: #2d8b60; }
.path-line { display: flex; align-items: center; gap: 8px; height: 24px; margin-left: 3px; color: #75857c; font-size: 11px; }
.path-line i { width: 2px; height: 20px; background: repeating-linear-gradient(#aab8b0 0 3px, transparent 3px 6px); }
.segment-metrics { display: flex; align-items: center; justify-content: flex-end; gap: 14px; }
.segment-metrics div { min-width: 72px; }
.segment-metrics small { display: block; color: #87958d; font-size: 11px; }
.segment-metrics strong { display: block; margin-top: 2px; color: #173c2b; }
.route-error { grid-column: 2 / -1; margin: -10px 0 0; color: #bd3b2d; font-size: 12px; }
@media (max-width: 900px) {
  .section-heading { align-items: stretch; flex-direction: column; }
  .route-summary { min-width: 0; grid-template-columns: auto 1fr 1px auto 1fr; }
  .route-day { grid-template-columns: 1fr; }
  .day-rail { flex-direction: row; gap: 8px; justify-content: flex-start; }
  .day-rail strong { font-size: 22px; }
  .segment-card { grid-template-columns: 1fr; gap: 12px; }
  .segment-metrics { justify-content: flex-start; flex-wrap: wrap; }
  .route-error { grid-column: 1; }
}
</style>
