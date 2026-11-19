import { HttpError, type AuthUser, type Deps } from "./ports";

/** Resolve "Authorization: Bearer <token>" to a user, or throw 401. */
export async function authenticate(deps: Deps, header: string | null): Promise<AuthUser> {
  const m = /^Bearer\s+(\S+)$/.exec(header ?? "");
  const user = m ? await deps.auth.verify(m[1]!) : null;
  if (!user) throw new HttpError(401, "Please sign in.");
  return user;
}

export function requireReviewer(user: AuthUser): void {
  if (user.role !== "reviewer") throw new HttpError(403, "Only reviewers can do this.");
}
