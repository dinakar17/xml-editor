import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from "axios";

// Environment URLs mapping
const ENV_URLS = {
  test: "https://key-server.fms.appmaaza.com/",
  dev: "https://fmsdev.bajajauto.co.in",
  uat: "https://fmsuat.bajajauto.com",
  prod: "https://fms.bajajauto.com",
};

// Get base URL from stored environment
const getBaseURL = () => {
  if (typeof window !== "undefined") {
    const storedEnv = localStorage.getItem("environment") as
      | keyof typeof ENV_URLS
      | null;
    if (storedEnv && ENV_URLS[storedEnv]) {
      return ENV_URLS[storedEnv];
    }
  }
  // Default to dev environment
  return ENV_URLS.dev;
};

export const BASEURL = getBaseURL();

console.log(`FMS API Base URL: ${BASEURL}`);

interface FMSApiConfig extends AxiosRequestConfig {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  data?: unknown;
  params?: Record<string, unknown>;
  timeout?: number;
}

// Extended config type for request timing
interface AxiosConfigWithTiming extends AxiosRequestConfig {
  requestStartTime?: number;
}

/**
 * FMS API Client
 * Axios instance configured for FMS backend
 * Dynamically updates baseURL based on stored environment
 */
export const FMSApi: AxiosInstance = axios.create({
  baseURL: BASEURL,
  timeout: 60_000,
  headers: {
    Accept: "application/json",
  },
});

// Update baseURL when environment changes
if (typeof window !== "undefined") {
  const updateBaseURL = () => {
    const storedEnv = localStorage.getItem("environment") as
      | keyof typeof ENV_URLS
      | null;
    if (storedEnv && ENV_URLS[storedEnv]) {
      FMSApi.defaults.baseURL = ENV_URLS[storedEnv];
      console.log(`[FMS API] Base URL updated to: ${ENV_URLS[storedEnv]}`);
    }
  };

  // Update on storage changes (e.g., after login)
  window.addEventListener("storage", updateBaseURL);
}

// Request interceptor for logging
FMSApi.interceptors.request.use(
  (config) => {
    console.log(`[FMS API] ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error("[FMS API] Request error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for logging and error handling
FMSApi.interceptors.response.use(
  (response) => {
    const config = response.config as AxiosConfigWithTiming;
    const duration = Date.now() - (config.requestStartTime ?? Date.now());
    if (duration > 5000) {
      console.warn(
        `[FMS API] Slow response (${duration}ms): ${response.config.url}`
      );
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.error("[FMS API] Unauthorized - logging out");
      // TODO: Handle logout
    }

    const config = error.config as AxiosConfigWithTiming | undefined;
    const duration = Date.now() - (config?.requestStartTime ?? Date.now());
    console.error(`[FMS API] Error (${duration}ms):`, {
      url: error.config?.url,
      status: error.response?.status,
      message: error.message,
    });

    return Promise.reject(error);
  }
);

// Add timestamp to requests for performance monitoring
FMSApi.interceptors.request.use((config) => {
  const configWithTiming = config as AxiosConfigWithTiming;
  configWithTiming.requestStartTime = Date.now();
  return config;
});

/**
 * Legacy FMS API function for backward compatibility
 * @deprecated Use FMSApi axios instance directly
 */
export default async function fmsApiLegacy({
  method = "get",
  url = "",
  headers = {},
  data = {},
  params = {},
  validateStatus = (status: number) => status >= 200 && status < 300,
  timeout = 60_000,
}: FMSApiConfig): Promise<AxiosResponse> {
  const config: AxiosRequestConfig = {
    method,
    url,
    headers: { Accept: "application/json", ...headers },
    data: method === "get" ? undefined : data,
    params,
    validateStatus,
    timeout,
  };

  return await FMSApi(config);
}
