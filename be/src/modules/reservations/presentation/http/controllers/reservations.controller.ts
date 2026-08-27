import { Body, Controller, Get, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../../../../../common/guards/supabase-auth.guard';
import type { AuthenticatedUser } from '../../../../../common/types/api-response';
import { ReservationService } from '../../../application/services/reservation.service';
import type { ReservationRepository } from '../../../application/ports/reservation.repository';
import { AdvanceReservationListQueryDto, CancelReservationDto, CreateReservationDto, CreateStayDto, IntakePolicyQueryDto, PricingPreviewDto, ReservationActionDto, UpdateReservationDto } from '../dto/reservation.dto';
import { AdvanceReservationDetailEnvelopeDto, AdvanceReservationListResponseDto, CheckoutPreviewEnvelopeDto, CreateStayEnvelopeDto, IntakePolicyEnvelopeDto, PricingPreviewEnvelopeDto, ReservationEnvelopeDto, ReservationListResponseDto } from '../dto/reservation-response.dto';

@ApiTags('reservations')
@ApiCookieAuth('hotel_session')
@UseGuards(SupabaseAuthGuard)
@Controller('reservations')
export class ReservationsController {
  constructor(
    private readonly service: ReservationService,
    @Inject('ReservationRepository') private readonly repository: ReservationRepository,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List reservations' })
  @ApiOkResponse({ type: ReservationListResponseDto })
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user.accessToken);
  }

  @Get('advance')
  @ApiOperation({ summary: 'List active advance reservations with deposit summary' })
  @ApiOkResponse({ type: AdvanceReservationListResponseDto })
  listAdvance(@CurrentUser() user: AuthenticatedUser, @Query() query: AdvanceReservationListQueryDto) {
    return this.service.listAdvance(user.accessToken, query);
  }

  @Post()
  @ApiOperation({ summary: 'Create a draft reservation' })
  @ApiCreatedResponse({ type: ReservationEnvelopeDto })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReservationDto) {
    return this.service.create(user.accessToken, user.id, dto);
  }

  @Get('intake-policy')
  @ApiOperation({ summary: 'Get available empty-room actions for a local date' })
  @ApiOkResponse({ type: IntakePolicyEnvelopeDto })
  intakePolicy(@CurrentUser() _user: AuthenticatedUser, @Query() query: IntakePolicyQueryDto) {
    return this.service.getIntakePolicy(query.date);
  }

  @Post('intake')
  @ApiOperation({ summary: 'Create a guest and either check in now or make an advance reservation atomically' })
  @ApiCreatedResponse({ type: CreateStayEnvelopeDto })
  createStay(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateStayDto) {
    return this.service.createStay(user.accessToken, user.id, dto);
  }

  @Post('pricing-preview')
  @ApiOperation({ summary: 'Calculate server-side stay pricing' })
  @ApiCreatedResponse({ type: PricingPreviewEnvelopeDto })
  preview(@CurrentUser() user: AuthenticatedUser, @Body() dto: PricingPreviewDto) {
    return this.service.preview(user.accessToken, dto, dto.manualAdjustment);
  }

  @Get(':reservationId')
  @ApiOperation({ summary: 'Get a reservation' })
  @ApiOkResponse({ type: ReservationEnvelopeDto })
  get(@CurrentUser() user: AuthenticatedUser, @Param('reservationId') reservationId: string) {
    return this.service.get(user.accessToken, reservationId);
  }

  @Get(':reservationId/advance-detail')
  @ApiOperation({ summary: 'Get advance reservation detail and backend-calculated financials' })
  @ApiOkResponse({ type: AdvanceReservationDetailEnvelopeDto })
  advanceDetail(@CurrentUser() user: AuthenticatedUser, @Param('reservationId') reservationId: string) {
    return this.service.getAdvanceDetail(user.accessToken, reservationId);
  }

  @Patch(':reservationId')
  @ApiOperation({ summary: 'Update reservation details with optimistic locking' })
  @ApiOkResponse({ type: ReservationEnvelopeDto })
  updateDetails(@CurrentUser() user: AuthenticatedUser, @Param('reservationId') reservationId: string, @Body() dto: UpdateReservationDto) {
    return this.service.updateDetails(user.accessToken, user.id, reservationId, dto.version, dto);
  }

  @Patch(':reservationId/confirm')
  @ApiOkResponse({ type: ReservationEnvelopeDto })
  confirm(@CurrentUser() user: AuthenticatedUser, @Param('reservationId') id: string, @Body() dto: ReservationActionDto) {
    return this.service.transition(user.accessToken, user.id, id, dto.version, 'confirmed');
  }

  @Patch(':reservationId/check-in')
  @ApiOkResponse({ type: ReservationEnvelopeDto })
  checkIn(@CurrentUser() user: AuthenticatedUser, @Param('reservationId') id: string, @Body() dto: ReservationActionDto) {
    return this.service.transition(user.accessToken, user.id, id, dto.version, 'checked_in');
  }

  @Patch(':reservationId/cancel')
  @ApiOkResponse({ type: ReservationEnvelopeDto })
  cancel(@CurrentUser() user: AuthenticatedUser, @Param('reservationId') id: string, @Body() dto: CancelReservationDto) {
    return this.service.transition(user.accessToken, user.id, id, dto.version, 'cancelled', dto.reason);
  }

  @Post(':reservationId/check-out')
  @ApiOperation({ summary: 'Confirm the backend-calculated checkout bill, record its cash settlement, and check out' })
  @ApiCreatedResponse({ type: ReservationEnvelopeDto })
  checkOut(@CurrentUser() user: AuthenticatedUser, @Param('reservationId') id: string, @Body() dto: ReservationActionDto) {
    return this.service.checkout(user.accessToken, user.id, id, dto.version);
  }

  @Get(':reservationId/checkout-preview')
  @ApiOkResponse({ type: CheckoutPreviewEnvelopeDto })
  checkoutPreview(@CurrentUser() user: AuthenticatedUser, @Param('reservationId') reservationId: string) {
    return this.service.checkoutPreview(user.accessToken, reservationId);
  }
}
