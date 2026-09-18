import { api } from "../services/api";

export const loginApi = async (data: {
    username: string;
    password: string;
}) => {
    const res = await api.post("/auth/login", data);
    return res.data;
};

export const getCurrentUserApi = async () => {
    const res = await api.get("/auth/me");
    return res.data;
};

export const logoutApi = async () => {
    try {
        await api.post("/auth/logout");
    } catch {
        // ignore — we clear locally anyway
    }
};