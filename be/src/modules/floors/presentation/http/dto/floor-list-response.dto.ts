import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../../../../common/dto/api-meta.dto';
import { FloorResponseDto } from './floor-response.dto';

export class FloorListResponseDto {
  @ApiProperty()
  success!: boolean;

  @ApiProperty({ type: [FloorResponseDto] })
  data!: FloorResponseDto[];

  @ApiProperty({ type: ApiMetaDto })
  meta!: ApiMetaDto;
}
