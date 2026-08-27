import { SetMetadata } from '@nestjs/common';

export const ROLE_METADATA_KEY = 'sunsea:roles';
export const Roles = (...roles: Array<'owner' | 'staff'>) => SetMetadata(ROLE_METADATA_KEY, roles);
