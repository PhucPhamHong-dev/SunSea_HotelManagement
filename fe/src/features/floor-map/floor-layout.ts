export type FloorLayoutItem =
  | { kind: 'elevator'; label: string; area: 'elevator' }
  | { kind: 'room'; roomNumber: string; area: 'room-101' | 'room-102' | 'room-103' | 'room-104' | 'room-105' };

/** Fixed visual geometry for the hotel floor map. Room state still comes from the Backend API. */
export const floorLayout: FloorLayoutItem[] = [
  { kind: 'room', roomNumber: '101', area: 'room-101' },
  { kind: 'room', roomNumber: '102', area: 'room-102' },
  { kind: 'room', roomNumber: '103', area: 'room-103' },
  { kind: 'room', roomNumber: '104', area: 'room-104' },
  { kind: 'room', roomNumber: '105', area: 'room-105' },
  { kind: 'elevator', label: 'Thang máy', area: 'elevator' },
];

export function roomNumberForFloor(floorNumber: number, template: FloorLayoutItem[] = floorLayout): FloorLayoutItem[] {
  return template.map((item) => item.kind === 'room'
    ? { ...item, roomNumber: `${floorNumber}${item.roomNumber.slice(1)}` }
    : item);
}
