import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '../../../common/guards/supabase-auth.guard';
import { SupabaseService } from '../../../infrastructure/supabase/supabase.service';
import { RealtimeBus } from '../application/realtime-bus';
import type { RealtimeEvent } from '../application/realtime-event.types';

@WebSocketGateway({ cors: { origin: process.env.FRONTEND_URL ?? 'http://localhost:3000', credentials: true } })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly bus: RealtimeBus,
  ) {
    this.bus.on('event', (event: RealtimeEvent) => this.server?.emit(event.event, event));
  }

  async handleConnection(socket: Socket): Promise<void> {
    const token = this.readCookie(socket.handshake.headers.cookie, ACCESS_COOKIE);
    let activeToken = token;
    let user = token ? await this.supabase.getUser(token) : null;
    let profile = user && token ? await this.supabase.getProfile(token, user.id) : null;

    if ((!user || !profile?.active) && socket.handshake.headers.cookie) {
      const refreshToken = this.readCookie(socket.handshake.headers.cookie, REFRESH_COOKIE);
      if (refreshToken) {
        const refreshed = await this.supabase.refresh(refreshToken);
        if (!refreshed.error && refreshed.data.session && refreshed.data.user) {
          activeToken = refreshed.data.session.access_token;
          user = refreshed.data.user;
          profile = await this.supabase.getProfile(activeToken, user.id);
          if (user && profile?.active) {
            socket.emit('realtime.session.refresh_required', {
              status: 'refresh_required',
              occurredAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    if (!activeToken || !user || !profile?.active) {
      this.logger.warn(`Rejected realtime connection ${socket.id}`);
      socket.disconnect(true);
      return;
    }
    socket.emit('realtime.connection', { status: 'connected', occurredAt: new Date().toISOString() });
  }

  handleDisconnect(socket: Socket): void {
    this.logger.debug(`Realtime disconnected ${socket.id}`);
  }

  private readCookie(rawCookie: string | undefined, name: string): string | undefined {
    return rawCookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1);
  }
}
