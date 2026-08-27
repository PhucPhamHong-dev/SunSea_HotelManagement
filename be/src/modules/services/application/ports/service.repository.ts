export interface ServiceCatalogInput {
  name: string;
  defaultPrice: number;
}

export interface ServiceCatalogEntity extends ServiceCatalogInput {
  id: string;
  active: boolean;
}

export interface ReservationServiceInput {
  reservationId: string;
  serviceId?: string;
  name?: string;
  unitPrice?: number;
  quantity: number;
  note?: string;
}

export interface ReservationServiceUpdateInput {
  name: string;
  unitPrice: number;
  quantity: number;
  note?: string | null;
}

export interface ReservationServiceEntity {
  id: string;
  reservationId: string;
  serviceId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  total: number;
  note: string | null;
  active: boolean;
}

export interface ServiceRepository {
  listCatalog(accessToken: string): Promise<ServiceCatalogEntity[]>;
  createCatalog(accessToken: string, actorId: string, input: ServiceCatalogInput): Promise<ServiceCatalogEntity>;
  updateCatalog(accessToken: string, actorId: string, serviceId: string, input: Partial<ServiceCatalogInput>): Promise<ServiceCatalogEntity>;
  listReservationServices(accessToken: string, reservationId: string): Promise<ReservationServiceEntity[]>;
  addToReservation(accessToken: string, actorId: string, input: ReservationServiceInput): Promise<ReservationServiceEntity>;
  updateReservationService(accessToken: string, actorId: string, serviceId: string, input: ReservationServiceUpdateInput): Promise<ReservationServiceEntity>;
  voidReservationService(accessToken: string, actorId: string, serviceId: string, reason: string): Promise<ReservationServiceEntity>;
}
