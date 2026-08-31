import type {
  AgentState,
  AgentStatus,
  QualityLevel,
  TripPlanResponse
} from '@/types'

const statusLabels: Record<AgentStatus, string> = {
  pending: '等待执行',
  running: '执行中',
  completed: '已完成',
  failed: '执行失败',
  max_steps_reached: '达到步骤上限',
  budget_exhausted: '执行预算耗尽',
  convergence_stopped: '收敛终止',
  cancelled: '已取消'
}

const statusColors: Record<AgentStatus, string> = {
  pending: 'default',
  running: 'processing',
  completed: 'success',
  failed: 'error',
  max_steps_reached: 'warning',
  budget_exhausted: 'volcano',
  convergence_stopped: 'orange',
  cancelled: 'default'
}

const actionLabels: Record<string, string> = {
  search_attractions: '搜索景点',
  get_weather: '查询天气',
  search_hotels: '搜索酒店',
  search_restaurants: '搜索餐饮',
  generate_plan: '生成行程',
  validate_plan: '校验行程',
  estimate_routes: '查询路线',
  optimize_routes: '优化路线',
  evaluate_commute: '评估通勤',
  replace_remote_attraction: '替换过远景点',
  supplement_attractions: '补充景点候选',
  evaluate_schedule: '评估时间轴',
  optimize_schedule: '优化时间轴',
  evaluate_constraints: '评估可执行约束',
  optimize_constraints: '修复约束冲突',
  refill_attractions: '回填景点',
  rebuild_plan_content: '重建行程内容',
  repair_plan: '修复行程结构',
  finish: '完成行程'
}

export function getAgentStatusLabel(status: AgentStatus): string {
  return statusLabels[status] || status
}

export function getAgentStatusColor(status: AgentStatus): string {
  return statusColors[status] || 'default'
}

export function getAgentActionLabel(action: string): string {
  return actionLabels[action] || action
}

export function formatSessionDate(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date)
}

export function canResumeSession(status: AgentStatus): boolean {
  return status !== 'completed' && status !== 'cancelled'
}

export function getResumeActionLabel(status: AgentStatus): string {
  return ['failed', 'max_steps_reached', 'budget_exhausted', 'convergence_stopped'].includes(status)
    ? '重新规划'
    : '恢复执行'
}

/** 将完整 AgentState 投影为结果页使用的公开响应结构。 */
export function stateToTripPlanResponse(state: AgentState): TripPlanResponse {
  return {
    success: state.status === 'completed' || Boolean(state.trip_plan),
    message: state.acceptance_report?.reason || getAgentStatusLabel(state.status),
    data: state.trip_plan || null,
    session_id: state.session_id,
    execution_steps: state.current_step,
    completion_mode: state.completion_mode || null,
    quality_level: state.acceptance_report?.quality_level as QualityLevel | undefined,
    quality_score: state.acceptance_report?.quality_score ?? null,
    warnings: state.completion_warnings || state.acceptance_report?.warnings || []
  }
}
