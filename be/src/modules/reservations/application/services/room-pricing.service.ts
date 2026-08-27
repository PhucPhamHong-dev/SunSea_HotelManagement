import { Injectable } from '@nestjs/common';

@Injectable()
export class RoomPricingService {
  calculate(roomPrice: number, nights: number): number {
    if (roomPrice < 0 || nights < 0) throw new Error('Price and nights must be non-negative');
    return roomPrice * nights;
  }
}
