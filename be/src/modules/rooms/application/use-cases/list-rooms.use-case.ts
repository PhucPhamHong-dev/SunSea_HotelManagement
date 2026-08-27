import { Injectable } from '@nestjs/common';
import type { RoomRepository } from '../ports/room.repository';

@Injectable()
export class ListRoomsUseCase {
  constructor(private readonly repository: RoomRepository) {}

  execute(accessToken: string, floorId?: string, checkInAt?: string, checkOutAt?: string) {
    return this.repository.list(accessToken, floorId, checkInAt, checkOutAt);
  }

  executeStatusByDate(accessToken: string, floorId: string | undefined, date: string) {
    return this.repository.listStatusByDate(accessToken, floorId, date);
  }
}
