import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../../../../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../../../../../common/guards/supabase-auth.guard';
import type { AuthenticatedUser } from '../../../../../common/types/api-response';
import { PaymentService } from '../../../application/services/payment.service';
import { CreatePaymentDto, VoidPaymentDto } from '../dto/payment.dto';
import { PaymentQueryDto } from '../dto/payment-query.dto';
import { PaymentEnvelopeDto, PaymentListResponseDto } from '../dto/payment-response.dto';

@ApiTags('payments')
@ApiCookieAuth('hotel_session')
@UseGuards(SupabaseAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly service: PaymentService) {}

  @Get()
  @ApiOperation({ summary: 'List payments' })
  @ApiOkResponse({ type: PaymentListResponseDto })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: PaymentQueryDto) { return this.service.list(user.accessToken, query.reservationId); }

  @Post()
  @ApiOperation({ summary: 'Record a manual payment' })
  @ApiCreatedResponse({ type: PaymentEnvelopeDto })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePaymentDto) { return this.service.create(user.accessToken, user.id, dto); }

  @Patch(':paymentId/void')
  @ApiOperation({ summary: 'Void a manual payment' })
  @ApiOkResponse({ type: PaymentEnvelopeDto })
  void(@CurrentUser() user: AuthenticatedUser, @Param('paymentId') paymentId: string, @Body() dto: VoidPaymentDto) { return this.service.void(user.accessToken, user.id, paymentId, dto.reason); }
}
