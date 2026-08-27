'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '../../lib/auth/auth-service';
import { ApiError } from '../../lib/api/api-error';

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authService.login({ username, password });
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng nhập thất bại.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="login-card" onSubmit={onSubmit}>
      <div>
        <p className="eyebrow">SUNSEA HOTEL</p>
        <h1>Đăng nhập hệ thống</h1>
        <p className="muted">Kết nối dữ liệu phòng từ backend trung tâm.</p>
      </div>
      <label>
        Tên đăng nhập
        <input type="text" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required />
      </label>
      <label>
        Mật khẩu
        <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-button" type="submit" disabled={loading}>
        {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </button>
    </form>
  );
}
