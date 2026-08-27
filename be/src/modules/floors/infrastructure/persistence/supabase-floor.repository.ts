import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../../infrastructure/supabase/supabase.service';
import type { FloorRepository } from '../../application/ports/floor.repository';
import type { FloorEntity } from '../../domain/entities/floor.entity';

interface FloorRow {
  id: string;
  floor_number: number;
  name: string;
}

@Injectable()
export class SupabaseFloorRepository implements FloorRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async list(accessToken: string): Promise<FloorEntity[]> {
    const { data, error } = await this.supabase
      .getPublicClient(accessToken)
      .from('floors')
      .select('id, floor_number, name')
      .order('floor_number', { ascending: true })
      .returns<FloorRow[]>();
    if (error) throw error;
    return (data ?? []).map((row) => ({ id: row.id, floorNumber: row.floor_number, name: row.name }));
  }

  async findById(accessToken: string, floorId: string): Promise<FloorEntity | null> {
    const { data, error } = await this.supabase.getPublicClient(accessToken).from('floors').select('id, floor_number, name').eq('id', floorId).maybeSingle<FloorRow>();
    if (error) throw error;
    return data ? { id: data.id, floorNumber: data.floor_number, name: data.name } : null;
  }
}
