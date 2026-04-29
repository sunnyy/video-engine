import { serverFetch } from "../serverApi";

export async function deleteUserAccount({ reason = "", reasonDetail = "" } = {}) {
  const res = await serverFetch("/api/account/delete", {
    method: "POST",
    body: JSON.stringify({ reason, reasonDetail }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Failed to delete account");
  }
}
