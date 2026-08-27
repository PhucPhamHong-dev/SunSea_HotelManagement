import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../../infrastructure/supabase/supabase.service';
import type { GuestEntity, GuestInput, GuestRepository } from '../../application/ports/guest.repository';

interface GuestRow {
  id: string;
  full_name: string;
  phone: string | null;
  id_number: string | null;
  date_of_birth: string | null;
  id_issued_date: string | null;
  address: string | null;
  note: string | null;
  active: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

const fields = 'id, full_name, phone, id_number, date_of_birth, id_issued_date, address, note, active, deleted_at, created_at, updated_at';

@Injectable()
export class SupabaseGuestRepository implements GuestRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async list(accessToken: string, search?: string): Promise<GuestEntity[]> {
    let query = this.supabase.getPublicClient(accessToken).from('guests').select(fields).eq('active', true).is('deleted_at', null).order('created_at', { ascending: false });
    if (search) query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,id_number.ilike.%${search}%`);
    const { data, error } = await query.returns<GuestRow[]>();
    if (error) throw error;
    return (data ?? []).map((row) => this.map(row));
  }

  async findById(accessToken: string, guestId: string): Promise<GuestEntity | null> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('guests').select(fields).eq('id', guestId).maybeSingle<GuestRow>();
    if (error) throw error;
    return data ? this.map(data) : null;
  }

  async create(accessToken: string, actorId: string, input: GuestInput): Promise<GuestEntity> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('guests').insert({
      full_name: input.fullName,
      phone: input.phone ?? null,
      id_number: input.idNumber ?? null,
      date_of_birth: input.dateOfBirth ?? null,
      id_issued_date: input.idIssuedDate ?? null,
      address: input.address ?? null,
      note: input.note ?? null,
      created_by: actorId,
      updated_by: actorId,
    }).select(fields).single<GuestRow>();
    if (error || !data) throw error ?? new Error('Guest insert returned no data');
    return this.map(data);
  }

  async update(accessToken: string, actorId: string, guestId: string, input: Partial<GuestInput>): Promise<GuestEntity> {
    const patch: Record<string, unknown> = { updated_by: actorId };
    if (input.fullName !== undefined) patch.full_name = input.fullName.trim();
    if (input.phone !== undefined) patch.phone = input.phone?.trim() || null;
    if (input.idNumber !== undefined) patch.id_number = input.idNumber?.trim() || null;
    if (input.dateOfBirth !== undefined) patch.date_of_birth = input.dateOfBirth?.trim() || null;
    if (input.idIssuedDate !== undefined) patch.id_issued_date = input.idIssuedDate?.trim() || null;
    if (input.address !== undefined) patch.address = input.address?.trim() || null;
    if (input.note !== undefined) patch.note = input.note?.trim() || null;
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('guests').update(patch).eq('id', guestId).select(fields).single<GuestRow>();
    if (error || !data) throw error ?? new Error('Guest update returned no data');
    return this.map(data);
  }

  async deactivate(accessToken: string, actorId: string, guestId: string): Promise<GuestEntity> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('guests').update({ active: false, deleted_at: new Date().toISOString(), updated_by: actorId }).eq('id', guestId).select(fields).single<GuestRow>();
    if (error || !data) throw error ?? new Error('Guest deactivation returned no data');
    return this.map(data);
  }

  private map(row: GuestRow): GuestEntity {
    return {
      id: row.id,
      fullName: row.full_name,
      phone: row.phone ?? undefined,
      idNumber: row.id_number ?? undefined,
      dateOfBirth: row.date_of_birth ?? undefined,
      idIssuedDate: row.id_issued_date ?? undefined,
      address: row.address ?? undefined,
      note: row.note ?? undefined,
      active: row.active,
      deletedAt: row.deleted_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
