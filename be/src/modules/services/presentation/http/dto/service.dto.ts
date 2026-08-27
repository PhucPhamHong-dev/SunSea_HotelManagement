import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ServiceCatalogDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ example: 50000 })
  @IsNumber()
  @Min(0)
  defaultPrice!: number;
}

export class AddReservationServiceDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  serviceId?: string;

  @ApiPropertyOptional({ description: 'Required for a custom service' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Required for a manually entered service. Integer VND only.', example: 300000 })
  @IsOptional()
  @IsInt()
  @Min(1)
  unitPrice?: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class VoidServiceDto {
  @ApiProperty()
  @IsString()
  reason!: string;
}

export class UpdateReservationServiceDto {
  @ApiProperty({ example: 'Giặt ủi' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Integer VND only.', example: 300000 })
  @IsInt()
  @Min(1)
  unitPrice!: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  note?: string | null;
}
