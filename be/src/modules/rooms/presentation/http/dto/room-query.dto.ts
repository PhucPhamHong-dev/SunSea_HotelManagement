import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class RoomQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  floorId?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  checkInAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  checkOutAt?: string;
}

export class RoomStatusByDateQueryDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  floorId?: string;

  @ApiProperty({ format: 'date', example: '2026-08-25' })
  @IsDateString()
  date!: string;
}

export class EquivalentRoomQueryDto {
  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  checkInAt!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true, description: 'Omit or send null for an open-ended stay.' })
  @IsOptional()
  @IsDateString()
  checkOutAt?: string | null;
}
