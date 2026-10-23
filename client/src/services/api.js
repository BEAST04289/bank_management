import axios from 'axios';
import { pushGlobalTelemetry } from '../context/SqlTelemetryContext';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach JWT Bearer Token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('bankdb_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Capture SQL Telemetry from successful API responses
api.interceptors.response.use(
  (response) => {
    if (response.data && response.data.sqlMeta) {
      pushGlobalTelemetry(response.data.sqlMeta);
    }
    return response;
  },
  (error) => {
    // Also capture SQL Telemetry from MySQL constraint/error responses
    if (error.response?.data?.sqlMeta) {
      pushGlobalTelemetry({
        ...error.response.data.sqlMeta,
        isError: true
      });
    }
    return Promise.reject(error);
  }
);

export default api;
