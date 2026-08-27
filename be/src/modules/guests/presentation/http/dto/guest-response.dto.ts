import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiMetaDto } from '../../../../../common/dto/api-meta.dto';

export class GuestResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() fullName!: string;
  @ApiPropertyOptional() phone?: string;
  @ApiPropertyOptional() idNumber?: string;
  @ApiPropertyOptional({ format: 'date' }) dateOfBirth?: string;
  @ApiPropertyOptional({ format: 'date' }) idIssuedDate?: string;
  @ApiPropertyOptional() address?: string;
  @ApiPropertyOptional() note?: string;
  @ApiProperty() active!: boolean;
  @ApiPropertyOptional({ nullable: true }) deletedAt?: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

export class GuestListResponseDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: [GuestResponseDto] }) data!: GuestResponseDto[];
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}

export class GuestEnvelopeDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: GuestResponseDto }) data!: GuestResponseDto;
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}
