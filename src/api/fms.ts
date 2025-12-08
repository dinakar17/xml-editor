import { fetch } from "@tauri-apps/plugin-http";

// Environment URLs mapping
const ENV_URLS = {
  test: "https://key-server.fms.appmaaza.com",
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

// Using standard RequestInit from fetch API
interface FMSApiOptions extends RequestInit {
  url: string;
  timeout?: number;
}

interface FMSApiConfig {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  url?: string;
  headers?: Record<string, string>;
  data?: unknown;
  params?: Record<string, unknown>;
  timeout?: number;
}

/**
 * FMS API Client
 * Wrapper around Tauri's fetch for FMS backend
 */
export const FMSApi = async (config: FMSApiOptions): Promise<Response> => {
  const requestStartTime = Date.now();

  // Build full URL
  const baseURL = getBaseURL();
  const fullUrl = config.url.startsWith("http")
    ? config.url
    : `${baseURL}${config.url}`;

  console.log(`[FMS API] ${config.method || "GET"} ${fullUrl}`);

  try {
    const response = await fetch(fullUrl, {
      ...config,
      headers: {
        Accept: "application/json",
        ...config.headers,
      },
    });

    const duration = Date.now() - requestStartTime;
    if (duration > 5000) {
      console.warn(`[FMS API] Slow response (${duration}ms): ${fullUrl}`);
    }

    if (!response.ok && response.status === 401) {
      console.error("[FMS API] Unauthorized - logging out");
      // TODO: Handle logout
    }

    return response;
  } catch (error) {
    const duration = Date.now() - requestStartTime;
    console.error(`[FMS API] Error (${duration}ms):`, {
      url: fullUrl,
      error,
    });
    throw error;
  }
};

/**
 * Legacy FMS API function for backward compatibility
 * @deprecated Use FMSApi function directly
 */
export default async function fmsApiLegacy({
  method = "GET",
  url = "",
  headers = {},
  data = {},
  params = {},
  timeout = 60_000,
}: FMSApiConfig): Promise<Response> {
  const baseURL = getBaseURL();
  const fullUrl = url.startsWith("http") ? url : `${baseURL}${url}`;

  // Build query string
  const urlWithParams = new URL(fullUrl);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      urlWithParams.searchParams.append(key, String(value));
    });
  }

  const requestConfig: FMSApiOptions = {
    url: urlWithParams.toString(),
    method,
    headers: { Accept: "application/json", ...headers },
    body: method === "GET" ? undefined : JSON.stringify(data),
  };

  // Add timeout to config if supported by your Tauri version
  // Note: timeout might need to be passed differently depending on plugin version

  return await FMSApi(requestConfig);
}
