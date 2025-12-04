import useSWRMutation from "swr/mutation";
import axios from "axios";
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
  test: "https://key-server.fms.appmaaza.com/",
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

  // Create a temporary axios instance with the selected environment URL
  const api = axios.create({
    baseURL,
    timeout: 60_000,
    headers: {
      Accept: "application/json",
    },
  });

  const response = await api.post(
    url,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        serial_number: arg.serial_number,
        password: arg.password,
      },
    }
  );
  return response.data;
}
