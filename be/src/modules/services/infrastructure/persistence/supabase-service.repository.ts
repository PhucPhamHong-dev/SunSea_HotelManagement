import { HttpStatus, Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../../infrastructure/supabase/supabase.service';
import { ApplicationError } from '../../../../common/errors/application-error';
import { ErrorCode } from '../../../../common/errors/error-codes';
import type { ReservationServiceEntity, ReservationServiceInput, ReservationServiceUpdateInput, ServiceCatalogEntity, ServiceCatalogInput, ServiceRepository } from '../../application/ports/service.repository';

interface CatalogRow { id: string; name: string; default_price: number; active: boolean; }
interface ReservationServiceRow { id: string; reservation_id: string; service_id: string | null; name_snapshot: string; unit_price_snapshot: number; quantity: number; total: number; note: string | null; active: boolean; }

@Injectable()
export class SupabaseServiceRepository implements ServiceRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async listCatalog(accessToken: string): Promise<ServiceCatalogEntity[]> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('service_catalog').select('id, name, default_price, active').eq('active', true).order('name').returns<CatalogRow[]>();
    if (error) throw error;
    return (data ?? []).map(this.mapCatalog);
  }

  async createCatalog(accessToken: string, actorId: string, input: ServiceCatalogInput): Promise<ServiceCatalogEntity> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('service_catalog').insert({ name: input.name, default_price: input.defaultPrice, created_by: actorId, updated_by: actorId }).select('id, name, default_price, active').single<CatalogRow>();
    if (error || !data) throw error ?? new Error('Service catalog insert returned no data');
    return this.mapCatalog(data);
  }

  async updateCatalog(accessToken: string, actorId: string, serviceId: string, input: Partial<ServiceCatalogInput>): Promise<ServiceCatalogEntity> {
    const patch: Record<string, unknown> = { updated_by: actorId };
    if (input.name !== undefined) patch.name = input.name;
    if (input.defaultPrice !== undefined) patch.default_price = input.defaultPrice;
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('service_catalog').update(patch).eq('id', serviceId).select('id, name, default_price, active').single<CatalogRow>();
    if (error || !data) throw error ?? new Error('Service catalog update returned no data');
    return this.mapCatalog(data);
  }

  async listReservationServices(accessToken: string, reservationId: string): Promise<ReservationServiceEntity[]> {
    const { data, error } = await this.supabase.getPublicClient(accessToken)
      .from('reservation_services')
      .select('id, reservation_id, service_id, name_snapshot, unit_price_snapshot, quantity, total, note, active')
      .eq('reservation_id', reservationId)
      .eq('active', true)
      .order('created_at', { ascending: true })
      .returns<ReservationServiceRow[]>();
    if (error) throw error;
    return (data ?? []).map(this.mapReservationService);
  }

  async addToReservation(accessToken: string, actorId: string, input: ReservationServiceInput): Promise<ReservationServiceEntity> {
    const client = this.supabase.getPublicClient(accessToken);
    const { data: reservation, error: reservationError } = await client.from('reservations').select('status').eq('id', input.reservationId).maybeSingle<{ status: string }>();
    if (reservationError) throw reservationError;
    if (reservation?.status !== 'checked_in') throw new ApplicationError(ErrorCode.SERVICE_ONLY_CHECKED_IN, 'Services can only be added to checked-in reservations', HttpStatus.CONFLICT);
    let name = input.name;
    let unitPrice = input.unitPrice;
    if (input.serviceId) {
      const { data: catalog, error } = await client.from('service_catalog').select('name, default_price').eq('id', input.serviceId).maybeSingle<{ name: string; default_price: number }>();
      if (error) throw error;
      if (!catalog) throw new ApplicationError(ErrorCode.SERVICE_NOT_FOUND, 'Service was not found', HttpStatus.NOT_FOUND);
      name = catalog.name;
      unitPrice = unitPrice ?? catalog.default_price;
    }
    if (!name || unitPrice === undefined || !Number.isSafeInteger(unitPrice) || unitPrice < 1 || !Number.isSafeInteger(input.quantity) || input.quantity < 1) {
      throw new ApplicationError(ErrorCode.VALIDATION_ERROR, 'Custom service name, integer VND price and integer quantity are required', HttpStatus.BAD_REQUEST);
    }
    const { data, error } = await client.from('reservation_services').insert({ reservation_id: input.reservationId, service_id: input.serviceId ?? null, name_snapshot: name, unit_price_snapshot: unitPrice, quantity: input.quantity, total: unitPrice * input.quantity, note: input.note ?? null, created_by: actorId, updated_by: actorId }).select('id, reservation_id, service_id, name_snapshot, unit_price_snapshot, quantity, total, note, active').single<ReservationServiceRow>();
    if (error || !data) throw error ?? new Error('Reservation service insert returned no data');
    return this.mapReservationService(data);
  }

  async updateReservationService(accessToken: string, actorId: string, serviceId: string, input: ReservationServiceUpdateInput): Promise<ReservationServiceEntity> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).rpc('update_reservation_service', {
      p_service_id: serviceId,
      p_name: input.name,
      p_unit_price: input.unitPrice,
      p_quantity: input.quantity,
      p_note: input.note ?? null,
      p_actor_id: actorId,
    }).maybeSingle<ReservationServiceRow>();
    if (error?.code === 'P0002' || error?.message?.toLowerCase().includes('reservation service was not found')) {
      throw new ApplicationError(ErrorCode.SERVICE_NOT_FOUND, 'Reservation service was not found', HttpStatus.NOT_FOUND);
    }
    if (error?.message?.toLowerCase().includes('services can only be edited')) {
      throw new ApplicationError(ErrorCode.SERVICE_ONLY_CHECKED_IN, 'Services can only be edited for checked-in reservations', HttpStatus.CONFLICT);
    }
    if (error || !data) throw error ?? new ApplicationError(ErrorCode.INTERNAL_ERROR, 'Reservation service update returned no data', HttpStatus.INTERNAL_SERVER_ERROR);
    return this.mapReservationService(data);
  }

  async voidReservationService(accessToken: string, actorId: string, serviceId: string, reason: string): Promise<ReservationServiceEntity> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('reservation_services').update({ active: false, void_reason: reason, updated_by: actorId }).eq('id', serviceId).select('id, reservation_id, service_id, name_snapshot, unit_price_snapshot, quantity, total, note, active').single<ReservationServiceRow>();
    if (error || !data) throw error ?? new Error('Reservation service void returned no data');
    return this.mapReservationService(data);
  }

  private mapCatalog(row: CatalogRow): ServiceCatalogEntity { return { id: row.id, name: row.name, defaultPrice: row.default_price, active: row.active }; }
  private mapReservationService(row: ReservationServiceRow): ReservationServiceEntity { return { id: row.id, reservationId: row.reservation_id, serviceId: row.service_id, name: row.name_snapshot, unitPrice: row.unit_price_snapshot, quantity: row.quantity, total: row.total, note: row.note, active: row.active }; }
}
