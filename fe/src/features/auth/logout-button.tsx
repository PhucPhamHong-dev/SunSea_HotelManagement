'use client';

import { useLogout } from './use-logout';

export function LogoutButton() {
  const logout = useLogout();
  return <button type="button" className="logout-button" onClick={() => logout.mutate()} disabled={logout.isPending}>{logout.isPending ? 'Đang thoát…' : 'Đăng xuất'}</button>;
}
