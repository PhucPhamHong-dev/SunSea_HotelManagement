export function ErrorState({ message = 'Không thể tải dữ liệu.' }: { message?: string }) {
  return <div className="state-card state-card--error">{message}</div>;
}
