import useSWRMutation from "swr/mutation";
import { fetch } from "@tauri-apps/plugin-http";
import { getWhoAmI } from "@/lib/who-am-i";

export type Environment = "test" | "dev" | "uat" | "prod";

interface LoginParams {
  serial_number: string;
  password: string;
  environment: Environment;
}

interface BaseResponse {
  error: number;
  message?: string;
}

interface LoginResponse extends BaseResponse {
  token?: string;
  token_expire_at?: string;
  dealer_code?: string;
}

const ENV_URLS: Record<Environment, string> = {
  test: "https://key-server.fms.appmaaza.com",
  dev: "https://fmsdev.bajajauto.co.in",
  uat: "https://fmsuat.bajajauto.com",
  prod: "https://fms.bajajauto.com",
};

export function useLogin() {
  return useSWRMutation<LoginResponse, Error, string, LoginParams>(
    "/api/v4/login",
    loginMutation
  );
}

async function loginMutation(
  url: string,
  { arg }: { arg: LoginParams }
): Promise<LoginResponse> {
  const token = await getWhoAmI();
  const baseURL = ENV_URLS[arg.environment];

  // Build full URL with query parameters
  const fullUrl = new URL(url, baseURL);
  fullUrl.searchParams.append("serial_number", arg.serial_number);
  fullUrl.searchParams.append("password", arg.password);

  const response = await fetch(fullUrl.toString(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}), // Empty body for POST request
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data: LoginResponse = await response.json();
  return data;
}
