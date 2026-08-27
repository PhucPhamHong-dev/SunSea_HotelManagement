import { Module } from '@nestjs/common';
import { RealtimeBus } from './application/realtime-bus';
import { RealtimeService } from './application/realtime.service';
import { RealtimeGateway } from './presentation/realtime.gateway';

@Module({ providers: [RealtimeBus, RealtimeService, RealtimeGateway], exports: [RealtimeBus] })
export class RealtimeModule {}
