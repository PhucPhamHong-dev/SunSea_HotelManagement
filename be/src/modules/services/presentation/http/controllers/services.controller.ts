import { Body, Controller, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../../../../../common/guards/supabase-auth.guard';
import type { AuthenticatedUser } from '../../../../../common/types/api-response';
import type { ServiceRepository } from '../../../application/ports/service.repository';
import { AddReservationServiceDto, ServiceCatalogDto, UpdateReservationServiceDto, VoidServiceDto } from '../dto/service.dto';
import { ReservationServiceEnvelopeDto, ReservationServiceListResponseDto, ServiceCatalogEnvelopeDto, ServiceCatalogListResponseDto } from '../dto/service-response.dto';

@ApiTags('services')
@ApiCookieAuth('hotel_session')
@UseGuards(SupabaseAuthGuard)
@Controller()
export class ServicesController {
  constructor(@Inject('ServiceRepository') private readonly repository: ServiceRepository) {}

  @Get('service-catalog')
  @ApiOperation({ summary: 'List active services' })
  @ApiOkResponse({ type: ServiceCatalogListResponseDto })
  listCatalog(@CurrentUser() user: AuthenticatedUser) { return this.repository.listCatalog(user.accessToken); }

  @Post('service-catalog')
  @ApiOperation({ summary: 'Create a service catalog item' })
  @ApiCreatedResponse({ type: ServiceCatalogEnvelopeDto })
  createCatalog(@CurrentUser() user: AuthenticatedUser, @Body() dto: ServiceCatalogDto) { return this.repository.createCatalog(user.accessToken, user.id, dto); }

  @Patch('service-catalog/:serviceId')
  @ApiOperation({ summary: 'Update a service catalog item' })
  @ApiOkResponse({ type: ServiceCatalogEnvelopeDto })
  updateCatalog(@CurrentUser() user: AuthenticatedUser, @Param('serviceId') serviceId: string, @Body() dto: Partial<ServiceCatalogDto>) { return this.repository.updateCatalog(user.accessToken, user.id, serviceId, dto); }

  @Get('reservations/:reservationId/services')
  @ApiOperation({ summary: 'List active services for a reservation' })
  @ApiOkResponse({ type: ReservationServiceListResponseDto })
  listReservationServices(@CurrentUser() user: AuthenticatedUser, @Param('reservationId') reservationId: string) {
    return this.repository.listReservationServices(user.accessToken, reservationId);
  }

  @Post('reservations/:reservationId/services')
  @ApiOperation({ summary: 'Add a service to a checked-in reservation' })
  @ApiCreatedResponse({ type: ReservationServiceEnvelopeDto })
  add(@CurrentUser() user: AuthenticatedUser, @Param('reservationId') reservationId: string, @Body() dto: AddReservationServiceDto) { return this.repository.addToReservation(user.accessToken, user.id, { ...dto, reservationId }); }

  @Patch('reservation-services/:serviceId')
  @ApiOperation({ summary: 'Update a service on a checked-in reservation' })
  @ApiOkResponse({ type: ReservationServiceEnvelopeDto })
  updateReservationService(@CurrentUser() user: AuthenticatedUser, @Param('serviceId') serviceId: string, @Body() dto: UpdateReservationServiceDto) {
    return this.repository.updateReservationService(user.accessToken, user.id, serviceId, dto);
  }

  @Patch('reservation-services/:serviceId/void')
  @ApiOperation({ summary: 'Void a reservation service' })
  @ApiOkResponse({ type: ReservationServiceEnvelopeDto })
  void(@CurrentUser() user: AuthenticatedUser, @Param('serviceId') serviceId: string, @Body() dto: VoidServiceDto) { return this.repository.voidReservationService(user.accessToken, user.id, serviceId, dto.reason); }
}
