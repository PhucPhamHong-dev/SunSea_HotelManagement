import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiMetaDto } from '../../../../../common/dto/api-meta.dto';

export class PaymentResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) reservationId!: string;
  @ApiProperty({ enum: ['deposit', 'settlement', 'refund', 'adjustment'] }) paymentType!: string;
  @ApiProperty() amount!: number;
  @ApiProperty({ enum: ['cash', 'bank_transfer', 'other'] }) method!: string;
  @ApiProperty({ enum: ['pending', 'completed', 'voided', 'refunded'] }) status!: string;
  @ApiPropertyOptional({ format: 'date-time', nullable: true }) paidAt?: string | null;
  @ApiPropertyOptional({ nullable: true }) note?: string | null;
  @ApiPropertyOptional({ nullable: true }) voidReason?: string | null;
}

export class PaymentListResponseDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: [PaymentResponseDto] }) data!: PaymentResponseDto[];
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}

export class PaymentEnvelopeDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: PaymentResponseDto }) data!: PaymentResponseDto;
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}
