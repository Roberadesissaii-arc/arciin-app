/** Roles that can change instance-level settings on the server. */
export function isInstanceAdmin(role: string | undefined | null): boolean {
  return role === "OWNER" || role === "ADMIN"
}

export function isInstanceOwner(role: string | undefined | null): boolean {
  return role === "OWNER"
}
