const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${method} ${path} → ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ── Roadmap ──────────────────────────────────────────────────────────────────

export function generateRoadmap(body: {
  user_id: string
  goal: string
  experience: number
  frequency: string
  session_minutes: number
  weeks: number
  success_vision: string
  grading_mode: string
  coaching_result?: Record<string, unknown>
}, token?: string | null) {
  return request<Record<string, unknown>>('POST', '/roadmap/generate', body, token)
}

export function getRoadmap(userId: string, token?: string | null) {
  return request<Record<string, unknown>>('GET', `/roadmap/${userId}`, undefined, token)
}

export function updateRoadmapProgress(userId: string, activeIndex: number, token?: string | null) {
  return request<Record<string, unknown>>('PATCH', `/roadmap/${userId}/progress`, { active_index: activeIndex }, token)
}

// ── Lesson ───────────────────────────────────────────────────────────────────

export function generateLesson(body: {
  user_id: string
  lesson_key: string
  lesson_title: string
  chapter_title: string
  goal: string
  buddy_name: string
  experience: number
  completed_lesson_titles?: string[]
  lesson_type?: string
  recipe_id?: number
}, token?: string | null) {
  return request<Record<string, unknown>>('POST', '/lesson/generate', body, token)
}

export function activityComplete(body: {
  user_id: string
  lesson_key: string
  activity_id: string
  passed: boolean
}, token?: string | null) {
  return request<{
    activity_completed: boolean
    xp_earned: number
    lesson_now_required_complete: boolean
    lesson_now_fully_complete: boolean
    mission_created?: { id: number; title: string; description: string } | null
  }>('POST', '/lesson/activity-complete', body, token)
}

export function gradeFillBlank(body: {
  user_id: string
  lesson_key: string
  activity_id: string
  user_answer: string
  correct_answer: string
  lesson_title: string
  goal: string
}, token?: string | null) {
  return request<{ correct: boolean; feedback: string }>('POST', '/lesson/grade-fill-blank', body, token)
}

export function validateLesson(body: {
  user_id: string
  lesson_key: string
  mission_id: string
  photo_base64: string
  photo_media_type: string
  reflection_choice: string
  buddy_name: string
  goal: string
  lesson_title: string
}, token?: string | null) {
  return request<Record<string, unknown>>('POST', '/lesson/validate', body, token)
}

// ── Missions ─────────────────────────────────────────────────────────────────

export function listMissions(userId: string, token?: string | null) {
  return request<{
    id: number
    lesson_key: string
    lesson_title: string
    title: string
    description: string
    tips: string[]
    status: string
    feedback: Record<string, unknown> | null
    xp_awarded: number
    created_at: string
    submitted_at: string | null
  }[]>('GET', `/mission/?user_id=${userId}`, undefined, token)
}

export function submitMission(missionId: number, body: {
  user_id: string
  photo_base64: string
  photo_media_type?: string
  notes?: string
}, token?: string | null) {
  return request<{
    feedback: Record<string, unknown>
    xp_earned: number
    already_graded: boolean
  }>('POST', `/mission/${missionId}/submit`, body, token)
}

// ── Profile ──────────────────────────────────────────────────────────────────

export function getProfile(userId: string, token?: string | null) {
  return request<{
    goal: string
    grading_mode: string
    streak_days: number
    total_xp: number
    lessons_completed: number
    missions_submitted: number
    recipes_cooked: number
    chapter_progress: { current: number; total: number }
    recent_submissions: {
      id: number
      lesson_title: string
      mission_title: string
      overall_stars: number
      type: string
      graded_at: string | null
    }[]
  }>('GET', `/profile/?user_id=${userId}`, undefined, token)
}
