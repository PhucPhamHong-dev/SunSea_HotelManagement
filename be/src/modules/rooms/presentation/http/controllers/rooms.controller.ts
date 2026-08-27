import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiExtraModels, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../../../../../common/guards/supabase-auth.guard';
import type { AuthenticatedUser } from '../../../../../common/types/api-response';
import { GetRoomUseCase } from '../../../application/use-cases/get-room.use-case';
import { ListRoomsUseCase } from '../../../application/use-cases/list-rooms.use-case';
import { EquivalentRoomQueryDto, RoomQueryDto, RoomStatusByDateQueryDto } from '../dto/room-query.dto';
import { RoomResponseDto } from '../dto/room-response.dto';
import { RoomListResponseDto } from '../dto/room-list-response.dto';
import { RoomEnvelopeDto } from '../dto/room-envelope.dto';
import { HousekeepingDto, RoomDto, RoomRateDto } from '../dto/room.dto';
import type { RoomRepository } from '../../../application/ports/room.repository';
import { EquivalentRoomSearchEnvelopeDto, EquivalentRoomSearchDto } from '../dto/equivalent-room-response.dto';

@ApiTags('rooms')
@ApiCookieAuth('hotel_session')
@ApiExtraModels(RoomResponseDto, RoomListResponseDto, RoomEnvelopeDto, EquivalentRoomSearchDto, EquivalentRoomSearchEnvelopeDto)
@UseGuards(SupabaseAuthGuard)
@Controller('rooms')
export class RoomsController {
  constructor(
    private readonly listRooms: ListRoomsUseCase,
    private readonly getRoom: GetRoomUseCase,
    @Inject('RoomRepository') private readonly repository: RoomRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List rooms, optionally filtered by floor' })
  @ApiOkResponse({ type: RoomListResponseDto })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: RoomQueryDto) {
    return this.listRooms.execute(user.accessToken, query.floorId, query.checkInAt, query.checkOutAt);
  }

  @Get('status-by-date')
  @ApiOperation({ summary: 'List room operational status and intake availability for a business date' })
  @ApiOkResponse({ type: RoomListResponseDto })
  statusByDate(@CurrentUser() user: AuthenticatedUser, @Query() query: RoomStatusByDateQueryDto) {
    return this.listRooms.executeStatusByDate(user.accessToken, query.floorId, query.date);
  }

  @Get('availability')
  @ApiOperation({ summary: 'List rooms available for a requested period' })
  availability(@CurrentUser() user: AuthenticatedUser, @Query() query: RoomQueryDto) {
    return this.listRooms.execute(user.accessToken, query.floorId, query.checkInAt, query.checkOutAt);
  }

  @Get(':roomId/equivalents')
  @ApiOperation({ summary: 'Find available rooms with exactly the same bed count and window attribute' })
  @ApiOkResponse({ type: EquivalentRoomSearchEnvelopeDto })
  equivalents(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Query() query: EquivalentRoomQueryDto) {
    return this.repository.findEquivalentRooms(user.accessToken, roomId, query.checkInAt, query.checkOutAt);
  }

  @Get(':roomId')
  @ApiOperation({ summary: 'Get one room' })
  @ApiOkResponse({ type: RoomEnvelopeDto })
  get(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string) {
    return this.getRoom.execute(user.accessToken, roomId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a room' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: RoomDto) {
    return this.repository.create(user.accessToken, user.id, dto);
  }

  @Patch(':roomId')
  @ApiOperation({ summary: 'Update a room' })
  update(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Body() dto: Partial<RoomDto>) {
    return this.repository.update(user.accessToken, user.id, roomId, dto);
  }

  @Patch(':roomId/rate')
  @ApiOperation({ summary: 'Update room nightly rate' })
  updateRate(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Body() dto: RoomRateDto) {
    return this.repository.updateRate(user.accessToken, user.id, roomId, dto.rate);
  }

  @Patch(':roomId/housekeeping')
  @ApiOperation({ summary: 'Update room housekeeping status' })
  @ApiOkResponse({ type: RoomEnvelopeDto })
  updateHousekeeping(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string, @Body() dto: HousekeepingDto) {
    return this.repository.updateHousekeeping(user.accessToken, user.id, roomId, dto.status);
  }

  @Get(':roomId/status')
  @ApiOperation({ summary: 'Get derived room display status' })
  status(@CurrentUser() user: AuthenticatedUser, @Param('roomId') roomId: string) {
    return this.getRoom.execute(user.accessToken, roomId);
  }
}
