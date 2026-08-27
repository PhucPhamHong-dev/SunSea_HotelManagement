export interface GuestInput {
  fullName: string;
  phone?: string;
  idNumber?: string;
  dateOfBirth?: string;
  idIssuedDate?: string;
  address?: string;
  note?: string;
}

export interface GuestEntity extends GuestInput {
  id: string;
  active: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GuestRepository {
  list(accessToken: string, search?: string): Promise<GuestEntity[]>;
  findById(accessToken: string, guestId: string): Promise<GuestEntity | null>;
  create(accessToken: string, actorId: string, input: GuestInput): Promise<GuestEntity>;
  update(accessToken: string, actorId: string, guestId: string, input: Partial<GuestInput>): Promise<GuestEntity>;
  deactivate(accessToken: string, actorId: string, guestId: string): Promise<GuestEntity>;
}
