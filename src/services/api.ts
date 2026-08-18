import axios from 'axios'
import type {
  AgentSessionSummary,
  AgentState,
  AgentStatus,
  ConfirmDraftResponse,
  DraftEvaluationResponse,
  HealthCheckResponse,
  PoiPhotoResponse,
  TripExecutionView,
  TripDraft,
  TripFormData,
  TripPlan,
  TripPlanVersion,
  TripPlanResponse
} from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 1200000, // 行程生成包含外部工具调用，最多等待 20 分钟。
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器：开发阶段用于确认请求是否命中了正确的后端地址。
apiClient.interceptors.request.use(
  (config) => {
    console.log('发送请求:', config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器：保留 HTTP 状态，便于后续接入结构化错误展示。
apiClient.interceptors.response.use(
  (response) => {
    console.log('收到响应:', response.status, response.config.url)
    return response
  },
  (error) => {
    console.error('响应错误:', error.response?.status, error.message)
    return Promise.reject(error)
  }
)

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ detail?: string; message?: string }>(error)) {
    return error.response?.data?.detail || error.response?.data?.message || error.message || fallback
  }
  return error instanceof Error ? error.message : fallback
}

/** 生成旅行计划，并返回包含会话、质量评分和警告在内的完整响应。 */
export async function generateTripPlan(formData: TripFormData): Promise<TripPlanResponse> {
  try {
    const response = await apiClient.post<TripPlanResponse>('/api/trip/plan', formData)
    return response.data
  } catch (error: unknown) {
    console.error('生成旅行计划失败:', error)
    throw new Error(getErrorMessage(error, '生成旅行计划失败'))
  }
}

/** 使用统一的 API 客户端查询景点图片，避免硬编码 localhost。 */
export async function getAttractionPhoto(name: string): Promise<PoiPhotoResponse> {
  try {
    const response = await apiClient.get<PoiPhotoResponse>('/api/poi/photo', {
      params: { name }
    })
    return response.data
  } catch (error: unknown) {
    console.error(`获取${name}图片失败:`, error)
    throw new Error(getErrorMessage(error, '获取景点图片失败'))
  }
}

/** 后端健康检查的真实路径为 /api/health。 */
export async function healthCheck(): Promise<HealthCheckResponse> {
  try {
    const response = await apiClient.get<HealthCheckResponse>('/api/health')
    return response.data
  } catch (error: unknown) {
    console.error('健康检查失败:', error)
    throw new Error(getErrorMessage(error, '健康检查失败'))
  }
}


/** 查询最近的旅行规划会话摘要。 */
export async function listTripSessions(options?: {
  limit?: number
  status?: AgentStatus
}): Promise<AgentSessionSummary[]> {
  try {
    const response = await apiClient.get<AgentSessionSummary[]>('/api/trip/sessions', {
      params: options
    })
    return response.data
  } catch (error: unknown) {
    console.error('查询会话列表失败:', error)
    throw new Error(getErrorMessage(error, '查询历史行程失败'))
  }
}

/** 读取结果页轻量执行视图，避免每次刷新传输完整 AgentState。 */
export async function getTripExecutionView(sessionId: string): Promise<TripExecutionView> {
  try {
    const response = await apiClient.get<TripExecutionView>(
      `/api/trip/sessions/${sessionId}/execution-view`
    )
    return response.data
  } catch (error: unknown) {
    console.error(`查询会话 ${sessionId} 执行视图失败:`, error)
    throw new Error(getErrorMessage(error, '查询行程执行视图失败'))
  }
}

/** 从 SQLite 最近检查点读取完整会话状态。 */
export async function getTripSession(sessionId: string): Promise<AgentState> {
  try {
    const response = await apiClient.get<AgentState>(`/api/trip/sessions/${sessionId}`)
    return response.data
  } catch (error: unknown) {
    console.error(`查询会话 ${sessionId} 失败:`, error)
    throw new Error(getErrorMessage(error, '查询会话详情失败'))
  }
}

/** 从最近检查点恢复执行，后端会避免重复已经成功的动作。 */
export async function resumeTripSession(sessionId: string): Promise<AgentState> {
  try {
    const response = await apiClient.post<AgentState>(`/api/trip/sessions/${sessionId}/resume`)
    return response.data
  } catch (error: unknown) {
    console.error(`恢复会话 ${sessionId} 失败:`, error)
    throw new Error(getErrorMessage(error, '恢复旅行规划失败'))
  }
}


/** 以当前确认版本为基线创建可重复编辑的服务端草稿。 */
export async function createTripDraft(sessionId: string, tripPlan: TripPlan): Promise<TripDraft> {
  try {
    const response = await apiClient.post<TripDraft>(`/api/trip/sessions/${sessionId}/drafts`, {
      trip_plan: tripPlan
    })
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '创建行程草稿失败'))
  }
}

/** 更新草稿时后端会废弃上一次尚未确认的候选版本。 */
export async function updateTripDraft(
  sessionId: string,
  draftId: string,
  tripPlan: TripPlan
): Promise<TripDraft> {
  try {
    const response = await apiClient.put<TripDraft>(
      `/api/trip/sessions/${sessionId}/drafts/${draftId}`,
      { trip_plan: tripPlan }
    )
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '更新行程草稿失败'))
  }
}

/** 触发增量路线查询和全套确定性重新评估。 */
export async function evaluateTripDraft(
  sessionId: string,
  draftId: string
): Promise<DraftEvaluationResponse> {
  try {
    const response = await apiClient.post<DraftEvaluationResponse>(
      `/api/trip/sessions/${sessionId}/drafts/${draftId}/evaluate`
    )
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '重新评估行程草稿失败'))
  }
}

/** 用户确认后，候选版本才会覆盖 execution-view 当前展示版本。 */
export async function confirmTripDraft(
  sessionId: string,
  draftId: string
): Promise<ConfirmDraftResponse> {
  try {
    const response = await apiClient.post<ConfirmDraftResponse>(
      `/api/trip/sessions/${sessionId}/drafts/${draftId}/confirm`
    )
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '确认新行程版本失败'))
  }
}

export async function listTripPlanVersions(sessionId: string): Promise<TripPlanVersion[]> {
  try {
    const response = await apiClient.get<TripPlanVersion[]>(
      `/api/trip/sessions/${sessionId}/versions`
    )
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '查询行程版本失败'))
  }
}

export default apiClient
