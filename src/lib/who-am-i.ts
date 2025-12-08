import { FMSApi, BASEURL } from "@/api/fms";

interface WhoAmIResponse {
  error: number;
  token?: string;
  message?: string;
}

/**
 * Fetch whoami token from API
 */
async function fetchWhoAmIToken(): Promise<string | null> {
  try {
    // Build URL with query params using the selected environment
    const url = new URL("api/whoami", BASEURL);
    url.searchParams.append("subscription_id", "Bajaj_CDMS");

    const response = await FMSApi({
      url: url.toString(), // Use full URL, not just pathname
      method: "GET",
    });

    if (!response.ok) {
      console.error(`HTTP error! status: ${response.status}`);
      return null;
    }

    const data: WhoAmIResponse = await response.json();
    const errorCode = data.error;

    if (errorCode === 0 && data.token) {
      localStorage.setItem("whoAmI", data.token);
      return data.token;
    }

    if (errorCode === -2) {
      return null;
    }

    return null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error fetching whoAmI token:", message);
    return null;
  }
}

/**
 * Get whoami token - from storage or fetch new
 */
export async function getWhoAmI(clearToken = false): Promise<string | null> {
  if (clearToken) {
    localStorage.removeItem("whoAmI");
    return await fetchWhoAmIToken();
  }

  const cachedToken = localStorage.getItem("whoAmI");

  if (!cachedToken) {
    return await fetchWhoAmIToken();
  }

  return cachedToken;
}
