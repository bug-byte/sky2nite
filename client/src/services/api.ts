import axios from 'axios';
import type { SearchRequest, SearchResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

interface ApiEnvelope<T> {
  result: T;
  err?: string;
  id?: string;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 seconds for complex queries
});

export const api = {
  // Search for objects visible tonight from a given location
  searchVisibleObjects: async (request: SearchRequest): Promise<SearchResponse> => {
    const response = await apiClient.post<ApiEnvelope<SearchResponse>>('/objects/tonight', request);
    if (response.data.err) throw new Error(response.data.err);
    return response.data.result;
  },

  // Get available ANTARES tags for filtering
  getAvailableTags: async (): Promise<string[]> => {
    const response = await apiClient.get<ApiEnvelope<string[]>>('/objects/tags');
    if (response.data.err) throw new Error(response.data.err);
    return response.data.result;
  },

  // Health check
  healthCheck: async (): Promise<{ status: string; timestamp: string }> => {
    const response = await apiClient.get<ApiEnvelope<{ status: string; timestamp: string }>>('/objects/health');
    return response.data.result;
  },
};

export default api;
