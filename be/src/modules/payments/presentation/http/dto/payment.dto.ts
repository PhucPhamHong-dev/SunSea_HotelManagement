import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import type { PaymentMethod, PaymentType } from '../../../application/ports/payment.repository';

export class CreatePaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  reservationId!: string;

  @ApiProperty({ enum: ['deposit', 'settlement', 'refund', 'adjustment'] })
  @IsEnum(['deposit', 'settlement', 'refund', 'adjustment'])
  paymentType!: PaymentType;

  @ApiProperty({ example: 500000 })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({ enum: ['cash', 'bank_transfer', 'other'] })
  @IsEnum(['cash', 'bank_transfer', 'other'])
  method!: PaymentMethod;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class VoidPaymentDto {
  @ApiProperty()
  @IsString()
  reason!: string;
}
