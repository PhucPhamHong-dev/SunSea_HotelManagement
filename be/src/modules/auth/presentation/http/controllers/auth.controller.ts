import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { SupabaseAuthGuard, REFRESH_COOKIE } from '../../../../../common/guards/supabase-auth.guard';
import type { AuthenticatedUser } from '../../../../../common/types/api-response';
import { AuthService } from '../../../application/auth.service';
import { LoginDto } from '../dto/login.dto';
import { AuthLogoutEnvelopeDto, AuthRefreshEnvelopeDto, AuthUserEnvelopeDto } from '../dto/auth-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Login through Supabase Auth' })
  @ApiCreatedResponse({ type: AuthUserEnvelopeDto })
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    return this.authService.login(dto.username, dto.password, response);
  }

  @Post('logout')
  @ApiOperation({ summary: 'Clear the current session cookies' })
  @ApiCreatedResponse({ type: AuthLogoutEnvelopeDto })
  logout(@Res({ passthrough: true }) response: Response) {
    return this.authService.logout(response);
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  @ApiCookieAuth('hotel_session')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ type: AuthUserEnvelopeDto })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh session cookies' })
  @ApiCreatedResponse({ type: AuthRefreshEnvelopeDto })
  refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    return this.authService.refresh(request.cookies?.[REFRESH_COOKIE] as string | undefined, response);
  }
}
