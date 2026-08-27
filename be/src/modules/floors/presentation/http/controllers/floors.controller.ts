import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiExtraModels, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../../../../../common/guards/supabase-auth.guard';
import type { AuthenticatedUser } from '../../../../../common/types/api-response';
import { ListFloorsUseCase } from '../../../application/use-cases/list-floors.use-case';
import { GetFloorUseCase } from '../../../application/use-cases/get-floor.use-case';
import { ListRoomsUseCase } from '../../../../rooms/application/use-cases/list-rooms.use-case';
import { FloorResponseDto } from '../dto/floor-response.dto';
import { FloorListResponseDto } from '../dto/floor-list-response.dto';
import { RoomListResponseDto } from '../../../../rooms/presentation/http/dto/room-list-response.dto';

@ApiTags('floors')
@ApiCookieAuth('hotel_session')
@ApiExtraModels(FloorResponseDto, FloorListResponseDto, RoomListResponseDto)
@UseGuards(SupabaseAuthGuard)
@Controller('floors')
export class FloorsController {
  constructor(
    private readonly listFloors: ListFloorsUseCase,
    private readonly listRooms: ListRoomsUseCase,
    private readonly getFloor: GetFloorUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List hotel floors' })
  @ApiOkResponse({ type: FloorListResponseDto })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.listFloors.execute(user.accessToken);
  }

  @Get(':floorId')
  @ApiOperation({ summary: 'Get one hotel floor' })
  @ApiOkResponse({ type: FloorResponseDto })
  get(@CurrentUser() user: AuthenticatedUser, @Param('floorId') floorId: string) {
    return this.getFloor.execute(user.accessToken, floorId);
  }

  @Get(':floorId/rooms')
  @ApiOperation({ summary: 'List rooms on one floor' })
  @ApiOkResponse({ type: RoomListResponseDto })
  listRoomsOnFloor(@CurrentUser() user: AuthenticatedUser, @Param('floorId') floorId: string) {
    return this.listRooms.execute(user.accessToken, floorId);
  }
}
