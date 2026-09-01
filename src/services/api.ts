import axios from 'axios'
import type {
  AgentSessionSummary,
  AuthCredentials,
  AuthTokenResponse,
  AuthUser,
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
  TripPlanResponse,
  TripPlanningTask,
  TripTaskCancelResponse,
  TripTaskCreateResponse,
  LikeMutationResponse,
  OwnedSharedGuideListItem,
  OwnedSharedGuidePage,
  SharedGuideDetail,
  SharedGuidePage,
  SharedGuideSort
} from '@/types'
import { getAccessToken, notifyUnauthorized, setAuthSession } from '@/utils/auth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://10.126.192.26:8000'

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
    const token = getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
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
    const requestUrl = String(error.config?.url || '')
    const isCredentialRequest = requestUrl.includes('/api/auth/login') || requestUrl.includes('/api/auth/register')
    if (error.response?.status === 401 && !isCredentialRequest) notifyUnauthorized()
    return Promise.reject(error)
  }
)

function getErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<{ detail?: string | Array<{ msg?: string }>; message?: string }>(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      const validationMessage = detail.map((item) => item.msg).filter(Boolean).join('；')
      if (validationMessage) return validationMessage
    }
    return error.response?.data?.message || error.message || fallback
  }
  return error instanceof Error ? error.message : fallback
}

/** 注册成功后保存 Access Token 和当前用户。 */
export async function registerUser(credentials: AuthCredentials): Promise<AuthTokenResponse> {
  try {
    const response = await apiClient.post<AuthTokenResponse>('/api/auth/register', credentials)
    setAuthSession(response.data)
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '注册失败'))
  }
}

/** 登录成功后保存 Access Token 和当前用户。 */
export async function loginUser(credentials: AuthCredentials): Promise<AuthTokenResponse> {
  try {
    const response = await apiClient.post<AuthTokenResponse>('/api/auth/login', credentials)
    setAuthSession(response.data)
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '登录失败'))
  }
}

/** 使用当前 Token 校验登录状态并刷新用户信息。 */
export async function getCurrentUser(): Promise<AuthUser> {
  try {
    const response = await apiClient.get<AuthUser>('/api/auth/me')
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '登录状态已失效'))
  }
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

/** 使用统一的 API 客户端查询景点图片，避免硬编码 10.126.192.26。 */
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

/** 恢复有效检查点；失败或预算耗尽时后端会返回一个重新规划的新会话。 */
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

export interface SharedGuideListOptions {
  city?: string
  travel_days?: number
  transportation?: string
  sort?: SharedGuideSort
  limit?: number
  cursor?: string
}

/** 浏览分享广场；登录后响应会包含当前用户的点赞状态。 */
export async function listSharedGuides(options?: SharedGuideListOptions): Promise<SharedGuidePage> {
  try {
    const response = await apiClient.get<SharedGuidePage>('/api/shared-guides', { params: options })
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '加载分享广场失败'))
  }
}

/** 读取公开分享快照，不暴露源会话、检索文本或索引内部字段。 */
export async function getSharedGuide(shareId: string): Promise<SharedGuideDetail> {
  try {
    const response = await apiClient.get<SharedGuideDetail>(`/api/shared-guides/${shareId}`)
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '加载分享攻略失败'))
  }
}

/** 将当前确认版本发布到分享广场。 */
export async function shareTripSession(
  sessionId: string,
  title?: string | null
): Promise<OwnedSharedGuideListItem> {
  try {
    const response = await apiClient.post<OwnedSharedGuideListItem>(
      `/api/trip/sessions/${sessionId}/share`,
      { title: title?.trim() || null }
    )
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '发布行程失败'))
  }
}

/** 查询当前用户已发布的攻略。 */
export async function listMySharedGuides(
  options?: SharedGuideListOptions
): Promise<OwnedSharedGuidePage> {
  try {
    const response = await apiClient.get<OwnedSharedGuidePage>('/api/users/me/shared-guides', {
      params: options
    })
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '加载我的分享失败'))
  }
}

export async function updateSharedGuide(
  shareId: string,
  title?: string | null
): Promise<OwnedSharedGuideListItem> {
  try {
    const response = await apiClient.put<OwnedSharedGuideListItem>(
      `/api/shared-guides/${shareId}`,
      { title: title?.trim() || null }
    )
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '更新分享攻略失败'))
  }
}

export async function deleteSharedGuide(shareId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/shared-guides/${shareId}`)
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '取消分享失败'))
  }
}

export async function setSharedGuideLike(
  shareId: string,
  liked: boolean
): Promise<LikeMutationResponse> {
  try {
    const response = liked
      ? await apiClient.put<LikeMutationResponse>(`/api/shared-guides/${shareId}/like`)
      : await apiClient.delete<LikeMutationResponse>(`/api/shared-guides/${shareId}/like`)
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, liked ? '点赞失败' : '取消点赞失败'))
  }
}

/** 永久删除当前用户的一条旅行规划会话及其任务、草稿和版本。 */
export async function deleteTripSession(sessionId: string): Promise<void> {
  try {
    await apiClient.delete(`/api/trip/sessions/${sessionId}`)
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '删除旅行会话失败'))
  }
}

export default apiClient


/** 创建持久化异步任务。幂等键在网络重试时必须复用。 */
export async function createTripTask(
  formData: TripFormData,
  idempotencyKey: string
): Promise<TripTaskCreateResponse> {
  try {
    const response = await apiClient.post<TripTaskCreateResponse>('/api/trip/tasks', formData, {
      headers: { 'Idempotency-Key': idempotencyKey },
      timeout: 15000
    })
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '创建旅行规划任务失败'))
  }
}

/** 页面刷新、SSE 断线或浏览器重新打开后，重新获取持久化任务快照。 */
export async function getTripTask(taskId: string): Promise<TripPlanningTask> {
  try {
    const response = await apiClient.get<TripPlanningTask>(`/api/trip/tasks/${taskId}`, {
      timeout: 15000
    })
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '查询旅行规划任务失败'))
  }
}

/** 取消排队中或执行中的任务。 */
export async function cancelTripTask(taskId: string): Promise<TripTaskCancelResponse> {
  try {
    const response = await apiClient.post<TripTaskCancelResponse>(
      `/api/trip/tasks/${taskId}/cancel`,
      undefined,
      { timeout: 15000 }
    )
    return response.data
  } catch (error: unknown) {
    throw new Error(getErrorMessage(error, '取消旅行规划任务失败'))
  }
}

export interface TripTaskSseMessage {
  event: string
  data: string
  lastEventId: string
}

interface TripTaskStreamHandlers {
  onOpen?: () => void
  onEvent: (message: TripTaskSseMessage) => void
  onClose?: () => void
  onError?: (error: unknown) => void
}

/** 构建 SSE 地址；Token 只放 Authorization 请求头，禁止写入 URL。 */
export function getTripTaskEventsUrl(taskId: string, afterEventId = 0): string {
  const url = new URL(`/api/trip/tasks/${taskId}/events`, API_BASE_URL)
  if (afterEventId > 0) url.searchParams.set('after_event_id', String(afterEventId))
  return url.toString()
}

function parseSseBlock(block: string): TripTaskSseMessage | null {
  let event = 'message'
  let lastEventId = ''
  const data: string[] = []
  for (const line of block.split(/\r?\n/)) {
    if (!line || line.startsWith(':')) continue
    const separator = line.indexOf(':')
    const field = separator >= 0 ? line.slice(0, separator) : line
    const value = separator >= 0 ? line.slice(separator + 1).replace(/^ /, '') : ''
    if (field === 'event') event = value
    else if (field === 'id') lastEventId = value
    else if (field === 'data') data.push(value)
  }
  if (data.length === 0) return null
  return { event, data: data.join('\n'), lastEventId }
}

/** 使用 fetch 读取带 Bearer Token 的 SSE，返回 AbortController 供页面主动关闭。 */
export function openTripTaskEventStream(
  taskId: string,
  afterEventId: number,
  handlers: TripTaskStreamHandlers
): AbortController {
  const controller = new AbortController()
  void (async () => {
    try {
      const token = getAccessToken()
      const response = await fetch(getTripTaskEventsUrl(taskId, afterEventId), {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        signal: controller.signal
      })
      if (response.status === 401) {
        notifyUnauthorized()
        throw new Error('登录状态已失效，请重新登录')
      }
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { detail?: string } | null
        throw new Error(payload?.detail || `任务事件连接失败（HTTP ${response.status}）`)
      }
      if (!response.body) throw new Error('浏览器不支持流式任务进度')
      handlers.onOpen?.()
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (!controller.signal.aborted) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split(/\r?\n\r?\n/)
        buffer = blocks.pop() || ''
        for (const block of blocks) {
          const message = parseSseBlock(block)
          if (message) handlers.onEvent(message)
        }
      }
      if (!controller.signal.aborted) handlers.onClose?.()
    } catch (error: unknown) {
      if (!controller.signal.aborted) handlers.onError?.(error)
    }
  })()
  return controller
}
