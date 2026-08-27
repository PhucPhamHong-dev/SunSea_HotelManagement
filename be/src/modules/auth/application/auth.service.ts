import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { ApplicationError } from '../../../common/errors/application-error';
import { ErrorCode } from '../../../common/errors/error-codes';
import { clearSessionCookies, setSessionCookies } from '../../../common/auth/session-cookies';
import type { AuthenticatedUser } from '../../../common/types/api-response';
import { SupabaseService } from '../../../infrastructure/supabase/supabase.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly supabase: SupabaseService, private readonly config: ConfigService) {}

  async login(username: string, password: string, response: Response) {
    const normalizedUsername = username.trim().toLowerCase();
    const { data, error } = await this.supabase.signIn(this.toInternalEmail(normalizedUsername), password);
    if (error || !data.session || !data.user) {
      this.logger.warn(`Login failed for username ${normalizedUsername}`);
      throw new ApplicationError(ErrorCode.AUTH_INVALID_CREDENTIALS, 'Invalid username or password', 401);
    }
    const profile = await this.supabase.getProfile(data.session.access_token, data.user.id);
    if (!profile) {
      throw new ApplicationError(ErrorCode.PROFILE_NOT_FOUND, 'Profile was not found', 401);
    }
    if (!profile.active) {
      throw new ApplicationError(ErrorCode.PROFILE_INACTIVE, 'Profile is inactive', 403);
    }
    this.setCookies(response, data.session.access_token, data.session.refresh_token);
    return { id: data.user.id, username: profile.username, role: profile.role, active: profile.active };
  }

  logout(response: Response): { loggedOut: true } {
    clearSessionCookies(response);
    return { loggedOut: true };
  }

  async refresh(refreshToken: string | undefined, response: Response) {
    if (!refreshToken) {
      clearSessionCookies(response);
      throw new ApplicationError(ErrorCode.AUTH_REFRESH_FAILED, 'Refresh token is required', 401);
    }
    const { data, error } = await this.supabase.refresh(refreshToken);
    if (error || !data.session || !data.user) {
      clearSessionCookies(response);
      throw new ApplicationError(ErrorCode.AUTH_REFRESH_FAILED, 'Refresh token is invalid', 401);
    }
    const profile = await this.supabase.getProfile(data.session.access_token, data.user.id);
    if (!profile?.active) {
      clearSessionCookies(response);
      throw new ApplicationError(ErrorCode.PROFILE_INACTIVE, 'Profile is inactive', 403);
    }
    this.setCookies(response, data.session.access_token, data.session.refresh_token);
    return { refreshed: true };
  }

  me(user: AuthenticatedUser) {
    return { id: user.id, username: user.username, role: user.role, active: user.active };
  }

  private setCookies(response: Response, accessToken: string, refreshToken: string): void {
    const maxAgeDays = this.config.get<number>('AUTH_REFRESH_COOKIE_MAX_AGE_DAYS', 3650);
    setSessionCookies(response, accessToken, refreshToken, maxAgeDays);
  }

  private toInternalEmail(username: string): string {
    const domain = this.config.get<string>('AUTH_USERNAME_DOMAIN', 'sunsea.local');
    return `${username}@${domain}`;
  }
}
