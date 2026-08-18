// 前后端共享的数据契约。字段命名与后端 app/schemas/trip_schema.py 保持一致。

export interface Location {
  longitude: number
  latitude: number
}

export interface Attraction {
  name: string
  address: string
  location: Location
  visit_duration: number
  description: string
  category?: string | null
  rating?: number | null
  photos?: string[] | null
  poi_id?: string | null
  image_url?: string | null
  ticket_price?: number
}

export interface Meal {
  type: string
  name: string
  address?: string | null
  location?: Location | null
  description?: string | null
  estimated_cost?: number
  poi_id?: string
  rating?: number | null
  telephone?: string
  category?: string
  opening_hours?: string
  source?: string
  planned_start_time?: string
  planned_end_time?: string
  opening_status?: string
}

export interface Hotel {
  name: string
  address: string
  location?: Location | null
  price_range: string
  rating: string
  distance: string
  type: string
  estimated_cost?: number
}

export interface Budget {
  total_attractions: number
  total_hotels: number
  total_meals: number
  total_transportation: number
  total: number
}

export interface DayPlan {
  date: string
  day_index: number
  description: string
  transportation: string
  accommodation: string
  hotel?: Hotel | null
  attractions: Attraction[]
  meals: Meal[]
}

export interface WeatherInfo {
  date: string
  day_weather: string
  night_weather: string
  day_temp: number | string
  night_temp: number | string
  wind_direction: string
  wind_power: string
}

export interface TripPlan {
  city: string
  start_date: string
  end_date: string
  days: DayPlan[]
  weather_info: WeatherInfo[]
  overall_suggestions: string
  budget?: Budget | null
}

export interface TripFormData {
  city: string
  start_date: string
  end_date: string
  travel_days: number
  transportation: string
  accommodation: string
  preferences: string[]
  free_text_input: string
}

export type CompletionMode = 'full' | 'partial'
export type QualityLevel = 'excellent' | 'acceptable' | 'degraded' | 'unusable'

/** POST /api/trip/plan 的完整响应，不能只保存 data，否则会丢失会话和质量信息。 */
export interface TripPlanResponse {
  success: boolean
  message: string
  data?: TripPlan | null
  session_id?: string | null
  execution_steps?: number | null
  completion_mode?: CompletionMode | null
  quality_level?: QualityLevel | null
  quality_score?: number | null
  warnings: string[]
}

export interface HealthCheckResponse {
  status: string
  message: string
}

export interface PoiPhotoResponse {
  success?: boolean
  data?: {
    name?: string
    photo_url?: string
  }
  place_name?: string
  image_url?: string | null
  error?: string
}

export type AgentStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'max_steps_reached'
  | 'budget_exhausted'
  | 'convergence_stopped'
  | 'cancelled'

export type RouteMode = 'walking' | 'driving' | 'transit'
export type RouteLegType = 'hotel_departure' | 'between_attractions' | 'hotel_return'

/** 高德真实路线的一段标准化结果，不包含供应商原始大对象。 */
export interface RouteEstimate {
  provider: 'amap'
  day_index: number
  leg_index: number
  leg_type: RouteLegType
  date: string
  origin_name: string
  destination_name: string
  mode: RouteMode
  available: boolean
  distance_meters?: number | null
  duration_seconds?: number | null
  error_code?: string | null
  error_message?: string | null
  cache_hit: boolean
}

export interface RouteExecutionSummary {
  provider: string
  requested_legs: number
  evaluated_legs: number
  truncated_legs: number
  cache_hits: number
  cache_misses: number
  failed_legs: number
}

export interface RouteDayQuality {
  day_index: number
  date: string
  attraction_count: number
  leg_count: number
  available_legs: number
  unavailable_legs: number
  total_distance_meters: number
  total_duration_seconds: number
  longest_leg_index?: number | null
  longest_duration_seconds?: number | null
  excessive_duration_legs: number
  long_distance_legs: number
  optimization_cost: number
  quality_score: number
  optimization_recommended: boolean
}

export interface RouteQualityReport {
  plan_fingerprint: string
  total_legs: number
  available_legs: number
  unavailable_legs: number
  total_distance_meters: number
  total_duration_seconds: number
  excessive_duration_legs: number
  long_distance_legs: number
  optimization_cost: number
  quality_score: number
  optimization_recommended: boolean
  days: RouteDayQuality[]
}

export type TimelineItemType = 'attraction' | 'transportation' | 'meal' | 'break'
export type TransportationTimeSource = 'amap' | 'haversine_fallback'

export interface TimelineItem {
  item_type: TimelineItemType
  name: string
  start_time: string
  end_time: string
  duration_minutes: number
  day_index: number
  source_index?: number | null
  transportation_time_source?: TransportationTimeSource | null
}

export interface DayScheduleQuality {
  day_index: number
  date: string
  available_minutes: number
  attraction_minutes: number
  transportation_minutes: number
  meal_minutes: number
  break_minutes: number
  total_required_minutes: number
  free_minutes: number
  overtime_minutes: number
  fallback_route_legs: number
  optimization_cost: number
  quality_score: number
  feasible: boolean
  timeline: TimelineItem[]
}

export interface ScheduleQualityReport {
  plan_fingerprint: string
  feasible_days: number
  infeasible_days: number
  total_overtime_minutes: number
  fallback_route_legs: number
  total_transportation_minutes: number
  optimization_cost: number
  quality_score: number
  optimization_recommended: boolean
  days: DayScheduleQuality[]
}

export interface CommuteSegmentIssue {
  code: 'route.segment_too_long'
  day_index: number
  leg_index: number
  leg_type: RouteLegType
  origin_name: string
  destination_name: string
  mode: RouteMode
  duration_seconds: number
  distance_meters: number
  limit_seconds: number
  excess_seconds: number
  target_attraction_name: string
  target_attraction_index: number
}

export interface DayCommuteReport {
  day_index: number
  segment_count: number
  excessive_segment_count: number
  max_duration_seconds: number
  issues: CommuteSegmentIssue[]
}

export interface CommuteConstraintReport {
  plan_fingerprint: string
  total_segments: number
  excessive_segment_count: number
  max_duration_seconds: number
  total_excess_seconds: number
  optimization_recommended: boolean
  issues: CommuteSegmentIssue[]
  days: DayCommuteReport[]
}

export type ConstraintSeverity = 'error' | 'warning'

export interface ConstraintIssue {
  code: string
  severity: ConstraintSeverity
  path: string
  message: string
  repair_hint: string
  repairable: boolean
  day_index: number
  source_index?: number | null
  attraction_name?: string | null
  penalty: number
  expected?: unknown
  actual?: unknown
}

export interface DayConstraintReport {
  day_index: number
  date: string
  error_count: number
  warning_count: number
  optimization_cost: number
  feasible: boolean
  issues: ConstraintIssue[]
}

export interface TripConstraintReport {
  plan_fingerprint: string
  error_count: number
  warning_count: number
  repairable_issue_count: number
  optimization_cost: number
  quality_score: number
  feasible: boolean
  optimization_recommended: boolean
  days: DayConstraintReport[]
  issues: ConstraintIssue[]
}

/**
 * GET /api/trip/sessions/{sessionId}/execution-view 的轻量结果页契约。
 * 它刻意不包含候选池、优化基线、内部指纹和完整 action_history。
 */
export interface TripExecutionView {
  session_id: string
  status: AgentStatus
  current_step: number
  max_steps: number
  finished: boolean
  can_resume: boolean
  request: TripFormData
  trip_plan?: TripPlan | null
  completion_mode?: CompletionMode | null
  quality_level?: QualityLevel | null
  quality_score?: number | null
  warnings: string[]
  last_error?: string | null
  route_summary: RouteExecutionSummary
  route_segments: RouteEstimate[]
  route_quality_report?: RouteQualityReport | null
  schedule_quality_report?: ScheduleQualityReport | null
  commute_report?: CommuteConstraintReport | null
  constraint_report?: TripConstraintReport | null
  tool_call_count: number
  llm_call_count: number
  total_retry_count: number
  total_duration_ms: number
  updated_at: string
}

export interface AgentSessionSummary {
  session_id: string
  status: AgentStatus
  city: string
  current_step: number
  max_steps: number
  action_count: number
  created_at: string
  updated_at: string
}

export interface AgentActionRecord {
  step: number
  action: string
  reason: string
  attempt: number
  success: boolean
  error?: string | null
  tool_name?: string | null
  error_type?: string | null
  retryable: boolean
  duration_ms: number
  retry_delay_ms: number
  circuit_state?: string | null
  provider_code?: string | null
  provider_message?: string | null
  validation_error_count: number
  validation_warning_count: number
  made_progress?: boolean | null
  compressed: boolean
  batch_root_action?: string | null
  batch_index: number
  compressed_actions: string[]
  recorded_at: string
}

export interface PartialAcceptanceReport {
  accepted: boolean
  partial: boolean
  quality_level: QualityLevel
  quality_score: number
  reason: string
  core_checks: Record<string, boolean>
  blocking_reasons: string[]
  warnings: string[]
  unresolved_issue_codes: string[]
}

/**
 * SQLite 中保存的完整智能体检查点。
 * 前端只显式声明会话闭环需要的稳定字段，其余内部评估字段保持 unknown。
 */
export interface AgentState {
  state_version: number
  session_id: string
  request: TripFormData
  status: AgentStatus
  current_step: number
  max_steps: number
  repair_count: number
  finished: boolean
  created_at: string
  updated_at: string
  started_at: string
  deadline_at?: string | null
  tool_call_count: number
  llm_call_count: number
  total_retry_count: number
  total_duration_ms: number
  total_retry_delay_ms: number
  budget_exhausted_reason?: string | null
  trip_plan?: TripPlan | null
  acceptance_report?: PartialAcceptanceReport | null
  completion_mode?: CompletionMode | null
  completion_warnings: string[]
  action_history: AgentActionRecord[]
  attempts_by_action: Record<string, number>
  errors: string[]
  convergence_terminated_reason?: string | null
  [key: string]: unknown
}



/** 行程编辑草稿与版本接口契约。 */
export interface TripPlanDiff {
  changed_fields: string[]
  changed_days: number[]
  changed_attractions: string[]
  changed_hotels: number[]
  changed_meals: number[]
  affected_route_keys: string[]
  reused_route_legs: number
  queried_route_legs: number
}

export interface VersionQualitySnapshot {
  version_number: number
  quality_score?: number | null
  quality_level?: QualityLevel | null
  accepted: boolean
  route_score?: number | null
  schedule_score?: number | null
  unavailable_route_legs: number
  schedule_overtime_minutes: number
  excessive_commute_segments: number
  constraint_errors: number
  validation_errors: number
  warnings: string[]
  blocking_reasons: string[]
}

export type TripDraftStatus = 'editing' | 'evaluated' | 'confirmed' | 'superseded'
export type TripPlanVersionStatus = 'candidate' | 'confirmed' | 'superseded'

export interface TripDraft {
  draft_id: string
  session_id: string
  base_version: number
  status: TripDraftStatus
  trip_plan: TripPlan
  diff?: TripPlanDiff | null
  candidate_version_id?: string | null
  created_at: string
  updated_at: string
}

export interface TripPlanVersion {
  version_id: string
  session_id: string
  version_number: number
  status: TripPlanVersionStatus
  source: 'original' | 'draft'
  source_draft_id?: string | null
  trip_plan: TripPlan
  evaluation: {
    acceptance_report: PartialAcceptanceReport
    route_quality_report: RouteQualityReport
    schedule_quality_report: ScheduleQualityReport
    commute_report: CommuteConstraintReport
    constraint_report: TripConstraintReport
  }
  created_at: string
  confirmed_at?: string | null
}

export interface DraftEvaluationResponse {
  draft: TripDraft
  candidate_version: TripPlanVersion
  before: VersionQualitySnapshot
  after: VersionQualitySnapshot
  diff: TripPlanDiff
}

export interface ConfirmDraftResponse {
  draft: TripDraft
  confirmed_version: TripPlanVersion
}

/** 阶段五：异步旅行规划任务、结构化故障和 SSE 事件契约。 */
export type TripTaskStatus =
  | 'queued'
  | 'running'
  | 'retrying'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'timed_out'

export interface TaskFailureReport {
  code: string
  message: string
  stage: string
  stage_name: string
  action?: string | null
  retryable: boolean
  provider_code?: string | null
  provider_message?: string | null
  session_id: string
  current_step: number
  max_steps: number
  exception_type: string
  occurred_at: string
  details: Record<string, unknown>
}

export interface TripPlanningTask {
  task_id: string
  session_id: string
  idempotency_key: string
  request_fingerprint: string
  request: TripFormData
  status: TripTaskStatus
  current_stage: string
  stage_name: string
  current_action?: string | null
  progress_percent: number
  current_step: number
  max_steps: number
  attempt: number
  recovery_count: number
  message: string
  cancel_requested: boolean
  worker_id?: string | null
  lease_expires_at?: string | null
  heartbeat_at?: string | null
  result_session_id?: string | null
  failure_report?: TaskFailureReport | null
  created_at: string
  started_at?: string | null
  updated_at: string
  finished_at?: string | null
}

export interface TripTaskCreateResponse {
  task_id: string
  session_id: string
  status: TripTaskStatus
  created_at: string
  reused: boolean
}

export interface TripTaskCancelResponse {
  task_id: string
  status: TripTaskStatus
  cancel_requested: boolean
  message: string
}

export interface TripTaskEvent {
  event_id: number
  task_id: string
  event_type: string
  stage: string
  stage_name: string
  progress_percent: number
  current_step: number
  message: string
  data: Record<string, unknown>
  created_at: string
}
