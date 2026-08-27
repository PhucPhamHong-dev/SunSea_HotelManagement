import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

export interface ProfileRow {
  id: string;
  username: string;
  role: 'owner' | 'staff';
  active: boolean;
}

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly url: string;
  private readonly anonKey: string;
  private readonly serviceRoleKey: string;
  private readonly publicClient: SupabaseClient;
  private readonly adminClient: SupabaseClient;

  constructor(config: ConfigService) {
    this.url = config.getOrThrow<string>('SUPABASE_URL');
    this.anonKey = config.getOrThrow<string>('SUPABASE_ANON_KEY');
    this.serviceRoleKey = config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');
    this.publicClient = createClient(this.url, this.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    this.adminClient = createClient(this.url, this.serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  getPublicClient(accessToken?: string): SupabaseClient {
    return createClient(this.url, this.anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      ...(accessToken ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } } : {}),
    });
  }

  getAdminClient(): SupabaseClient {
    return this.adminClient;
  }

  async signIn(email: string, password: string) {
    return this.publicClient.auth.signInWithPassword({ email, password });
  }

  async refresh(refreshToken: string) {
    return this.publicClient.auth.refreshSession({ refresh_token: refreshToken });
  }

  async getUser(accessToken: string): Promise<User | null> {
    const { data, error } = await this.publicClient.auth.getUser(accessToken);
    if (error) {
      this.logger.debug(`Supabase user validation failed: ${error.name}`);
      return null;
    }
    return data.user;
  }

  async getProfile(accessToken: string, userId: string): Promise<ProfileRow | null> {
    const { data, error } = await this.getPublicClient(accessToken)
      .from('profiles')
      .select('id, username, role, active')
      .eq('id', userId)
      .maybeSingle<ProfileRow>();
    if (error) {
      this.logger.warn(`Profile lookup failed: ${error.message}`);
      return null;
    }
    return data;
  }
}
