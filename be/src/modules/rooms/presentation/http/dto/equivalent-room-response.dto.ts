import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../../../../common/dto/api-meta.dto';
import { RoomResponseDto } from './room-response.dto';

export class EquivalentRoomSearchDto {
  @ApiProperty({ type: RoomResponseDto })
  requestedRoom!: RoomResponseDto;

  @ApiProperty({ description: 'Whether the receptionist can keep the requested room for the requested interval.' })
  isRequestedRoomAvailable!: boolean;

  @ApiProperty({ format: 'uuid' })
  roomTypeId!: string;

  @ApiProperty({ example: '2 giường · Không cửa sổ' })
  roomTypeName!: string;

  @ApiProperty({ description: 'Remaining sellable rooms in the type for the requested period.' })
  availableRoomCount!: number;

  @ApiProperty({ description: 'Whether an advance reservation may be confirmed against type inventory and assigned later.' })
  canReserveRoomType!: boolean;

  @ApiProperty({ type: [RoomResponseDto], description: 'Available rooms with exactly the same bed count and window attribute.' })
  alternatives!: RoomResponseDto[];
}

export class EquivalentRoomSearchEnvelopeDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty({ type: EquivalentRoomSearchDto })
  data!: EquivalentRoomSearchDto;

  @ApiProperty({ type: ApiMetaDto })
  meta!: ApiMetaDto;
}
