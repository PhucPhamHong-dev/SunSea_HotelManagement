type StandardFloorArea = 'elevator' | 'room-101' | 'room-102' | 'room-103' | 'room-104' | 'room-105';
type FourthFloorArea = 'elevator' | 'room-4a' | 'room-4b' | 'drying-area' | 'storage-area';

export type FloorLayoutItem =
  | { kind: 'elevator'; area: StandardFloorArea | FourthFloorArea }
  | { kind: 'room'; roomNumber: string; area: StandardFloorArea | FourthFloorArea }
  | { kind: 'facility'; label: 'Sân phơi' | 'Kho'; area: FourthFloorArea };

/** Fixed map geometry. Room state always comes from the Backend API. */
const standardFloorLayout: FloorLayoutItem[] = [
  { kind: 'room', roomNumber: '101', area: 'room-101' },
  { kind: 'room', roomNumber: '102', area: 'room-102' },
  { kind: 'room', roomNumber: '103', area: 'room-103' },
  { kind: 'room', roomNumber: '104', area: 'room-104' },
  { kind: 'room', roomNumber: '105', area: 'room-105' },
  { kind: 'elevator', area: 'elevator' },
];

const fourthFloorLayout: FloorLayoutItem[] = [
  { kind: 'room', roomNumber: '4B', area: 'room-4b' },
  { kind: 'facility', label: 'Sân phơi', area: 'drying-area' },
  { kind: 'elevator', area: 'elevator' },
  { kind: 'room', roomNumber: '4A', area: 'room-4a' },
  { kind: 'facility', label: 'Kho', area: 'storage-area' },
];

export function floorLayoutForFloor(floorNumber: number): FloorLayoutItem[] {
  if (floorNumber === 4) return fourthFloorLayout;
  return standardFloorLayout.map((item) => item.kind === 'room'
    ? { ...item, roomNumber: `${floorNumber}${item.roomNumber.slice(1)}` }
    : item);
}
