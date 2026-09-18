//src/services/api.ts
import axios from 'axios';

export const api = axios.create({
    baseURL: "https://divolca-backend.onrender.com/api",
    // baseURL: "http://localhost:3005/api",
    withCredentials: true,
});

// ---------- REQUEST: attach access token ----------
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// ---------- RESPONSE: auto-refresh on 401 ----------
let isRefreshing = false;
let pendingQueue: Array<(token: string | null) => void> = [];

const bareAxios = axios.create({
    // baseURL: "http://localhost:3005/api",
    baseURL: "https://divolca-backend.onrender.com/api",
    withCredentials: true,
});

const AUTH_REFRESH_URL = "/auth/refresh";

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        if (
            error?.response?.status !== 401 ||
            original?._retry ||
            original?.url?.includes(AUTH_REFRESH_URL) ||
            original?.url?.includes("/auth/login")
        ) {
            return Promise.reject(error);
        }

        original._retry = true;

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                pendingQueue.push((token) => {
                    if (token) {
                        original.headers.Authorization = `Bearer ${token}`;
                        resolve(api(original));
                    } else {
                        reject(error);
                    }
                });
            });
        }

        isRefreshing = true;

        try {
            const { data } = await bareAxios.post(AUTH_REFRESH_URL);

            const newToken = data.accessToken;
            localStorage.setItem("token", newToken);
            if (data.user) {
                localStorage.setItem("user", JSON.stringify(data.user));
            }

            pendingQueue.forEach((cb) => cb(newToken));
            pendingQueue = [];

            original.headers.Authorization = `Bearer ${newToken}`;
            return api(original);
        } catch (refreshError) {
            pendingQueue.forEach((cb) => cb(null));
            pendingQueue = [];

            localStorage.removeItem("token");
            localStorage.removeItem("user");

            if (window.location.pathname !== "/login") {
                window.location.href = "/login";
            }

            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);