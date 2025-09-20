"use server";

import { cookies } from "next/headers";

export async function logoutUser() {


const cookieStore = await cookies();
  const baseUrl = process.env.OPENMRS_API_URL;

  try {
    // Call OpenMRS logout endpoint
    await fetch(`${baseUrl}/session`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      // Make sure cookies are sent
      credentials: "include",
    });
  } catch (e) {
    console.error("OpenMRS logout failed:", e);
  }

  // Clear anyy app-managed cookies (like stored JSESSIONID or tokens)
  cookieStore.delete("JSESSIONID");
}
