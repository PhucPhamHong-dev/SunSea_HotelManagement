import { ApiProperty } from '@nestjs/swagger';

export class RoomResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  floorId!: string;

  @ApiProperty({ format: 'uuid', description: 'Inventory type determined by bed count and window availability.' })
  roomTypeId!: string;

  @ApiProperty({ example: '1 giường · Có cửa sổ' })
  roomTypeName!: string;

  @ApiProperty({ example: '101' })
  roomNumber!: string;

  @ApiProperty({ example: 3 })
  bedCount!: number;

  @ApiProperty({ example: false, description: 'Whether the room has a window.' })
  hasWindow!: boolean;

  @ApiProperty({ type: Number, nullable: true, example: 450000, description: 'Nightly rate; may be null until configured' })
  defaultNightlyRate!: number | null;

  @ApiProperty({ example: 'standard' })
  layoutKey!: string;

  @ApiProperty({ enum: ['ready', 'cleaning', 'out_of_service'] })
  housekeepingStatus!: string;

  @ApiProperty({ enum: ['available', 'occupied', 'cleaning', 'reserved', 'out_of_service'] })
  status!: string;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  reservationId!: string | null;

  @ApiProperty({ description: 'Whether an immediate stay can be created for this room on the requested business date.' })
  canCreateStay!: boolean;

  @ApiProperty({ description: 'Whether an advance reservation can be created for this room on the requested business date.' })
  canCreateAdvance!: boolean;

  @ApiProperty({ nullable: true, type: String, description: 'Backend-provided reason when the room cannot be used for a new stay.' })
  unavailableReason!: string | null;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;

  @ApiProperty({ example: true })
  active!: boolean;
}
