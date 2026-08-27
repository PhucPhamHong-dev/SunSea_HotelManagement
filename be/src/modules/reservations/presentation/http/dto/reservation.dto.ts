import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class CreateStayGuestDto {
  @ApiProperty({ example: 'Nguyễn Văn An' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  fullName!: string;

  @ApiPropertyOptional({ example: '0900000000' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: '079000000000' })
  @IsOptional()
  @IsString()
  idNumber?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @IsDateString()
  idIssuedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}

export class CreateStayDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roomId!: string;

  @ApiPropertyOptional({ enum: ['exact', 'room_type'], default: 'exact', description: 'Exact assigns the selected physical room. Room-type mode keeps it as a preference and assigns a matching room at check-in.' })
  @IsOptional()
  @IsEnum(['exact', 'room_type'])
  assignmentMode?: 'exact' | 'room_type';

  @ApiProperty({ type: CreateStayGuestDto })
  @ValidateNested()
  @Type(() => CreateStayGuestDto)
  guest!: CreateStayGuestDto;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  plannedCheckInAt!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true, description: 'Omit or send null when the planned checkout is not yet known.' })
  @IsOptional()
  @IsDateString()
  plannedCheckOutAt?: string | null;

  @ApiProperty({ enum: ['check_in', 'advance'] })
  @IsEnum(['check_in', 'advance'])
  action!: 'check_in' | 'advance';

  @ApiProperty({ example: 600000, description: 'Nightly room rate in integer VND. Stored as an immutable reservation snapshot.' })
  @IsInt()
  @Min(1)
  roomRatePerNight!: number;

  @ApiPropertyOptional({ example: 500000, description: 'Actual deposit in integer VND. Allowed only for an advance reservation and recorded as a completed payment.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class IntakePolicyQueryDto {
  @ApiProperty({ format: 'date', example: '2026-08-24' })
  @IsDateString()
  date!: string;
}

export class CreateReservationDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  roomId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  guestId!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  plannedCheckInAt!: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  plannedCheckOutAt?: string | null;

  @ApiPropertyOptional({ example: 500000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  depositExpected?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class ReservationActionDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  version!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateReservationDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  version!: number;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  plannedCheckInAt?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional()
  @IsDateString()
  plannedCheckOutAt?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional()
  @IsString()
  note?: string | null;
}

export class PricingPreviewDto extends CreateReservationDto {
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  manualAdjustment?: number;
}

export class AdvanceReservationListQueryDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  floorId?: string;
}

export class CancelReservationDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  version!: number;

  @ApiProperty({ minLength: 1, example: 'Khách thay đổi lịch trình' })
  @IsString()
  @MinLength(1)
  reason!: string;
}
