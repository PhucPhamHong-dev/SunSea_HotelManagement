import { Injectable } from '@nestjs/common';
import type { FloorRepository } from '../ports/floor.repository';

@Injectable()
export class ListFloorsUseCase {
  constructor(private readonly repository: FloorRepository) {}

  execute(accessToken: string) {
    return this.repository.list(accessToken);
  }
}
