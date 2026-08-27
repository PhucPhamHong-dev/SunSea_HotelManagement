import { HttpStatus, Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../../common/errors/application-error';
import { ErrorCode } from '../../../../common/errors/error-codes';
import type { FloorRepository } from '../ports/floor.repository';

@Injectable()
export class GetFloorUseCase {
  constructor(private readonly repository: FloorRepository) {}

  async execute(accessToken: string, floorId: string) {
    const floor = await this.repository.findById(accessToken, floorId);
    if (!floor) throw new ApplicationError(ErrorCode.FLOOR_NOT_FOUND, 'Floor was not found', HttpStatus.NOT_FOUND);
    return floor;
  }
}
