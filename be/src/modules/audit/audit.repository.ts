import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../infrastructure/supabase/supabase.service';

@Injectable()
export class AuditRepository {
  constructor(private readonly supabase: SupabaseService) {}

  async list(accessToken: string, entity?: string) {
    let query = this.supabase.getPublicClient(accessToken).from('audit_logs').select('id, actor_id, action, entity, entity_id, before_data, after_data, request_id, created_at').order('created_at', { ascending: false }).limit(100);
    if (entity) query = query.eq('entity', entity);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  }
}
