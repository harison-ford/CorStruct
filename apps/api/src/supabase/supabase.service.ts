import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService {
  /** service_role — bypasses RLS. Only for privileged bootstrap (tenant creation). */
  readonly client: SupabaseClient;

  private readonly url: string;
  private readonly anonKey: string;

  constructor(config: ConfigService) {
    this.url = config.getOrThrow("SUPABASE_URL");
    this.anonKey = config.getOrThrow("SUPABASE_ANON_KEY");

    this.client = createClient(
      this.url,
      config.getOrThrow("SUPABASE_SERVICE_ROLE_KEY"),
    );
  }

  /**
   * Client scoped to the caller's own Supabase JWT. PostgREST resolves
   * auth.uid() from this token, so RLS policies are the real enforcement
   * for tenant-scoped queries — not just the Nest .eq("tenant_id", ...) filter.
   */
  forUser(accessToken: string): SupabaseClient {
    return createClient(this.url, this.anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
}
