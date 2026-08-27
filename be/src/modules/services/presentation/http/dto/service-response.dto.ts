import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiMetaDto } from '../../../../../common/dto/api-meta.dto';

export class ServiceCatalogResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() defaultPrice!: number;
  @ApiProperty() active!: boolean;
}

export class ServiceCatalogListResponseDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: [ServiceCatalogResponseDto] }) data!: ServiceCatalogResponseDto[];
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}

export class ServiceCatalogEnvelopeDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: ServiceCatalogResponseDto }) data!: ServiceCatalogResponseDto;
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}

export class ReservationServiceResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) reservationId!: string;
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) serviceId?: string | null;
  @ApiProperty() name!: string;
  @ApiProperty() unitPrice!: number;
  @ApiProperty() quantity!: number;
  @ApiProperty() total!: number;
  @ApiPropertyOptional({ type: String, nullable: true }) note?: string | null;
  @ApiProperty() active!: boolean;
}

export class ReservationServiceEnvelopeDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: ReservationServiceResponseDto }) data!: ReservationServiceResponseDto;
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}

export class ReservationServiceListResponseDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: [ReservationServiceResponseDto] }) data!: ReservationServiceResponseDto[];
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}
