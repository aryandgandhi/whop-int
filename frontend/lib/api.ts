import type {
  AuthResponse,
  Profile,
  Review,
  Submission,
  SubmissionWithTask,
  Task,
  TaskListResponse,
  Topic,
  User,
  Wallet,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const TOKEN_KEY = "wap_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
      if (Array.isArray(body.detail)) {
        detail = body.detail.map((d: { msg: string }) => d.msg).join(", ");
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  // Auth
  register: (data: { email: string; display_name: string; password: string }) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  login: (data: { email: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => request<User>("/api/auth/me"),

  // Topics
  topics: () => request<Topic[]>("/api/topics"),

  // Tasks
  listTasks: (params: {
    topic?: string;
    status?: string;
    q?: string;
    page?: number;
    page_size?: number;
  }) => {
    const search = new URLSearchParams();
    if (params.topic) search.set("topic", params.topic);
    if (params.status) search.set("status", params.status);
    if (params.q) search.set("q", params.q);
    if (params.page) search.set("page", String(params.page));
    if (params.page_size) search.set("page_size", String(params.page_size));
    const qs = search.toString();
    return request<TaskListResponse>(`/api/tasks${qs ? `?${qs}` : ""}`);
  },
  getTask: (id: string) => request<Task>(`/api/tasks/${id}`),
  createTask: (data: {
    title: string;
    description: string;
    topic_slug: string;
    reward_per_slot_cents: number;
    slots_total: number;
  }) => request<Task>("/api/tasks", { method: "POST", body: JSON.stringify(data) }),
  cancelTask: (id: string) =>
    request<Task>(`/api/tasks/${id}/cancel`, { method: "POST" }),
  myPostedTasks: () => request<Task[]>("/api/tasks/me/posted"),

  // Engagements (hybrid volunteer flow)
  volunteer: (taskId: string, pitch: string) =>
    request<Submission>(`/api/tasks/${taskId}/volunteer`, {
      method: "POST",
      body: JSON.stringify({ pitch: pitch || null }),
    }),
  myEngagement: (taskId: string) =>
    request<Submission | null>(`/api/tasks/${taskId}/me`),
  listTaskSubmissions: (taskId: string) =>
    request<Submission[]>(`/api/tasks/${taskId}/submissions`),
  acceptVolunteer: (id: string) =>
    request<Submission>(`/api/submissions/${id}/accept`, { method: "POST" }),
  rejectVolunteer: (id: string) =>
    request<Submission>(`/api/submissions/${id}/reject`, { method: "POST" }),
  submitWork: (id: string, content: string) =>
    request<Submission>(`/api/submissions/${id}/submit-work`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
  completeSubmission: (id: string) =>
    request<Submission>(`/api/submissions/${id}/complete`, { method: "POST" }),
  withdraw: (id: string) =>
    request<Submission>(`/api/submissions/${id}/withdraw`, { method: "POST" }),
  reviewSubmission: (id: string, rating: number, comment: string) =>
    request<Review>(`/api/submissions/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ rating, comment: comment || null }),
    }),
  mySubmissions: () => request<SubmissionWithTask[]>("/api/me/submissions"),

  // Profiles & reviews
  getProfile: (id: string) => request<Profile>(`/api/users/${id}`),
  userReviews: (id: string) => request<Review[]>(`/api/users/${id}/reviews`),
  updateMe: (data: { display_name?: string; bio?: string }) =>
    request<User>("/api/users/me", { method: "PATCH", body: JSON.stringify(data) }),

  // Wallet
  wallet: () => request<Wallet>("/api/wallet"),
};
