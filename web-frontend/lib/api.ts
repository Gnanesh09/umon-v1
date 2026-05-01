import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 10_000,
});

export type ApiResult<T> = {
  success: true;
  data: T;
  meta?: { total?: number; limit?: number; cursor?: string; hasMore?: boolean };
};