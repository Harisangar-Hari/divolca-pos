import axios from 'axios';

export const api = axios.create({
    baseURL: "https://divolca-backend.onrender.com/api",
    // baseURL: "http://localhost:3005/api",
});