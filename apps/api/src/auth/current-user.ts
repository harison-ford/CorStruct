// JWT identity only. role here is usually "authenticated", not app RBAC (owner / assistant).
export type CurrentUser = {
  id: string;
  email: string | null;
  role: string;
  // Raw bearer token, forwarded to Supabase so PostgREST/RLS resolves auth.uid()
  // as this caller instead of querying as service_role.
  accessToken: string;
};
