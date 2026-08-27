'use client';

import type { Floor } from '../../lib/api/api-client';

export function FloorSelector({ floors, selectedId, onChange }: { floors: Floor[]; selectedId: string; onChange: (id: string) => void }) {
  return (
    <label className="floor-selector">
      Tầng
      <select value={selectedId} onChange={(event) => onChange(event.target.value)}>
        {floors.map((floor) => <option key={floor.id} value={floor.id}>{floor.name}</option>)}
      </select>
    </label>
  );
}
