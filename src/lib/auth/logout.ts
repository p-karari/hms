"use server";

import { cookies } from "next/headers";

export async function logoutUser() {


const cookieStore = await cookies();
  const baseUrl = process.env.OPENMRS_API_URL;

  try {
    await fetch(`${baseUrl}/session`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
  } catch (e) {
    console.error("OpenMRS logout failed:", e);
  }

  cookieStore.delete("JSESSIONID");
}
