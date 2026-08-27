import { Module } from '@nestjs/common';
import { SupabasePaymentRepository } from './infrastructure/persistence/supabase-payment.repository';
import { LocalManualPaymentAdapter } from './application/services/manual-payment.adapter';
import { PaymentsController } from './presentation/http/controllers/payments.controller';
import { PaymentService } from './application/services/payment.service';

@Module({
  controllers: [PaymentsController],
  providers: [SupabasePaymentRepository, { provide: 'PaymentRepository', useExisting: SupabasePaymentRepository }, LocalManualPaymentAdapter, { provide: 'ManualPaymentAdapter', useExisting: LocalManualPaymentAdapter }, PaymentService],
  exports: ['PaymentRepository', 'ManualPaymentAdapter'],
})
export class PaymentsModule {}
