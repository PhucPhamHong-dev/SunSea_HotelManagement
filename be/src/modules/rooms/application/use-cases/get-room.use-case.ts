import { HttpStatus, Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../../common/errors/application-error';
import { ErrorCode } from '../../../../common/errors/error-codes';
import type { RoomRepository } from '../ports/room.repository';

@Injectable()
export class GetRoomUseCase {
  constructor(private readonly repository: RoomRepository) {}

  async execute(accessToken: string, roomId: string) {
    const room = await this.repository.findById(accessToken, roomId);
    if (!room) throw new ApplicationError(ErrorCode.ROOM_NOT_FOUND, 'Room was not found', HttpStatus.NOT_FOUND);
    return room;
  }
}
