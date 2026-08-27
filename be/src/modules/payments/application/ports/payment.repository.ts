export type PaymentType = 'deposit' | 'settlement' | 'refund' | 'adjustment';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'other';

export interface PaymentInput {
  reservationId: string;
  paymentType: PaymentType;
  amount: number;
  method: PaymentMethod;
  note?: string;
}

export interface PaymentEntity extends PaymentInput {
  id: string;
  status: 'pending' | 'completed' | 'voided' | 'refunded';
  paidAt: string | null;
  voidReason: string | null;
}

export interface PaymentRepository {
  list(accessToken: string, reservationId?: string): Promise<PaymentEntity[]>;
  create(accessToken: string, actorId: string, input: PaymentInput): Promise<PaymentEntity>;
  void(accessToken: string, actorId: string, paymentId: string, reason: string): Promise<PaymentEntity>;
}

export interface ManualPaymentAdapter {
  record(input: PaymentInput): Promise<{ externalReference: string | null }>;
}
