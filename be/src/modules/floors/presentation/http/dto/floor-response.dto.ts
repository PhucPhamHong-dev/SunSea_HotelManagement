import { ApiProperty } from '@nestjs/swagger';

export class FloorResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 1 })
  floorNumber!: number;

  @ApiProperty({ example: 'Tầng 1' })
  name!: string;
}
