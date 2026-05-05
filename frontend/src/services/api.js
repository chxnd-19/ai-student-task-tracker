import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
  timeout: 10000,
});

/**
 * Request Interceptor
 * Automatically injects the JWT token and logs the request payload.
 */
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // DEBUG LOGGING (MANDATORY)
    console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.url}:`, config.data || config.params || "No payload");
    
    return config;
  },
  (error) => {
    console.error("[API REQUEST ERROR]:", error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Logs every response and catches global errors.
 */
api.interceptors.response.use(
  (response) => {
    // DEBUG LOGGING (MANDATORY)
    console.log(`[API RESPONSE] ${response.config.method?.toUpperCase()} ${response.config.url}:`, response.data);
    return response;
  },
  (error) => {
    console.error(`[API RESPONSE ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
