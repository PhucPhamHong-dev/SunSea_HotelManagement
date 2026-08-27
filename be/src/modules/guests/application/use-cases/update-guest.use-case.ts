import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../../common/errors/application-error';
import { ErrorCode } from '../../../../common/errors/error-codes';
import type { GuestInput, GuestEntity, GuestRepository } from '../ports/guest.repository';

@Injectable()
export class UpdateGuestUseCase {
  constructor(@Inject('GuestRepository') private readonly repository: GuestRepository) {}

  async execute(accessToken: string, actorId: string, guestId: string, input: Partial<GuestInput>): Promise<GuestEntity> {
    const current = await this.repository.findById(accessToken, guestId);
    if (!current) throw new ApplicationError(ErrorCode.GUEST_NOT_FOUND, 'Guest was not found', HttpStatus.NOT_FOUND);
    if (input.fullName !== undefined && !input.fullName.trim()) {
      throw new ApplicationError(ErrorCode.VALIDATION_ERROR, 'Guest name cannot be empty', HttpStatus.BAD_REQUEST);
    }
    return this.repository.update(accessToken, actorId, guestId, input);
  }
}
