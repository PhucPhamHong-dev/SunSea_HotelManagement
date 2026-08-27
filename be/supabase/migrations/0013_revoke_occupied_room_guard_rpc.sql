-- Supabase grants EXECUTE on new public functions to API roles through its
-- default privileges. This function is a trigger implementation, not an RPC
-- contract, so remove every direct-call grant explicitly.
revoke execute on function public.prevent_reservation_on_occupied_room() from public, anon, authenticated, service_role;
