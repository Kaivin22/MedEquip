import api from '@/services/axios';
import type { AxiosRequestConfig } from 'axios';

/**
 * API Service Layer
 * 
 * Kết nối với backend Node.js/MySQL qua REST API.
 * Khi backend chưa chạy, tự động fallback về mock data (localStorage).
 * 
 * Cấu hình:
 * - VITE_API_BASE_URL: URL backend (mặc định: http://localhost:5000/api)
 * - VITE_USE_MOCK: "true" để dùng mock data (mặc định: "true")
 */

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'; // default true

async function request<T>(endpoint: string, config: AxiosRequestConfig = {}): Promise<T> {
  try {
    const response = await api.request<T>({ url: endpoint, ...config });
    return response.data;
  } catch (error: unknown) {
    const axiosError = error as { response?: { data?: { message?: string }; statusText?: string }; message?: string };
    const message = axiosError.response?.data?.message || axiosError.response?.statusText || axiosError.message || 'API Error';
    throw new Error(message);
  }
}

export function get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
  return request<T>(endpoint, { method: 'GET', ...config });
}

export function post<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return request<T>(endpoint, { method: 'POST', data, ...config });
}

export function put<T>(endpoint: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
  return request<T>(endpoint, { method: 'PUT', data, ...config });
}

export function del<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
  return request<T>(endpoint, { method: 'DELETE', ...config });
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const config: AxiosRequestConfig = {
    url: endpoint,
    method: (options?.method as AxiosRequestConfig['method']) || 'GET',
    headers: options?.headers as Record<string, string> | undefined,
    data: options?.body ? JSON.parse(options.body as string) : undefined,
  };
  return request<T>(endpoint, config);
}

/**
 * Helper mock delay - dùng khi fallback về localStorage
 */
const MOCK_DELAY = 300;
export function delay<T>(data: T): Promise<T> {
  return new Promise(resolve => setTimeout(() => resolve(data), MOCK_DELAY));
}

/**
 * Kiểm tra có đang dùng mock mode không
 */
export function isMockMode(): boolean {
  return USE_MOCK;
}
