export interface StayRange {
  checkIn: string;
  checkOut: string;
}

export function isValidStayRange(range: StayRange): boolean {
  return range.checkIn < range.checkOut;
}

export function overlaps(left: StayRange, right: StayRange): boolean {
  return left.checkIn < right.checkOut && right.checkIn < left.checkOut;
}
