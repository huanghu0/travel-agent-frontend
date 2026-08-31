<template>
  <div class="result-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <a-button class="back-button" size="large" @click="goBack">
        ← 返回首页
      </a-button>
      <a-space size="middle">
        <a-button @click="goHistory">🗂️ 历史行程</a-button>
        <!-- <a-button v-if="sessionId" :loading="loadingDetail" @click="openSessionDetail">🔎 执行详情</a-button> -->
        <a-button
          v-if="canResume"
          type="primary"
          :loading="resuming"
          @click="handleResume"
        >
          ▶️ 恢复执行
        </a-button>
        <a-button
          v-if="tripPlan && !editMode && !isLocalDraft"
          :loading="sharing"
          :disabled="!canShare"
          :title="canShare ? undefined : '当前行程尚未执行完成，暂时不能分享到广场'"
          @click="handleShare"
        >
          🌍 分享行程
        </a-button>
        <a-button v-if="tripPlan && !editMode" @click="toggleEditMode" type="default">
          ✏️ 编辑行程
        </a-button>
        <a-button v-else @click="saveChanges" type="primary" :loading="savingDraft">
          💾 保存并重新评估
        </a-button>
        <a-button v-if="editMode" @click="cancelEdit" type="default">
          ❌ 取消编辑
        </a-button>

        <!-- 导出按钮 -->
        <!-- <a-dropdown v-if="tripPlan && !editMode">
          <template #overlay>
            <a-menu>
              <a-menu-item key="image" @click="exportAsImage">
                📷 导出为图片
              </a-menu-item>
              <a-menu-item key="pdf" @click="exportAsPDF">
                📄 导出为PDF
              </a-menu-item>
            </a-menu>
          </template>
          <a-button type="default">
            📥 导出行程 <DownOutlined />
          </a-button>
        </a-dropdown> -->
      </a-space>
    </div>

    <a-card v-if="loadingSession" :bordered="false" class="session-loading-card">
      <a-skeleton active :paragraph="{ rows: 6 }" />
    </a-card>

    <a-alert
      v-if="loadSource === 'cache'"
      type="warning"
      show-icon
      message="服务端会话暂时不可用，当前展示浏览器缓存"
      description="缓存仅用于故障回退；刷新后系统仍会优先从 SQLite 会话加载。"
      class="cache-alert"
    />

    <div v-if="tripPlan && !loadingSession" class="content-wrapper">
      <!-- 侧边导航 -->
      <div class="side-nav">
        <a-affix :offset-top="80">
          <a-menu mode="inline" :selected-keys="[activeSection]" @click="scrollToSection">
            <a-menu-item key="overview">
              <span>📋 行程概览</span>
            </a-menu-item>
            <a-menu-item key="budget" v-if="tripPlan.budget">
              <span>💰 预算明细</span>
            </a-menu-item>
            <a-menu-item key="map">
              <span>📍 地点地图</span>
            </a-menu-item>
            <a-menu-item v-if="executionView" key="execution-routes">
              <span>🧭 真实路线</span>
            </a-menu-item>
            <a-menu-item v-if="executionView" key="execution-timeline">
              <span>⏱️ 地点时间轴</span>
            </a-menu-item>
            <a-menu-item v-if="executionView" key="execution-quality">
              <span>🧪 约束报告</span>
            </a-menu-item>
            <a-sub-menu key="days" title="📅 每日行程">
              <a-menu-item v-for="(day, index) in tripPlan.days" :key="`day-${index}`">
                第{{ day.day_index + 1 }}天
              </a-menu-item>
            </a-sub-menu>
            <a-menu-item key="weather" v-if="tripPlan.weather_info && tripPlan.weather_info.length > 0">
              <span>🌤️ 天气信息</span>
            </a-menu-item>
          </a-menu>
        </a-affix>
      </div>

      <!-- 主内容区 -->
      <div class="main-content">
        <!-- 顶部信息区:左侧概览+预算,右侧地图 -->
        <div class="top-info-section">
          <!-- 左侧:行程概览和预算明细 -->
          <div class="left-info">
            <!-- 行程概览 -->
            <a-card id="overview" :title="`${tripPlan.city}旅行计划`" :bordered="false" class="overview-card">
              <div class="overview-content">
                <div class="info-item">
                  <span class="info-label">📅 日期:</span>
                  <span class="info-value">{{ tripPlan.start_date }} 至 {{ tripPlan.end_date }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">💡 建议:</span>
                  <span class="info-value">{{ tripPlan.overall_suggestions }}</span>
                </div>
              </div>
            </a-card>

            <!-- 后端 Agent 执行与质量摘要：完整响应契约中的元数据。 -->
            <a-card
              v-if="hasExecutionMetadata"
              title="🤖 执行与质量"
              :bordered="false"
              class="execution-card"
            >
              <div class="execution-tags">
                <a-tag v-if="tripPlanResponse?.completion_mode" :color="tripPlanResponse.completion_mode === 'full' ? 'success' : 'warning'">
                  {{ tripPlanResponse.completion_mode === 'full' ? '完整完成' : '部分可接受' }}
                </a-tag>
                <a-tag v-if="tripPlanResponse?.quality_level" :color="getQualityColor(tripPlanResponse.quality_level)">
                  {{ getQualityLabel(tripPlanResponse.quality_level) }}
                </a-tag>
                <a-tag v-if="tripPlanResponse?.quality_score != null" color="blue">
                  质量分 {{ tripPlanResponse.quality_score.toFixed(1) }}
                </a-tag>
                <a-tag v-if="tripPlanResponse?.execution_steps != null">
                  执行 {{ tripPlanResponse.execution_steps }} 步
                </a-tag>
              </div>
              <!-- <div v-if="tripPlanResponse?.session_id" class="session-id">
                会话 ID：{{ tripPlanResponse.session_id }}
              </div> -->
              <a-alert
                v-if="isLocalDraft"
                type="warning"
                show-icon
                message="当前为未确认的编辑草稿"
                description="上方正式质量信息仍来自当前确认版本；草稿只有确认后才会应用。"
                class="execution-alert"
              />
              <a-alert
                v-if="tripPlanResponse?.warnings?.length"
                type="warning"
                show-icon
                message="仍需注意"
                class="execution-alert"
              >
                <template #description>
                  <ul class="warning-list">
                    <li v-for="warning in tripPlanResponse.warnings" :key="warning">{{ warning }}</li>
                  </ul>
                </template>
              </a-alert>
            </a-card>

            <!-- 预算明细 -->
            <a-card id="budget" v-if="tripPlan.budget" title="💰 预算明细" :bordered="false" class="budget-card">
              <div class="budget-grid">
                <div class="budget-item">
                  <div class="budget-label">景点门票</div>
                  <div class="budget-value">¥{{ tripPlan.budget.total_attractions }}</div>
                </div>
                <div class="budget-item">
                  <div class="budget-label">酒店住宿</div>
                  <div class="budget-value">¥{{ tripPlan.budget.total_hotels }}</div>
                </div>
                <div class="budget-item">
                  <div class="budget-label">餐饮费用</div>
                  <div class="budget-value">¥{{ tripPlan.budget.total_meals }}</div>
                </div>
                <div class="budget-item">
                  <div class="budget-label">交通费用</div>
                  <div class="budget-value">¥{{ tripPlan.budget.total_transportation }}</div>
                </div>
              </div>
              <div class="budget-total">
                <span class="total-label">预估总费用</span>
                <span class="total-value">¥{{ tripPlan.budget.total }}</span>
              </div>
            </a-card>
          </div>

          <!-- 右侧:地图 -->
          <div class="right-map">
            <a-card id="map" title="📍 地点分布地图" :bordered="false" class="map-card">
              <div class="map-content">
                <div id="amap-container" class="map-canvas"></div>
                <div class="map-disclaimer">
                  地图仅展示地点位置，不使用景点坐标直线冒充道路路线。真实距离与时间请查看下方高德路线分段。
                </div>
              </div>
            </a-card>
          </div>
        </div>

        <!-- 可执行行程闭环：全部来自后端轻量 execution-view。 -->
        <template v-if="executionView">
          <RouteSegments
            :segments="executionView.route_segments"
            :summary="executionView.route_summary"
            :quality="executionView.route_quality_report"
          />
          <DayTimeline :report="executionView.schedule_quality_report" />
          <ExecutionQualityPanel
            :route="executionView.route_quality_report"
            :schedule="executionView.schedule_quality_report"
            :commute="executionView.commute_report"
            :constraint="executionView.constraint_report"
          />
        </template>

        <!-- 每日行程:可折叠 -->
        <a-card title="📅 每日行程" :bordered="false" class="days-card">
          <a-collapse v-model:activeKey="activeDays" accordion>
            <a-collapse-panel
              v-for="(day, index) in tripPlan.days"
              :key="index"
              :id="`day-${index}`"
            >
              <template #header>
                <div class="day-header">
                  <span class="day-title">第{{ day.day_index + 1 }}天</span>
                  <span class="day-date">{{ day.date }}</span>
                </div>
              </template>

              <!-- 行程基本信息 -->
              <div class="day-info">
                <div class="info-row">
                  <span class="label">📝 行程描述:</span>
                  <span class="value">{{ day.description }}</span>
                </div>
                <div class="info-row">
                  <span class="label">🚗 交通方式:</span>
                  <span class="value">{{ day.transportation }}</span>
                </div>
                <div class="info-row">
                  <span class="label">🏨 住宿:</span>
                  <span class="value">{{ day.accommodation }}</span>
                </div>
              </div>

              <!-- 景点安排 -->
              <a-divider orientation="left">🎯 景点安排</a-divider>
              <a-list
                :data-source="day.attractions"
                :grid="{ gutter: 16, column: 2 }"
              >
                <template #renderItem="{ item, index }">
                  <a-list-item>
                    <a-card :title="item.name" size="small" class="attraction-card">
                      <!-- 编辑模式下的操作按钮 -->
                      <template #extra v-if="editMode">
                        <a-space>
                          <a-button
                            size="small"
                            @click="moveAttraction(day.day_index, index, 'up')"
                            :disabled="index === 0"
                          >
                            ↑
                          </a-button>
                          <a-button
                            size="small"
                            @click="moveAttraction(day.day_index, index, 'down')"
                            :disabled="index === day.attractions.length - 1"
                          >
                            ↓
                          </a-button>
                          <a-button
                            size="small"
                            danger
                            @click="deleteAttraction(day.day_index, index)"
                          >
                            🗑️
                          </a-button>
                        </a-space>
                      </template>

                      <!-- 景点图片 -->
                      <div class="attraction-image-wrapper">
                        <img
                          :src="getAttractionImage(item, index)"
                          :alt="item.name"
                          class="attraction-image"
                          @error="handleImageError"
                        />
                        <div class="attraction-badge">
                          <span class="badge-number">{{ index + 1 }}</span>
                        </div>
                        <div v-if="item.ticket_price" class="price-tag">
                          ¥{{ item.ticket_price }}
                        </div>
                      </div>

                      <!-- 编辑模式下可编辑的字段 -->
                      <div v-if="editMode">
                        <p><strong>地址:</strong></p>
                        <a-input v-model:value="item.address" size="small" style="margin-bottom: 8px" />

                        <p><strong>游览时长(分钟):</strong></p>
                        <a-input-number v-model:value="item.visit_duration" :min="10" :max="480" size="small" style="width: 100%; margin-bottom: 8px" />

                        <p><strong>描述:</strong></p>
                        <a-textarea v-model:value="item.description" :rows="2" size="small" style="margin-bottom: 8px" />
                      </div>

                      <!-- 查看模式 -->
                      <div v-else>
                        <p><strong>地址:</strong> {{ item.address }}</p>
                        <p><strong>游览时长:</strong> {{ item.visit_duration }}分钟</p>
                        <p><strong>描述:</strong> {{ item.description }}</p>
                        <p v-if="item.rating"><strong>评分:</strong> {{ item.rating }}⭐</p>
                      </div>
                    </a-card>
                  </a-list-item>
                </template>
              </a-list>

              <!-- 酒店推荐 -->
              <a-divider v-if="day.hotel" orientation="left">🏨 住宿推荐</a-divider>
              <a-card v-if="day.hotel" size="small" class="hotel-card">
                <template #title>
                  <span class="hotel-title">{{ day.hotel.name }}</span>
                </template>
                <a-descriptions :column="2" size="small">
                  <a-descriptions-item label="地址">{{ day.hotel.address }}</a-descriptions-item>
                  <a-descriptions-item label="类型">{{ day.hotel.type }}</a-descriptions-item>
                  <a-descriptions-item label="价格范围">{{ day.hotel.price_range }}</a-descriptions-item>
                  <a-descriptions-item label="评分">{{ day.hotel.rating }}⭐</a-descriptions-item>
                  <a-descriptions-item label="距离" :span="2">{{ day.hotel.distance }}</a-descriptions-item>
                </a-descriptions>
              </a-card>

              <!-- 餐饮安排 -->
              <a-divider orientation="left">🍽️ 餐饮安排</a-divider>
              <div class="meal-grid">
                <article v-for="meal in day.meals" :key="`${meal.type}-${meal.name}`" class="meal-card">
                  <div class="meal-card-header">
                    <span>{{ getMealLabel(meal.type) }}</span>
                    <a-tag :color="getMealStatusColor(meal.opening_status)">
                      {{ getMealStatusLabel(meal.opening_status) }}
                    </a-tag>
                  </div>
                  <strong>{{ meal.name }}</strong>
                  <p v-if="meal.address">{{ meal.address }}</p>
                  <div class="meal-meta">
                    <span v-if="meal.planned_start_time">计划 {{ meal.planned_start_time }}–{{ meal.planned_end_time || '?' }}</span>
                    <span v-if="meal.opening_hours">营业 {{ meal.opening_hours }}</span>
                    <span v-if="meal.source">来源 {{ meal.source === 'amap' ? '高德 POI' : '兜底安排' }}</span>
                  </div>
                  <p v-if="meal.description" class="meal-description">{{ meal.description }}</p>
                </article>
              </div>
            </a-collapse-panel>
          </a-collapse>
        </a-card>

        <a-card id="weather" v-if="tripPlan.weather_info && tripPlan.weather_info.length > 0" title="天气信息" style="margin-top: 20px" :bordered="false">
        <a-list
          :data-source="tripPlan.weather_info"
          :grid="{ gutter: 16, column: 3 }"
        >
          <template #renderItem="{ item }">
            <a-list-item>
              <a-card size="small" class="weather-card">
                <div class="weather-date">{{ item.date }}</div>
                <div class="weather-info-row">
                  <span class="weather-icon">☀️</span>
                  <div>
                    <div class="weather-label">白天</div>
                    <div class="weather-value">{{ item.day_weather }} {{ item.day_temp }}°C</div>
                  </div>
                </div>
                <div class="weather-info-row">
                  <span class="weather-icon">🌙</span>
                  <div>
                    <div class="weather-label">夜间</div>
                    <div class="weather-value">{{ item.night_weather }} {{ item.night_temp }}°C</div>
                  </div>
                </div>
                <div class="weather-wind">
                  💨 {{ item.wind_direction }} {{ item.wind_power }}
                </div>
              </a-card>
            </a-list-item>
          </template>
        </a-list>
        </a-card>
      </div>
    </div>

    <a-empty v-else-if="!loadingSession" description="没有找到旅行计划数据">
      <template #image>
        <div style="font-size: 80px;">🗺️</div>
      </template>
      <template #description>
        <span style="color: #999;">暂无旅行计划数据,请先创建行程</span>
      </template>
      <a-button type="primary" @click="goBack">返回首页创建行程</a-button>
    </a-empty>

    <a-drawer
      title="行程重新评估对比"
      :open="evaluationOpen"
      width="620"
      :closable="false"
    >
      <template v-if="draftEvaluation">
        <a-alert
          :type="draftEvaluation.after.accepted ? 'success' : 'warning'"
          show-icon
          :message="draftEvaluation.after.accepted ? '候选版本达到交付标准' : '候选版本仍存在阻断问题'"
          description="当前仅为候选版本；点击确认后才会更新正式行程。"
          style="margin-bottom: 16px"
        />
        <a-row :gutter="12">
          <a-col :span="12">
            <a-card size="small" title="重新评估前">
              <a-statistic title="综合质量分" :value="draftEvaluation.before.quality_score ?? 0" :precision="1" />
              <p>路线分：{{ draftEvaluation.before.route_score ?? '-' }}</p>
              <p>日程分：{{ draftEvaluation.before.schedule_score ?? '-' }}</p>
              <p>约束错误：{{ draftEvaluation.before.constraint_errors }}</p>
            </a-card>
          </a-col>
          <a-col :span="12">
            <a-card size="small" title="重新评估后">
              <a-statistic title="综合质量分" :value="draftEvaluation.after.quality_score ?? 0" :precision="1" />
              <p>路线分：{{ draftEvaluation.after.route_score ?? '-' }}</p>
              <p>日程分：{{ draftEvaluation.after.schedule_score ?? '-' }}</p>
              <p>约束错误：{{ draftEvaluation.after.constraint_errors }}</p>
            </a-card>
          </a-col>
        </a-row>
        <a-descriptions bordered size="small" :column="2" style="margin-top: 16px">
          <a-descriptions-item label="变化天数">
            {{ draftEvaluation.diff.changed_days.map((item) => item + 1).join('、') || '无' }}
          </a-descriptions-item>
          <a-descriptions-item label="受影响路线">
            {{ draftEvaluation.diff.queried_route_legs }} 段
          </a-descriptions-item>
          <a-descriptions-item label="复用路线">
            {{ draftEvaluation.diff.reused_route_legs }} 段
          </a-descriptions-item>
          <a-descriptions-item label="日程超时">
            {{ draftEvaluation.before.schedule_overtime_minutes }} → {{ draftEvaluation.after.schedule_overtime_minutes }} 分钟
          </a-descriptions-item>
          <a-descriptions-item label="过长通勤">
            {{ draftEvaluation.before.excessive_commute_segments }} → {{ draftEvaluation.after.excessive_commute_segments }} 段
          </a-descriptions-item>
          <a-descriptions-item label="不可用路线">
            {{ draftEvaluation.before.unavailable_route_legs }} → {{ draftEvaluation.after.unavailable_route_legs }} 段
          </a-descriptions-item>
        </a-descriptions>
        <a-alert
          v-if="draftEvaluation.after.blocking_reasons.length"
          type="error"
          show-icon
          message="仍需处理的问题"
          :description="draftEvaluation.after.blocking_reasons.join('；')"
          style="margin-top: 16px"
        />
      </template>
      <template #footer>
        <a-space style="float: right">
          <a-button @click="continueEditingDraft">继续修改</a-button>
          <a-button type="primary" :loading="confirmingDraft" @click="confirmEvaluatedDraft">
            确认并应用新版本
          </a-button>
        </a-space>
      </template>
    </a-drawer>

    <SessionDetailDrawer
      :open="detailOpen"
      :loading="loadingDetail"
      :state="sessionState"
      @close="detailOpen = false"
    />

    <!-- 回到顶部按钮 -->
    <a-back-top :visibility-height="300">
      <div class="back-top-button">
        ↑
      </div>
    </a-back-top>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { DownOutlined } from '@ant-design/icons-vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import SessionDetailDrawer from '@/components/SessionDetailDrawer.vue'
import RouteSegments from '@/components/execution/RouteSegments.vue'
import DayTimeline from '@/components/execution/DayTimeline.vue'
import ExecutionQualityPanel from '@/components/execution/ExecutionQualityPanel.vue'
import {
  confirmTripDraft,
  createTripDraft,
  evaluateTripDraft,
  getAttractionPhoto,
  getTripExecutionView,
  getTripSession,
  resumeTripSession,
  shareTripSession,
  updateTripDraft
} from '@/services/api'
import type {
  AgentState,
  Attraction,
  DraftEvaluationResponse,
  QualityLevel,
  TripDraft,
  TripExecutionView,
  TripPlan,
  TripPlanResponse
} from '@/types'


const route = useRoute()
const router = useRouter()
const tripPlan = ref<TripPlan | null>(null)
const tripPlanResponse = ref<TripPlanResponse | null>(null)
const sessionState = ref<AgentState | null>(null)
const executionView = ref<TripExecutionView | null>(null)
const loadingSession = ref(false)
const loadingDetail = ref(false)
const resuming = ref(false)
const sharing = ref(false)
const detailOpen = ref(false)
const loadSource = ref<'server' | 'cache' | null>(null)
const editMode = ref(false)
const savingDraft = ref(false)
const confirmingDraft = ref(false)
const evaluationOpen = ref(false)
const currentDraft = ref<TripDraft | null>(null)
const draftEvaluation = ref<DraftEvaluationResponse | null>(null)
const isLocalDraft = ref(sessionStorage.getItem('tripPlanLocalDraft') === 'true')
const originalPlan = ref<TripPlan | null>(null)
const attractionPhotos = ref<Record<string, string>>({})
const activeSection = ref('overview')
const activeDays = ref<number[]>([0]) // 默认展开第一天
const sessionId = computed(() => String(route.params.sessionId || ''))
const canResume = computed(() => executionView.value?.can_resume ?? false)
const canShare = computed(() =>
  Boolean(
    sessionId.value &&
      tripPlan.value &&
      !editMode.value &&
      !isLocalDraft.value &&
      executionView.value?.status === 'completed'
  )
)
const hasExecutionMetadata = computed(() => {
  const response = tripPlanResponse.value
  return Boolean(
    response?.session_id ||
      response?.execution_steps != null ||
      response?.completion_mode ||
      response?.quality_level ||
      response?.quality_score != null ||
      response?.warnings?.length
  )
})

let map: any = null

const renderCurrentPlan = async () => {
  attractionPhotos.value = {}
  if (map) {
    map.destroy()
    map = null
  }
  if (!tripPlan.value) return

  // 图片是增强信息，异步加载即可，不能阻塞 execution-view 主体和路线报告展示。
  void loadAttractionPhotos()
  await nextTick()
  await initMap()
}

const applyExecutionView = async (view: TripExecutionView) => {
  executionView.value = view
  tripPlan.value = view.trip_plan || null
  tripPlanResponse.value = {
    success: Boolean(view.trip_plan),
    message: view.finished ? '行程执行完成' : '行程执行中',
    data: view.trip_plan || null,
    session_id: view.session_id,
    execution_steps: view.current_step,
    completion_mode: view.completion_mode,
    quality_level: view.quality_level,
    quality_score: view.quality_score,
    warnings: view.warnings
  }
  loadSource.value = 'server'
  isLocalDraft.value = false
  sessionStorage.removeItem('tripPlanLocalDraft')

  // 浏览器只保存最终展示结果作为断网回退，不缓存完整 AgentState。
  sessionStorage.setItem('tripPlanResponse', JSON.stringify(tripPlanResponse.value))
  if (tripPlan.value) {
    sessionStorage.setItem('tripPlan', JSON.stringify(tripPlan.value))
  }
  await renderCurrentPlan()
}

const loadCachedPlan = async (): Promise<boolean> => {
  try {
    const responseCache = sessionStorage.getItem('tripPlanResponse')
    if (!responseCache) return false
    const cachedResponse = JSON.parse(responseCache) as TripPlanResponse
    if (cachedResponse.session_id !== sessionId.value || !cachedResponse.data) return false
    tripPlanResponse.value = cachedResponse
    tripPlan.value = cachedResponse.data
    loadSource.value = 'cache'
    await renderCurrentPlan()
    return true
  } catch (error) {
    console.error('读取行程回退缓存失败:', error)
    sessionStorage.removeItem('tripPlanResponse')
    sessionStorage.removeItem('tripPlan')
    return false
  }
}

const loadSession = async () => {
  if (!sessionId.value) {
    message.warning('缺少会话 ID，已返回历史行程')
    router.replace('/history')
    return
  }

  loadingSession.value = true
  loadSource.value = null
  sessionState.value = null
  executionView.value = null
  try {
    const view = await getTripExecutionView(sessionId.value)
    await applyExecutionView(view)
  } catch (error) {
    const cacheLoaded = await loadCachedPlan()
    if (!cacheLoaded) {
      message.error(error instanceof Error ? error.message : '会话加载失败')
    }
  } finally {
    loadingSession.value = false
    // 行程主体受 loadingSession 控制；等待容器真正挂载后再创建地图，
    // 避免高德 JS API 在加载态找不到 #amap-container。
    await nextTick()
    if (tripPlan.value && !map) {
      await initMap()
    }
  }
}

watch(sessionId, loadSession, { immediate: true })

const goBack = () => {
  router.push('/')
}

const goHistory = () => {
  router.push('/history')
}

const handleShare = async () => {
  if (!canShare.value || !sessionId.value || !tripPlan.value) {
    message.warning('当前行程尚未执行完成，暂时不能分享到广场')
    return
  }
  sharing.value = true
  try {
    const shared = await shareTripSession(
      sessionId.value,
      `${tripPlan.value.city} · ${tripPlan.value.days.length}日行程`
    )
    message.success(`《${shared.title}》已发布到分享广场`)
  } catch (error) {
    message.error(error instanceof Error ? error.message : '发布行程失败')
  } finally {
    sharing.value = false
  }
}

const openSessionDetail = async () => {
  if (!sessionId.value) return
  detailOpen.value = true
  if (sessionState.value) return
  loadingDetail.value = true
  try {
    // 完整 AgentState 只在用户主动查看执行详情时按需加载。
    sessionState.value = await getTripSession(sessionId.value)
  } catch (error) {
    detailOpen.value = false
    message.error(error instanceof Error ? error.message : '执行详情加载失败')
  } finally {
    loadingDetail.value = false
  }
}

const handleResume = async () => {
  if (!sessionId.value) return
  resuming.value = true
  try {
    sessionState.value = await resumeTripSession(sessionId.value)
    await loadSession()
    message.success(sessionState.value.status === 'completed' ? '会话恢复完成' : '已从最近检查点继续执行')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '恢复会话失败')
  } finally {
    resuming.value = false
  }
}

// 滚动到指定区域
const scrollToSection = ({ key }: { key: string }) => {
  activeSection.value = key
  const element = document.getElementById(key)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// 切换编辑模式
const toggleEditMode = () => {
  editMode.value = true
  // 保存原始数据用于取消编辑
  originalPlan.value = JSON.parse(JSON.stringify(tripPlan.value))
  isLocalDraft.value = true
  message.info('进入编辑模式')
}

// 保存后立即执行增量路线查询和全套确定性重新评估。
const saveChanges = async () => {
  if (!tripPlan.value || !sessionId.value) return
  savingDraft.value = true
  try {
    currentDraft.value = currentDraft.value
      ? await updateTripDraft(sessionId.value, currentDraft.value.draft_id, tripPlan.value)
      : await createTripDraft(sessionId.value, tripPlan.value)
    draftEvaluation.value = await evaluateTripDraft(
      sessionId.value,
      currentDraft.value.draft_id
    )
    currentDraft.value = draftEvaluation.value.draft
    tripPlan.value = draftEvaluation.value.candidate_version.trip_plan
    editMode.value = false
    isLocalDraft.value = true
    sessionStorage.removeItem('tripPlanLocalDraft')
    evaluationOpen.value = true
    await renderCurrentPlan()
    message.success('草稿已重新评估，请确认新版本或继续修改')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '草稿重新评估失败')
  } finally {
    savingDraft.value = false
  }
}

// 接受重新评估后的候选版本，并重新读取轻量 execution-view。
const confirmEvaluatedDraft = async () => {
  if (!currentDraft.value || !sessionId.value) return
  confirmingDraft.value = true
  try {
    await confirmTripDraft(sessionId.value, currentDraft.value.draft_id)
    evaluationOpen.value = false
    currentDraft.value = null
    draftEvaluation.value = null
    originalPlan.value = null
    await loadSession()
    message.success('新版本已确认并应用')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '确认新版本失败')
  } finally {
    confirmingDraft.value = false
  }
}

// 不确认候选版本，保留同一草稿继续修改；后端会在下次保存时废弃旧候选。
const continueEditingDraft = () => {
  evaluationOpen.value = false
  originalPlan.value = JSON.parse(JSON.stringify(tripPlan.value))
  editMode.value = true
  isLocalDraft.value = true
  message.info('已返回草稿编辑，新版本尚未应用')
}

// 取消编辑
const cancelEdit = () => {
  if (originalPlan.value) {
    tripPlan.value = JSON.parse(JSON.stringify(originalPlan.value))
  }
  editMode.value = false
  isLocalDraft.value = Boolean(currentDraft.value)
  message.info('已取消编辑')
}

// 删除景点
const deleteAttraction = (dayIndex: number, attrIndex: number) => {
  if (!tripPlan.value) return

  const day = tripPlan.value.days[dayIndex]
  if (day.attractions.length <= 1) {
    message.warning('每天至少需要保留一个景点')
    return
  }

  day.attractions.splice(attrIndex, 1)
  message.success('景点已删除')
}

// 移动景点顺序
const moveAttraction = (dayIndex: number, attrIndex: number, direction: 'up' | 'down') => {
  if (!tripPlan.value) return

  const day = tripPlan.value.days[dayIndex]
  const attractions = day.attractions

  if (direction === 'up' && attrIndex > 0) {
    [attractions[attrIndex], attractions[attrIndex - 1]] = [attractions[attrIndex - 1], attractions[attrIndex]]
  } else if (direction === 'down' && attrIndex < attractions.length - 1) {
    [attractions[attrIndex], attractions[attrIndex + 1]] = [attractions[attrIndex + 1], attractions[attrIndex]]
  }
}

const getQualityLabel = (level: QualityLevel): string => {
  const labels: Record<QualityLevel, string> = {
    excellent: '优秀',
    acceptable: '可接受',
    degraded: '降级可用',
    unusable: '不可用'
  }
  return labels[level]
}

const getQualityColor = (level: QualityLevel): string => {
  const colors: Record<QualityLevel, string> = {
    excellent: 'success',
    acceptable: 'processing',
    degraded: 'warning',
    unusable: 'error'
  }
  return colors[level]
}

const getMealLabel = (type: string): string => {
  const labels: Record<string, string> = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '小吃'
  }
  return labels[type] || type
}

const getMealStatusLabel = (status?: string): string => ({
  open: '营业时间匹配',
  unknown: '营业状态待确认',
  fallback: '兜底餐饮安排'
}[status || 'unknown'] || '营业状态待确认')

const getMealStatusColor = (status?: string): string => ({
  open: 'success',
  unknown: 'warning',
  fallback: 'default'
}[status || 'unknown'] || 'warning')

// 加载所有景点图片：后端已返回的 image_url/photos 优先，避免重复调用图片接口。
const loadAttractionPhotos = async () => {
  if (!tripPlan.value) return

  const missingAttractions: Attraction[] = []
  tripPlan.value.days.forEach((day) => {
    day.attractions.forEach((attraction) => {
      const existingPhoto = attraction.image_url || attraction.photos?.[0]
      if (existingPhoto) {
        attractionPhotos.value[attraction.name] = existingPhoto
      } else {
        missingAttractions.push(attraction)
      }
    })
  })

  await Promise.all(
    missingAttractions.map(async (attraction) => {
      try {
        const data = await getAttractionPhoto(attraction.name)
        const photoUrl = data.data?.photo_url || data.image_url
        if (photoUrl) {
          attractionPhotos.value[attraction.name] = photoUrl
        }
      } catch (error) {
        // 图片属于增强信息，失败时使用占位图，不阻断行程展示。
        console.error(`获取${attraction.name}图片失败:`, error)
      }
    })
  )
}

// 获取景点图片
const getAttractionImage = (attraction: Attraction, index: number): string => {
  const name = attraction.name
  const existingPhoto = attraction.image_url || attraction.photos?.[0]
  if (existingPhoto) {
    return existingPhoto
  }
  if (attractionPhotos.value[name]) {
    return attractionPhotos.value[name]
  }

  // 返回一个纯色占位图(避免跨域问题)
  const colors = [
    { start: '#667eea', end: '#764ba2' },
    { start: '#f093fb', end: '#f5576c' },
    { start: '#4facfe', end: '#00f2fe' },
    { start: '#43e97b', end: '#38f9d7' },
    { start: '#fa709a', end: '#fee140' }
  ]
  const colorIndex = index % colors.length
  const { start, end } = colors[colorIndex]

  // 使用base64编码避免中文问题
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
    <defs>
      <linearGradient id="grad${index}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${start};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${end};stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#grad${index})"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="bold" fill="white">${name}</text>
  </svg>`

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

// 图片加载失败时的处理
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  // 使用灰色占位图
  img.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23f0f0f0"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="%23999"%3E图片加载失败%3C/text%3E%3C/svg%3E'
}



// 导出为图片
const exportAsImage = async () => {
  try {
    message.loading({ content: '正在生成图片...', key: 'export', duration: 0 })

    const element = document.querySelector('.main-content') as HTMLElement
    if (!element) {
      throw new Error('未找到内容元素')
    }

    // 创建一个独立的容器
    const exportContainer = document.createElement('div')
    exportContainer.style.width = element.offsetWidth + 'px'
    exportContainer.style.backgroundColor = '#f5f7fa'
    exportContainer.style.padding = '20px'

    // 复制所有内容
    exportContainer.innerHTML = element.innerHTML

    // 处理地图截图
    const mapContainer = document.getElementById('amap-container')
    if (mapContainer && map) {
      const mapCanvas = mapContainer.querySelector('canvas')
      if (mapCanvas) {
        const mapSnapshot = mapCanvas.toDataURL('image/png')
        const exportMapContainer = exportContainer.querySelector('#amap-container')
        if (exportMapContainer) {
          exportMapContainer.innerHTML = `<img src="${mapSnapshot}" style="width:100%;height:100%;object-fit:cover;" />`
        }
      }
    }

    // 移除所有ant-card类,替换为纯div
    const cards = exportContainer.querySelectorAll('.ant-card')
    cards.forEach((card) => {
      const cardEl = card as HTMLElement
      try {
        cardEl.className = '' // 移除所有类
        cardEl.style.setProperty('background-color', '#ffffff')
        cardEl.style.setProperty('border-radius', '12px')
        cardEl.style.setProperty('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.1)')
        cardEl.style.setProperty('margin-bottom', '20px')
        cardEl.style.setProperty('overflow', 'hidden')
      } catch (err) {
        console.error('设置卡片样式失败:', err)
      }
    })

    // 处理卡片头部
    const cardHeads = exportContainer.querySelectorAll('.ant-card-head')
    cardHeads.forEach((head) => {
      const headEl = head as HTMLElement
      try {
        headEl.style.setProperty('background-color', '#667eea')
        headEl.style.setProperty('color', '#ffffff')
        headEl.style.setProperty('padding', '16px 24px')
        headEl.style.setProperty('font-size', '18px')
        headEl.style.setProperty('font-weight', '600')
      } catch (err) {
        console.error('设置卡片头部样式失败:', err)
      }
    })

    // 处理卡片内容
    const cardBodies = exportContainer.querySelectorAll('.ant-card-body')
    cardBodies.forEach((body) => {
      const bodyEl = body as HTMLElement
      bodyEl.style.setProperty('background-color', '#ffffff')
      bodyEl.style.setProperty('padding', '24px')
    })

    // 处理酒店卡片头部
    const hotelCards = exportContainer.querySelectorAll('.hotel-card')
    hotelCards.forEach((card) => {
      const head = card.querySelector('.ant-card-head') as HTMLElement
      if (head) {
        head.style.setProperty('background-color', '#1976d2')
      }
      (card as HTMLElement).style.setProperty('background-color', '#e3f2fd')
    })

    // 处理天气卡片
    const weatherCards = exportContainer.querySelectorAll('.weather-card')
    weatherCards.forEach((card) => {
      (card as HTMLElement).style.setProperty('background-color', '#e0f7fa')
    })

    // 处理预算总计
    const budgetTotal = exportContainer.querySelector('.budget-total')
    if (budgetTotal) {
      const el = budgetTotal as HTMLElement
      el.style.setProperty('background-color', '#667eea')
      el.style.setProperty('color', '#ffffff')
      el.style.setProperty('padding', '20px')
      el.style.setProperty('border-radius', '12px')
      el.style.setProperty('margin-bottom', '20px')
    }

    // 处理预算项
    const budgetItems = exportContainer.querySelectorAll('.budget-item')
    budgetItems.forEach((item) => {
      const el = item as HTMLElement
      el.style.setProperty('background-color', '#f5f7fa')
      el.style.setProperty('padding', '16px')
      el.style.setProperty('border-radius', '8px')
      el.style.setProperty('margin-bottom', '12px')
    })

    // 添加到body(隐藏)
    exportContainer.style.position = 'absolute'
    exportContainer.style.left = '-9999px'
    document.body.appendChild(exportContainer)

    const canvas = await html2canvas(exportContainer, {
      backgroundColor: '#f5f7fa',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true
    })

    // 移除容器
    document.body.removeChild(exportContainer)

    // 转换为图片并下载
    const link = document.createElement('a')
    link.download = `旅行计划_${tripPlan.value?.city}_${new Date().getTime()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()

    message.success({ content: '图片导出成功!', key: 'export' })
  } catch (error: any) {
    console.error('导出图片失败:', error)
    message.error({ content: `导出图片失败: ${error.message}`, key: 'export' })
  }
}

// 导出为PDF
const exportAsPDF = async () => {
  try {
    message.loading({ content: '正在生成PDF...', key: 'export', duration: 0 })

    const element = document.querySelector('.main-content') as HTMLElement
    if (!element) {
      throw new Error('未找到内容元素')
    }

    // 创建一个独立的容器
    const exportContainer = document.createElement('div')
    exportContainer.style.width = element.offsetWidth + 'px'
    exportContainer.style.backgroundColor = '#f5f7fa'
    exportContainer.style.padding = '20px'

    // 复制所有内容
    exportContainer.innerHTML = element.innerHTML

    // 处理地图截图
    const mapContainer = document.getElementById('amap-container')
    if (mapContainer && map) {
      const mapCanvas = mapContainer.querySelector('canvas')
      if (mapCanvas) {
        const mapSnapshot = mapCanvas.toDataURL('image/png')
        const exportMapContainer = exportContainer.querySelector('#amap-container')
        if (exportMapContainer) {
          exportMapContainer.innerHTML = `<img src="${mapSnapshot}" style="width:100%;height:100%;object-fit:cover;" />`
        }
      }
    }

    // 移除所有ant-card类,替换为纯div
    const cards = exportContainer.querySelectorAll('.ant-card')
    cards.forEach((card) => {
      const cardEl = card as HTMLElement
      try {
        cardEl.className = ''
        cardEl.style.setProperty('background-color', '#ffffff')
        cardEl.style.setProperty('border-radius', '12px')
        cardEl.style.setProperty('box-shadow', '0 4px 12px rgba(0, 0, 0, 0.1)')
        cardEl.style.setProperty('margin-bottom', '20px')
        cardEl.style.setProperty('overflow', 'hidden')
      } catch (err) {
        console.error('设置卡片样式失败:', err)
      }
    })

    // 处理卡片头部
    const cardHeads = exportContainer.querySelectorAll('.ant-card-head')
    cardHeads.forEach((head) => {
      const headEl = head as HTMLElement
      try {
        headEl.style.setProperty('background-color', '#667eea')
        headEl.style.setProperty('color', '#ffffff')
        headEl.style.setProperty('padding', '16px 24px')
        headEl.style.setProperty('font-size', '18px')
        headEl.style.setProperty('font-weight', '600')
      } catch (err) {
        console.error('设置卡片头部样式失败:', err)
      }
    })

    // 处理卡片内容
    const cardBodies = exportContainer.querySelectorAll('.ant-card-body')
    cardBodies.forEach((body) => {
      const bodyEl = body as HTMLElement
      bodyEl.style.setProperty('background-color', '#ffffff')
      bodyEl.style.setProperty('padding', '24px')
    })

    // 处理酒店卡片头部
    const hotelCards = exportContainer.querySelectorAll('.hotel-card')
    hotelCards.forEach((card) => {
      const head = card.querySelector('.ant-card-head') as HTMLElement
      if (head) {
        head.style.setProperty('background-color', '#1976d2')
      }
      (card as HTMLElement).style.setProperty('background-color', '#e3f2fd')
    })

    // 处理天气卡片
    const weatherCards = exportContainer.querySelectorAll('.weather-card')
    weatherCards.forEach((card) => {
      (card as HTMLElement).style.setProperty('background-color', '#e0f7fa')
    })

    // 处理预算总计
    const budgetTotal = exportContainer.querySelector('.budget-total')
    if (budgetTotal) {
      const el = budgetTotal as HTMLElement
      el.style.setProperty('background-color', '#667eea')
      el.style.setProperty('color', '#ffffff')
      el.style.setProperty('padding', '20px')
      el.style.setProperty('border-radius', '12px')
      el.style.setProperty('margin-bottom', '20px')
    }

    // 处理预算项
    const budgetItems = exportContainer.querySelectorAll('.budget-item')
    budgetItems.forEach((item) => {
      const el = item as HTMLElement
      el.style.setProperty('background-color', '#f5f7fa')
      el.style.setProperty('padding', '16px')
      el.style.setProperty('border-radius', '8px')
      el.style.setProperty('margin-bottom', '12px')
    })

    // 添加到body(隐藏)
    exportContainer.style.position = 'absolute'
    exportContainer.style.left = '-9999px'
    document.body.appendChild(exportContainer)

    const canvas = await html2canvas(exportContainer, {
      backgroundColor: '#f5f7fa',
      scale: 2,
      logging: false,
      useCORS: true,
      allowTaint: true
    })

    // 移除容器
    document.body.removeChild(exportContainer)

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const imgWidth = 210 // A4宽度(mm)
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // 如果内容高度超过一页,分页处理
    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= 297 // A4高度

    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= 297
    }

    pdf.save(`旅行计划_${tripPlan.value?.city}_${new Date().getTime()}.pdf`)

    message.success({ content: 'PDF导出成功!', key: 'export' })
  } catch (error: any) {
    console.error('导出PDF失败:', error)
    message.error({ content: `导出PDF失败: ${error.message}`, key: 'export' })
  }
}

// 初始化地图
const initMap = async () => {
  try {
    const amapKey = import.meta.env.VITE_AMAP_WEB_JS_KEY
    if (!amapKey) {
      console.warn('未配置 VITE_AMAP_WEB_JS_KEY，跳过地图初始化')
      return
    }

    // 地图容器可能仍被加载骨架隐藏。此时安静跳过，调用方会在 DOM
    // 挂载完成后再次初始化，而不是让高德 SDK 抛出 container not exist。
    const mapContainer = document.getElementById('amap-container')
    if (!mapContainer) {
      return
    }

    const AMap = await AMapLoader.load({
      key: amapKey, // 高德地图 Web 端（JS API）Key
      version: '2.0',
      plugins: ['AMap.Marker', 'AMap.InfoWindow']
    })

    // 创建地图实例
    map = new AMap.Map('amap-container', {
      zoom: 12,
      center: [116.397128, 39.916527], // 默认中心点(北京)
      viewMode: '3D'
    })

    // 添加景点标记
    addAttractionMarkers(AMap)

    message.success('地图加载成功')
  } catch (error) {
    console.error('地图加载失败:', error)
    message.error('地图加载失败')
  }
}

// 添加景点标记
const addAttractionMarkers = (AMap: any) => {
  if (!tripPlan.value) return

  const markers: any[] = []
  const allAttractions: any[] = []

  // 收集所有景点
  tripPlan.value.days.forEach((day, dayIndex) => {
    day.attractions.forEach((attraction, attrIndex) => {
      if (attraction.location && attraction.location.longitude && attraction.location.latitude) {
        allAttractions.push({
          ...attraction,
          dayIndex,
          attrIndex
        })
      }
    })
  })

  // 创建标记
  allAttractions.forEach((attraction, index) => {
    const marker = new AMap.Marker({
      position: [attraction.location.longitude, attraction.location.latitude],
      title: attraction.name,
      label: {
        content: `<div style="background: #4CAF50; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">${index + 1}</div>`,
        offset: new AMap.Pixel(0, -30)
      }
    })

    // 创建信息窗口
    const infoWindow = new AMap.InfoWindow({
      content: `
        <div style="padding: 10px;">
          <h4 style="margin: 0 0 8px 0;">${attraction.name}</h4>
          <p style="margin: 4px 0;"><strong>地址:</strong> ${attraction.address}</p>
          <p style="margin: 4px 0;"><strong>游览时长:</strong> ${attraction.visit_duration}分钟</p>
          <p style="margin: 4px 0;"><strong>描述:</strong> ${attraction.description}</p>
          <p style="margin: 4px 0; color: #1890ff;"><strong>第${attraction.dayIndex + 1}天 景点${attraction.attrIndex + 1}</strong></p>
        </div>
      `,
      offset: new AMap.Pixel(0, -30)
    })

    // 点击标记显示信息窗口
    marker.on('click', () => {
      infoWindow.open(map, marker.getPosition())
    })

    markers.push(marker)
  })

  // 添加标记到地图
  map.add(markers)

  // 自动调整视野以包含所有标记
  if (allAttractions.length > 0) {
    map.setFitView(markers)
  }

  // 路线几何当前未由后端返回，因此地图只展示地点 Marker。
  // 真实道路距离和耗时统一展示在 RouteSegments 中，禁止再画坐标直线。
}

</script>

<style scoped>
.result-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px 20px;
}

.page-header {
  max-width: 1200px;
  margin: 0 auto 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: fadeInDown 0.6s ease-out;
}

.back-button {
  border-radius: 8px;
  font-weight: 500;
}


.session-loading-card,
.cache-alert {
  margin: 0 auto 24px;
  max-width: 1200px;
}

.session-loading-card {
  border-radius: 16px;
}

/* 内容布局 */
.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  gap: 24px;
}

.side-nav {
  width: 240px;
  flex-shrink: 0;
}

.side-nav :deep(.ant-menu) {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  background: white;
}

.side-nav :deep(.ant-menu-item) {
  margin: 4px 8px;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.side-nav :deep(.ant-menu-item-selected) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.side-nav :deep(.ant-menu-item:hover) {
  background: rgba(102, 126, 234, 0.1);
}

.main-content {
  flex: 1;
  min-width: 0;
}

/* 景点图片样式 */
.attraction-image-wrapper {
  position: relative;
  margin-bottom: 12px;
  border-radius: 8px;
  overflow: hidden;
}

.attraction-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.attraction-image-wrapper:hover .attraction-image {
  transform: scale(1.05);
}

.attraction-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.badge-number {
  font-size: 18px;
}

.price-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(255, 77, 79, 0.9);
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: bold;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

/* 天气卡片样式 */
.weather-card {
  background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
  border: none !important;
  transition: all 0.3s ease;
}

.weather-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.weather-date {
  font-size: 16px;
  font-weight: bold;
  color: #00796b;
  margin-bottom: 12px;
  text-align: center;
}

.weather-info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.weather-icon {
  font-size: 24px;
}

.weather-label {
  font-size: 12px;
  color: #666;
}

.weather-value {
  font-size: 16px;
  font-weight: 600;
  color: #00796b;
}

.weather-wind {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(0, 121, 107, 0.2);
  text-align: center;
  color: #00796b;
  font-size: 14px;
}

/* 回到顶部按钮 */
.back-top-button {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-top-button:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

/* 酒店卡片样式 */
.hotel-card {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border: none !important;
}

.hotel-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
}

.hotel-title {
  color: white !important;
  font-weight: 600;
}

/* 顶部信息区布局 */
.top-info-section {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.left-info {
  flex: 0 0 400px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.right-map {
  flex: 1;
}

/* 行程概览卡片 */
.overview-card {
  height: fit-content;
}

.overview-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 14px;
  font-weight: 600;
  color: #666;
}

.info-value {
  font-size: 15px;
  color: #333;
  line-height: 1.6;
}

/* Agent 执行摘要 */
.execution-card {
  height: fit-content;
}

.execution-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.session-id {
  margin-top: 12px;
  color: #64748b;
  font-size: 12px;
  word-break: break-all;
}

.execution-alert {
  margin-top: 14px;
}

.warning-list {
  margin: 0;
  padding-left: 20px;
}

/* 预算卡片 */
.budget-card {
  height: fit-content;
}

.budget-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.budget-item {
  text-align: center;
  padding: 12px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

.budget-label {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.budget-value {
  font-size: 20px;
  font-weight: 700;
  color: #1890ff;
}

.budget-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 8px;
  color: white;
}

.total-label {
  font-size: 16px;
  font-weight: 600;
}

.total-value {
  font-size: 28px;
  font-weight: 700;
}

/* 地图卡片 */
.map-card {
  height: 100%;
  min-height: 500px;
}

.map-card :deep(.ant-card-body) {
  height: calc(100% - 57px);
  padding: 0;
}

.map-content {
  position: relative;
  height: 100%;
  min-height: 500px;
}

.map-canvas {
  width: 100%;
  height: 100%;
  min-height: 500px;
}

.map-disclaimer {
  position: absolute;
  right: 14px;
  bottom: 14px;
  left: 14px;
  z-index: 10;
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.55);
  border-radius: 12px;
  color: #eff8f2;
  background: rgba(23, 60, 43, 0.88);
  backdrop-filter: blur(8px);
  font-size: 12px;
  line-height: 1.6;
}

.meal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 12px;
}

.meal-card {
  padding: 15px;
  border: 1px solid #e2e9e4;
  border-radius: 14px;
  background: #fbfdfb;
}

.meal-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  color: #2c6b4c;
  font-size: 12px;
  font-weight: 700;
}

.meal-card > strong {
  color: #20372b;
  font-size: 15px;
}

.meal-card p {
  margin: 6px 0 0;
  color: #6f7e75;
  font-size: 12px;
}

.meal-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.meal-meta span {
  padding: 4px 7px;
  border-radius: 6px;
  color: #476252;
  background: #eaf3ed;
  font-size: 11px;
}

.meal-description {
  line-height: 1.6;
}

/* 每日行程卡片 */
.days-card {
  margin-top: 20px;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.day-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.day-date {
  font-size: 14px;
  color: #999;
}

.day-info {
  margin-bottom: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  border-radius: 8px;
  border: 1px solid #e8e8e8;
}

.info-row {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .label {
  font-weight: 600;
  color: #666;
  min-width: 100px;
}

.info-row .value {
  color: #333;
  flex: 1;
}

/* 卡片样式优化 */
:deep(.ant-card) {
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 20px;
  transition: all 0.3s ease;
  animation: fadeInUp 0.6s ease-out;
}

:deep(.ant-card:hover) {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

:deep(.ant-card-head) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white !important;
  border-radius: 12px 12px 0 0;
  font-weight: 600;
}

:deep(.ant-card-head-title) {
  color: white !important;
  font-size: 18px;
}

:deep(.ant-card-head-title span) {
  color: white !important;
}

/* Collapse样式 */
:deep(.ant-collapse) {
  border: none;
  background: transparent;
}

:deep(.ant-collapse-item) {
  margin-bottom: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  overflow: hidden;
}

:deep(.ant-collapse-header) {
  background: linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%);
  padding: 16px 20px !important;
  font-weight: 600;
}

:deep(.ant-collapse-content) {
  border-top: 1px solid #e8e8e8;
}

:deep(.ant-collapse-content-box) {
  padding: 20px;
}

/* 统计卡片样式 */
:deep(.ant-statistic-title) {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

:deep(.ant-statistic-content) {
  font-size: 24px;
  font-weight: 600;
  color: #1890ff;
}

/* 景点卡片样式 */
:deep(.ant-list-item) {
  transition: all 0.3s ease;
}

:deep(.ant-list-item:hover) {
  transform: scale(1.02);
}

/* 动画 */
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .result-container {
    padding: 20px 10px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
  }
}
</style>


