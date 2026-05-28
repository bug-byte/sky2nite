import axios from 'axios';
import type { SearchRequest, SearchResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const AUTH_TOKEN_STORAGE_KEY = 'sky2nite.authToken';

interface ApiEnvelope<T> {
  result: T;
  err?: string;
  id?: string;
}

export interface AuthUser {
  id: number;
  username: string;
}

interface SetupStatusResponse {
  isSetupComplete: boolean;
}

interface AuthResponse {
  user: AuthUser;
  token: string;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds for complex queries
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function storeAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
}

function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
}

function getStoredAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
}

function toApiError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    const responseBody = error.response?.data as { err?: string } | undefined;
    return new Error(responseBody?.err || error.message || 'Request failed.');
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error('Request failed.');
}

async function requestEnvelope<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  try {
    const response = await promise;
    if (response.data.err) throw new Error(response.data.err);
    return response.data.result;
  } catch (error) {
    throw toApiError(error);
  }
}

export const api = {
  getStoredAuthToken,

  clearAuthToken,

  getSetupStatus: async (): Promise<SetupStatusResponse> => {
    return requestEnvelope(apiClient.get<ApiEnvelope<SetupStatusResponse>>('/auth/setup-status'));
  },

  setupFirstUser: async (username: string, password: string): Promise<AuthUser> => {
    const result = await requestEnvelope(apiClient.post<ApiEnvelope<AuthResponse>>('/auth/setup', { username, password }));
    storeAuthToken(result.token);
    return result.user;
  },

  login: async (username: string, password: string): Promise<AuthUser> => {
    const result = await requestEnvelope(apiClient.post<ApiEnvelope<AuthResponse>>('/auth/login', { username, password }));
    storeAuthToken(result.token);
    return result.user;
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    const result = await requestEnvelope(apiClient.get<ApiEnvelope<{ user: AuthUser }>>('/auth/me'));
    return result.user;
  },

  updateUsername: async (newUsername: string): Promise<AuthUser> => {
    const result = await requestEnvelope(apiClient.patch<ApiEnvelope<AuthResponse>>('/auth/me/username', { username: newUsername }));
    storeAuthToken(result.token);
    return result.user;
  },

  updatePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await requestEnvelope(apiClient.patch<ApiEnvelope<{ success: boolean }>>('/auth/me/password', { currentPassword, newPassword }));
  },

  // Search for objects visible tonight from a given location
  searchVisibleObjects: async (request: SearchRequest): Promise<SearchResponse> => {
    return requestEnvelope(apiClient.post<ApiEnvelope<SearchResponse>>('/objects/tonight', request));
  },

  // Get available ANTARES tags for filtering
  getAvailableTags: async (): Promise<string[]> => {
    return requestEnvelope(apiClient.get<ApiEnvelope<string[]>>('/objects/tags'));
  },

  // Health check
  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    return requestEnvelope(apiClient.get<ApiEnvelope<{ status: string; timestamp: string }>>('/objects/health'));
  },
};

export default api;
