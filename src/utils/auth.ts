import { computed, readonly, ref } from 'vue'
import type { AuthTokenResponse, AuthUser } from '@/types'

const TOKEN_KEY = 'travelAgentAccessToken'
const USER_KEY = 'travelAgentCurrentUser'
export const AUTH_UNAUTHORIZED_EVENT = 'travel-agent:unauthorized'

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

const accessToken = ref(localStorage.getItem(TOKEN_KEY) || '')
const currentUser = ref<AuthUser | null>(readStoredUser())

export const authSession = {
  accessToken: readonly(accessToken),
  currentUser: readonly(currentUser),
  isAuthenticated: computed(() => Boolean(accessToken.value))
}

export function getAccessToken(): string {
  return accessToken.value
}

export function setAuthSession(response: AuthTokenResponse): void {
  accessToken.value = response.access_token
  currentUser.value = response.user
  localStorage.setItem(TOKEN_KEY, response.access_token)
  localStorage.setItem(USER_KEY, JSON.stringify(response.user))
}

export function clearAuthSession(): void {
  accessToken.value = ''
  currentUser.value = null
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function notifyUnauthorized(): void {
  clearAuthSession()
  window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT))
}

window.addEventListener('storage', (event) => {
  if (event.key === TOKEN_KEY || event.key === USER_KEY) {
    accessToken.value = localStorage.getItem(TOKEN_KEY) || ''
    currentUser.value = readStoredUser()
  }
})
