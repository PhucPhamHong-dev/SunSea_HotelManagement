import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class RoomDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  floorId!: string;

  @ApiProperty({ example: '101' })
  @IsString()
  roomNumber!: string;

  @ApiProperty({ example: 3 })
  @IsNumber()
  @Min(1)
  bedCount!: number;

  @ApiPropertyOptional({ description: 'Whether the room has a window. Only equivalent rooms with the same value can be suggested.' })
  @IsOptional()
  @IsBoolean()
  hasWindow?: boolean;

  @ApiPropertyOptional({ type: Number, nullable: false, example: 450000, description: 'Nightly rate; omit to keep it unset' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultNightlyRate?: number | null;

  @ApiPropertyOptional({ example: 'standard' })
  @IsOptional()
  @IsString()
  layoutKey?: string;
}

export class RoomRateDto {
  @ApiProperty({ type: Number, nullable: false, example: 450000, description: 'Set to null in persistence to clear the rate' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate!: number | null;
}

export class HousekeepingDto {
  @ApiProperty({ enum: ['ready', 'cleaning', 'out_of_service'] })
  @IsEnum(['ready', 'cleaning', 'out_of_service'])
  status!: 'ready' | 'cleaning' | 'out_of_service';
}
