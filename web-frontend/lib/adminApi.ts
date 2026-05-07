import axios from "axios";

export const adminApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10_000,
});

adminApi.interceptors.request.use((config) => {
  config.headers["x-admin-code"] = "0902";
  return config;
});

export type ApiResult<T> = {
  success: true;
  data: T;
  meta?: { total?: number; limit?: number; cursor?: string; hasMore?: boolean };
};
