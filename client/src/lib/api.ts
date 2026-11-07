import axios, { type AxiosError, type AxiosRequestConfig } from 'axios';
import type {
  AIStatus,
  ApiErrorShape,
  DashboardOverview,
  Interview,
  Paginated,
  Resume,
  User,
} from '../types';

export const API_URL = import.meta.env.VITE_API_URL ?? '/api';

let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

export const http = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

http.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_URL}/auth/refresh`, {}, { withCredentials: true })
      .then((res) => {
        const token = res.data.accessToken as string;
        setAccessToken(token);
        return token;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

const AUTH_PATHS = ['/auth/refresh', '/auth/login', '/auth/register'];

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;
    const status = error.response?.status;
    const url = original?.url ?? '';

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !AUTH_PATHS.some((path) => url.includes(path))
    ) {
      original._retry = true;
      const token = await refreshAccessToken();
      if (token) {
        original.headers = original.headers ?? {};
        (original.headers as Record<string, string>).Authorization = `Bearer ${token}`;
        return http(original);
      }
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorShape | undefined;
    const message = data?.error?.message;
    if (message) {
      const details = data?.error?.details;
      if (Array.isArray(details) && details.length > 0) {
        const detailText = details
          .map((d) => (typeof d === 'object' && d && 'message' in d ? String(d.message) : ''))
          .filter(Boolean)
          .join(', ');
        return detailText ? `${message}: ${detailText}` : message;
      }
      return message;
    }
    if (error.code === 'ERR_NETWORK') {
      return 'Cannot reach the server. Is the API running?';
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

/* -------------------------------------------------------------------------- */
/*                                   Auth                                     */
/* -------------------------------------------------------------------------- */

export const authApi = {
  async register(payload: { name: string; email: string; password: string }) {
    const { data } = await http.post<{ user: User; accessToken: string }>(
      '/auth/register',
      payload,
    );
    return data;
  },
  async login(payload: { email: string; password: string }) {
    const { data } = await http.post<{ user: User; accessToken: string }>('/auth/login', payload);
    return data;
  },
  async refresh() {
    const { data } = await http.post<{ user: User; accessToken: string }>('/auth/refresh');
    return data;
  },
  async logout() {
    await http.post('/auth/logout');
  },
  async me() {
    const { data } = await http.get<{ user: User }>('/auth/me');
    return data.user;
  },
};

/* -------------------------------------------------------------------------- */
/*                                   Users                                    */
/* -------------------------------------------------------------------------- */

export const userApi = {
  async updateProfile(payload: Partial<Pick<User, 'name' | 'headline' | 'targetRole' | 'bio' | 'avatarUrl'>>) {
    const { data } = await http.patch<{ user: User }>('/users/me', payload);
    return data.user;
  },
  async changePassword(payload: { currentPassword: string; newPassword: string }) {
    await http.patch('/users/me/password', payload);
  },
  async list(params: { page?: number; limit?: number; search?: string } = {}) {
    const { data } = await http.get<Paginated<User>>('/users', { params });
    return data;
  },
  async setRole(id: string, role: 'user' | 'admin') {
    const { data } = await http.patch<{ user: User }>(`/users/${id}/role`, { role });
    return data.user;
  },
  async remove(id: string) {
    await http.delete(`/users/${id}`);
  },
};

/* -------------------------------------------------------------------------- */
/*                                  Resumes                                   */
/* -------------------------------------------------------------------------- */

export const resumeApi = {
  async upload(file: File, isPrimary = false, onProgress?: (percent: number) => void) {
    const form = new FormData();
    form.append('file', file);
    if (isPrimary) form.append('isPrimary', 'true');
    const { data } = await http.post<{ resume: Resume }>('/resumes', form, {
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    });
    return data.resume;
  },
  async list(params: { page?: number; limit?: number } = {}) {
    const { data } = await http.get<Paginated<Resume>>('/resumes', { params });
    return data;
  },
  async get(id: string) {
    const { data } = await http.get<{ resume: Resume }>(`/resumes/${id}`);
    return data.resume;
  },
  async setPrimary(id: string) {
    const { data } = await http.patch<{ resume: Resume }>(`/resumes/${id}/primary`);
    return data.resume;
  },
  async remove(id: string) {
    await http.delete(`/resumes/${id}`);
  },
  async download(id: string, filename: string) {
    const { data } = await http.get(`/resumes/${id}/download`, { responseType: 'blob' });
    triggerBlobDownload(data, filename);
  },
};

/* -------------------------------------------------------------------------- */
/*                                 Interviews                                 */
/* -------------------------------------------------------------------------- */

export interface CreateInterviewPayload {
  role: string;
  company?: string;
  jobDescription?: string;
  resumeId?: string | null;
  type: 'technical' | 'hr' | 'behavioral' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
}

export const interviewApi = {
  async create(payload: CreateInterviewPayload) {
    const { data } = await http.post<{ interview: Interview; warning?: string }>(
      '/interviews',
      payload,
    );
    return data;
  },
  async list(params: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    search?: string;
  } = {}) {
    const { data } = await http.get<Paginated<Interview>>('/interviews', { params });
    return data;
  },
  async get(id: string) {
    const { data } = await http.get<{ interview: Interview }>(`/interviews/${id}`);
    return data.interview;
  },
  async submitAnswer(id: string, questionId: string, answer: string) {
    const { data } = await http.post<{
      interview: Interview;
      evaluation: Interview['questions'][number]['feedback'];
      warning?: string;
      source: string;
    }>(`/interviews/${id}/questions/${questionId}/answer`, { answer });
    return data;
  },
  async requestFollowUp(id: string, questionId: string) {
    const { data } = await http.post<{ interview: Interview; warning?: string; source: string }>(
      `/interviews/${id}/questions/${questionId}/follow-up`,
    );
    return data;
  },
  async answerFollowUp(id: string, questionId: string, followUpId: string, answer: string) {
    const { data } = await http.post<{
      interview: Interview;
      evaluation: Interview['questions'][number]['feedback'];
      warning?: string;
      source: string;
    }>(`/interviews/${id}/questions/${questionId}/follow-up/${followUpId}/answer`, { answer });
    return data;
  },
  async complete(id: string) {
    const { data } = await http.post<{ interview: Interview; warning?: string }>(
      `/interviews/${id}/complete`,
    );
    return data;
  },
  async remove(id: string) {
    await http.delete(`/interviews/${id}`);
  },
  async downloadReport(id: string) {
    const { data } = await http.get(`/interviews/${id}/report`, { responseType: 'blob' });
    triggerBlobDownload(data, `interviewiq-report-${id}.pdf`);
  },
  reportUrl(id: string) {
    return `${API_URL}/interviews/${id}/report`;
  },
};

/* -------------------------------------------------------------------------- */
/*                                  Progress                                  */
/* -------------------------------------------------------------------------- */

export const progressApi = {
  async overview() {
    const { data } = await http.get<DashboardOverview>('/progress');
    return data;
  },
};

export const aiApi = {
  async status() {
    const { data } = await http.get<AIStatus>('/ai/status');
    return data;
  },
};

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
