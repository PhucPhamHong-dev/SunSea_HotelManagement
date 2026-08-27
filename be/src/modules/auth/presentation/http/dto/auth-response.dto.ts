import { ApiProperty } from '@nestjs/swagger';
import { ApiMetaDto } from '../../../../../common/dto/api-meta.dto';

export class AuthUserResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() username!: string;
  @ApiProperty({ enum: ['owner', 'staff'] }) role!: 'owner' | 'staff';
  @ApiProperty() active!: boolean;
}

export class AuthUserEnvelopeDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: AuthUserResponseDto }) data!: AuthUserResponseDto;
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}

export class AuthLogoutResponseDto {
  @ApiProperty() loggedOut!: boolean;
}

export class AuthLogoutEnvelopeDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: AuthLogoutResponseDto }) data!: AuthLogoutResponseDto;
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}

export class AuthRefreshResponseDto {
  @ApiProperty() refreshed!: boolean;
}

export class AuthRefreshEnvelopeDto {
  @ApiProperty() success!: boolean;
  @ApiProperty({ type: AuthRefreshResponseDto }) data!: AuthRefreshResponseDto;
  @ApiProperty({ type: ApiMetaDto }) meta!: ApiMetaDto;
}
