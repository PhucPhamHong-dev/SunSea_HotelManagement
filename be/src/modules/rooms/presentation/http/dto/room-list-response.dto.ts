import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../../../../common/dto/api-meta.dto';
import { RoomResponseDto } from './room-response.dto';

export class RoomListResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty({ type: [RoomResponseDto] })
  data!: RoomResponseDto[];

  @ApiProperty({ type: ApiMetaDto })
  meta!: ApiMetaDto;
}
