import axios from 'axios';
import type {
  SearchRequest,
  SearchResponse,
  SavedObservation,
  SaveObservationRequest,
  UpdateObservationRequest,
  FilterPreset,
  CreateFilterPresetRequest,
  UpdateFilterPresetRequest,
} from 'shared/types';
import type { AuthUser } from 'shared/types';
import type { UserSettings } from 'shared/types';
export type { AuthUser };

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const AUTH_TOKEN_STORAGE_KEY = 'sky2nite.authToken';

type ApiEnvelope<T> = {
  result: T;
  err?: string;
  id?: string;
}

type SetupStatusResponse = {
  isSetupComplete: boolean;
}

type AuthResponse = {
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

  getAlertActivityCurves: async (locusIds: string[]): Promise<Record<string, number[]>> => {
    const result = await requestEnvelope(
      apiClient.post<ApiEnvelope<{ curves: Record<string, number[]> }>>('/objects/alert-activity', { locusIds }),
    );
    return result.curves;
  },

  // Get available ANTARES tags for filtering
  getAvailableTags: async (): Promise<string[]> => {
    return requestEnvelope(apiClient.get<ApiEnvelope<string[]>>('/objects/tags'));
  },

  // Health check
  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    return requestEnvelope(apiClient.get<ApiEnvelope<{ status: string; timestamp: string }>>('/objects/health'));
  },

  // Saved observations
  getObservations: async (): Promise<SavedObservation[]> => {
    return requestEnvelope(apiClient.get<ApiEnvelope<SavedObservation[]>>('/observations'));
  },

  saveObservation: async (body: SaveObservationRequest): Promise<SavedObservation> => {
    return requestEnvelope(apiClient.post<ApiEnvelope<SavedObservation>>('/observations', body));
  },

  deleteObservation: async (id: number): Promise<void> => {
    await requestEnvelope(apiClient.delete<ApiEnvelope<{ success: true }>>(`/observations/${id}`));
  },

  updateObservation: async (id: number, body: UpdateObservationRequest): Promise<SavedObservation> => {
    return requestEnvelope(apiClient.patch<ApiEnvelope<SavedObservation>>(`/observations/${id}`, body));
  },

  // User settings
  getSettings: async (): Promise<UserSettings> => {
    return requestEnvelope(apiClient.get<ApiEnvelope<UserSettings>>('/settings'));
  },

  updateSettings: async (patch: Partial<UserSettings>): Promise<UserSettings> => {
    return requestEnvelope(apiClient.patch<ApiEnvelope<UserSettings>>('/settings', patch));
  },

  // Filter presets
  getFilterPresets: async (): Promise<FilterPreset[]> => {
    return requestEnvelope(apiClient.get<ApiEnvelope<FilterPreset[]>>('/filter-presets'));
  },

  createFilterPreset: async (body: CreateFilterPresetRequest): Promise<FilterPreset> => {
    return requestEnvelope(apiClient.post<ApiEnvelope<FilterPreset>>('/filter-presets', body));
  },

  updateFilterPreset: async (id: number, body: UpdateFilterPresetRequest): Promise<FilterPreset> => {
    return requestEnvelope(apiClient.patch<ApiEnvelope<FilterPreset>>(`/filter-presets/${id}`, body));
  },

  deleteFilterPreset: async (id: number): Promise<void> => {
    await requestEnvelope(apiClient.delete<ApiEnvelope<{ success: true }>>(`/filter-presets/${id}`));
  },
};

export default api;
