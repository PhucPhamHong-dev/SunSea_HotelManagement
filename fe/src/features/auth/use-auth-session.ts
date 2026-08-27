'use client';

import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '../../lib/auth/auth-service';

export function useCurrentUser() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: getCurrentUser,
    retry: false,
    staleTime: 60_000,
  });
}
