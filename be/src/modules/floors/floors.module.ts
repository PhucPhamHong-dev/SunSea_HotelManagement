import { Module } from '@nestjs/common';
import { ListFloorsUseCase } from './application/use-cases/list-floors.use-case';
import { GetFloorUseCase } from './application/use-cases/get-floor.use-case';
import { SupabaseFloorRepository } from './infrastructure/persistence/supabase-floor.repository';
import { FloorsController } from './presentation/http/controllers/floors.controller';
import type { FloorRepository } from './application/ports/floor.repository';
import { RoomsModule } from '../rooms/rooms.module';

@Module({
  imports: [RoomsModule],
  controllers: [FloorsController],
  providers: [
    SupabaseFloorRepository,
    {
      provide: GetFloorUseCase,
      useFactory: (repository: FloorRepository) => new GetFloorUseCase(repository),
      inject: ['FloorRepository'],
    },
    { provide: 'FloorRepository', useExisting: SupabaseFloorRepository },
    {
      provide: ListFloorsUseCase,
      useFactory: (repository: FloorRepository) => new ListFloorsUseCase(repository),
      inject: ['FloorRepository'],
    },
  ],
})
export class FloorsModule {}
