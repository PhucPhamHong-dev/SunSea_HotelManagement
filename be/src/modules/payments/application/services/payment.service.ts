import { Inject, Injectable } from '@nestjs/common';
import type { ManualPaymentAdapter, PaymentEntity, PaymentInput, PaymentRepository } from '../ports/payment.repository';

@Injectable()
export class PaymentService {
  constructor(
    @Inject('PaymentRepository') private readonly repository: PaymentRepository,
    @Inject('ManualPaymentAdapter') private readonly adapter: ManualPaymentAdapter,
  ) {}

  list(accessToken: string, reservationId?: string) { return this.repository.list(accessToken, reservationId); }

  async create(accessToken: string, actorId: string, input: PaymentInput): Promise<PaymentEntity> {
    await this.adapter.record(input);
    return this.repository.create(accessToken, actorId, input);
  }

  void(accessToken: string, actorId: string, paymentId: string, reason: string) { return this.repository.void(accessToken, actorId, paymentId, reason); }
}
