import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiMetaDto {
  @ApiPropertyOptional({ format: 'uuid' })
  requestId?: string;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}
