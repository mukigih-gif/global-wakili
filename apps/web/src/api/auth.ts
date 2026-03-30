export async function login(email: string, password: string) {
  const res = await fetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-tenant-id": "tenant-1" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  return data.token;
}