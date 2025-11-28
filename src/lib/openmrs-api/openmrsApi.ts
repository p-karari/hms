import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export interface OpenMRSConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export class OpenMRS_API {
  private static instance: AxiosInstance;
  private static config: OpenMRSConfig;

  static init(config: OpenMRSConfig) {
    this.config = config;
    
    this.instance = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 10000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...config.headers
      }
    });

    // Add request interceptor for auth tokens if needed
    this.instance.interceptors.request.use(
      (config) => {
        // Add auth token if available
        const token = localStorage.getItem('openmrs_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('OpenMRS API Error:', error);
        return Promise.reject(error);
      }
    );
  }

  static async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }

  static async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }

  static async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.patch<T>(url, data, config);
  }

  static async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data, config);
  }

  static async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url, config);
  }
}

// Initialize with default config (should be configured in your app)
OpenMRS_API.init({
  baseURL: process.env.NEXT_PUBLIC_OPENMRS_API_URL || 'http://localhost:8080/openmrs/ws/fhir2/R4',
  timeout: 30000
});

export default OpenMRS_API;