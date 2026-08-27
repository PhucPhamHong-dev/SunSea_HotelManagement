import { EventEmitter } from 'node:events';
import type { RealtimeEvent } from './realtime-event.types';

export class RealtimeBus extends EventEmitter {
  emitEvent(event: RealtimeEvent): void {
    this.emit('event', event);
  }
}
