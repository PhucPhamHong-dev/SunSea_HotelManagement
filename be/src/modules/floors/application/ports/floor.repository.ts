import type { FloorEntity } from '../../domain/entities/floor.entity';

export interface FloorRepository {
  list(accessToken: string): Promise<FloorEntity[]>;
  findById(accessToken: string, floorId: string): Promise<FloorEntity | null>;
}
