import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GuestQueryDto {
  @ApiPropertyOptional({ description: 'Search by name, phone or identity number' })
  @IsOptional()
  @IsString()
  search?: string;
}
