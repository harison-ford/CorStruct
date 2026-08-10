// JWT identity only. role here is usually "authenticated", not app RBAC (owner / PM / …).
export type CurrentUser = {
  id: string;
  email: string | null;
  role: string;
};
