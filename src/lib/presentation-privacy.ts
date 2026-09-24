import { cookies } from "next/headers";

export const PRESENTATION_PRIVACY_COOKIE = "sigma_nu_presentation_privacy";

export async function getPresentationPrivacyCookie() {
  const cookie = (await cookies()).get(PRESENTATION_PRIVACY_COOKIE);
  return cookie?.value === "on";
}
