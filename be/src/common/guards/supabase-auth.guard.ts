import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { ErrorCode } from '../errors/error-codes';
import { ApplicationError } from '../errors/application-error';
import type { AuthenticatedUser } from '../types/api-response';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';
import { ACCESS_COOKIE, REFRESH_COOKIE, clearSessionCookies, setSessionCookies } from '../auth/session-cookies';

export { ACCESS_COOKIE, REFRESH_COOKIE } from '../auth/session-cookies';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService, private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const response = context.switchToHttp().getResponse<Response>();
    const currentToken = this.getToken(request);
    const currentSession = currentToken ? await this.readSession(currentToken) : null;
    const refreshedSession = currentSession ?? await this.refreshSession(request, response);
    if (!refreshedSession) throw new ApplicationError(ErrorCode.AUTH_UNAUTHORIZED, 'Authentication is required', 401);
    const { token, user, profile } = refreshedSession;
    if (!profile.active) throw new ApplicationError(ErrorCode.PROFILE_INACTIVE, 'Profile is inactive', 403);
    request.user = {
      id: user.id,
      username: profile.username,
      role: profile.role,
      active: profile.active,
      accessToken: token,
    };
    return true;
  }

  private async readSession(token: string) {
    const user = await this.supabase.getUser(token);
    if (!user) return null;
    const profile = await this.supabase.getProfile(token, user.id);
    if (!profile) return null;
    return { token, user, profile };
  }

  private async refreshSession(request: Request, response: Response) {
    const refreshToken = request.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!refreshToken) {
      clearSessionCookies(response);
      return null;
    }
    const { data, error } = await this.supabase.refresh(refreshToken);
    if (error || !data.session || !data.user) {
      clearSessionCookies(response);
      return null;
    }
    const profile = await this.supabase.getProfile(data.session.access_token, data.user.id);
    if (!profile || !profile.active) {
      clearSessionCookies(response);
      return null;
    }
    const refreshMaxAgeDays = this.config.get<number>('AUTH_REFRESH_COOKIE_MAX_AGE_DAYS', 3650);
    setSessionCookies(response, data.session.access_token, data.session.refresh_token, refreshMaxAgeDays);
    return { token: data.session.access_token, user: data.user, profile };
  }

  private getToken(request: Request): string | undefined {
    const cookieToken = request.cookies?.[ACCESS_COOKIE] as string | undefined;
    if (cookieToken) return cookieToken;
    const authorization = request.headers.authorization;
    return authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : undefined;
  }
}
