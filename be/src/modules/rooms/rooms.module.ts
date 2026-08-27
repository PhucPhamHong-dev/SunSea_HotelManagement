import { Module } from '@nestjs/common';
import { GetRoomUseCase } from './application/use-cases/get-room.use-case';
import { ListRoomsUseCase } from './application/use-cases/list-rooms.use-case';
import { SupabaseRoomRepository } from './infrastructure/persistence/supabase-room.repository';
import { RoomsController } from './presentation/http/controllers/rooms.controller';
import type { RoomRepository } from './application/ports/room.repository';

@Module({
  controllers: [RoomsController],
  providers: [
    SupabaseRoomRepository,
    { provide: 'RoomRepository', useExisting: SupabaseRoomRepository },
    {
      provide: ListRoomsUseCase,
      useFactory: (repository: RoomRepository) => new ListRoomsUseCase(repository),
      inject: ['RoomRepository'],
    },
    {
      provide: GetRoomUseCase,
      useFactory: (repository: RoomRepository) => new GetRoomUseCase(repository),
      inject: ['RoomRepository'],
    },
  ],
  exports: [ListRoomsUseCase],
})
export class RoomsModule {}
