import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../../infrastructure/supabase/supabase.service';
import type { PaymentEntity, PaymentInput, PaymentRepository, PaymentMethod, PaymentType } from '../../application/ports/payment.repository';

interface PaymentRow { id: string; reservation_id: string; payment_type: PaymentType; amount: number; method: PaymentMethod; status: 'pending' | 'completed' | 'voided' | 'refunded'; paid_at: string | null; note: string | null; void_reason: string | null; }

@Injectable()
export class SupabasePaymentRepository implements PaymentRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async list(accessToken: string, reservationId?: string): Promise<PaymentEntity[]> {
    let query = this.supabase.getPublicClient(accessToken).from('payments').select('id, reservation_id, payment_type, amount, method, status, paid_at, note, void_reason').order('created_at', { ascending: false });
    if (reservationId) query = query.eq('reservation_id', reservationId);
    const { data, error } = await query.returns<PaymentRow[]>();
    if (error) throw error;
    return (data ?? []).map(this.map);
  }

  async create(accessToken: string, actorId: string, input: PaymentInput): Promise<PaymentEntity> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('payments').insert({ reservation_id: input.reservationId, payment_type: input.paymentType, amount: input.amount, method: input.method, status: 'completed', paid_at: new Date().toISOString(), note: input.note ?? null, created_by: actorId, updated_by: actorId }).select('id, reservation_id, payment_type, amount, method, status, paid_at, note, void_reason').single<PaymentRow>();
    if (error || !data) throw error ?? new Error('Payment insert returned no data');
    return this.map(data);
  }

  async void(accessToken: string, actorId: string, paymentId: string, reason: string): Promise<PaymentEntity> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('payments').update({ status: 'voided', void_reason: reason, voided_at: new Date().toISOString(), voided_by: actorId, updated_by: actorId }).eq('id', paymentId).select('id, reservation_id, payment_type, amount, method, status, paid_at, note, void_reason').single<PaymentRow>();
    if (error || !data) throw error ?? new Error('Payment void returned no data');
    return this.map(data);
  }

  private map(row: PaymentRow): PaymentEntity { return { id: row.id, reservationId: row.reservation_id, paymentType: row.payment_type, amount: row.amount, method: row.method, status: row.status, paidAt: row.paid_at, note: row.note ?? undefined, voidReason: row.void_reason }; }
}
