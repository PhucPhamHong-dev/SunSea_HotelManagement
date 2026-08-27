import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../../../../../common/guards/supabase-auth.guard';
import type { AuthenticatedUser } from '../../../../../common/types/api-response';
import type { GuestRepository } from '../../../application/ports/guest.repository';
import { GuestDto, UpdateGuestDto } from '../dto/guest.dto';
import { GuestQueryDto } from '../dto/guest-query.dto';
import { GuestEnvelopeDto, GuestListResponseDto } from '../dto/guest-response.dto';
import { UpdateGuestUseCase } from '../../../application/use-cases/update-guest.use-case';

@ApiTags('guests')
@ApiCookieAuth('hotel_session')
@UseGuards(SupabaseAuthGuard)
@Controller('guests')
export class GuestsController {
  constructor(
    @Inject('GuestRepository') private readonly repository: GuestRepository,
    private readonly updateGuest: UpdateGuestUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search active guests' })
  @ApiOkResponse({ type: GuestListResponseDto })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: GuestQueryDto) {
    return this.repository.list(user.accessToken, query.search);
  }

  @Post()
  @ApiOperation({ summary: 'Create a guest' })
  @ApiCreatedResponse({ type: GuestEnvelopeDto })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: GuestDto) {
    return this.repository.create(user.accessToken, user.id, dto);
  }

  @Get(':guestId')
  @ApiOperation({ summary: 'Get a guest' })
  @ApiOkResponse({ type: GuestEnvelopeDto })
  get(@CurrentUser() user: AuthenticatedUser, @Param('guestId') guestId: string) {
    return this.repository.findById(user.accessToken, guestId);
  }

  @Patch(':guestId')
  @ApiOperation({ summary: 'Update a guest' })
  @ApiOkResponse({ type: GuestEnvelopeDto })
  update(@CurrentUser() user: AuthenticatedUser, @Param('guestId') guestId: string, @Body() dto: UpdateGuestDto) {
    return this.updateGuest.execute(user.accessToken, user.id, guestId, dto);
  }

  @Patch(':guestId/deactivate')
  @ApiOperation({ summary: 'Soft deactivate a guest' })
  @ApiOkResponse({ type: GuestEnvelopeDto })
  deactivate(@CurrentUser() user: AuthenticatedUser, @Param('guestId') guestId: string) {
    return this.repository.deactivate(user.accessToken, user.id, guestId);
  }
}
