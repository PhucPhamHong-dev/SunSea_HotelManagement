import { Injectable } from '@nestjs/common';
import type { ManualPaymentAdapter, PaymentInput } from '../ports/payment.repository';

@Injectable()
export class LocalManualPaymentAdapter implements ManualPaymentAdapter {
  async record(_input: PaymentInput): Promise<{ externalReference: string | null }> {
    return { externalReference: null };
  }
}
