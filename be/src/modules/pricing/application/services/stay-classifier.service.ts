import { Injectable } from '@nestjs/common';
import type { BillingMode } from '../../domain/pricing.types';

export interface StayClassification {
  billingMode: BillingMode;
  localCheckInDate: string;
  localCheckOutDate: string;
  durationMinutes: number;
  nights: number;
}

@Injectable()
export class StayClassifierService {
  private readonly timezone = process.env.APP_TIMEZONE ?? 'Asia/Ho_Chi_Minh';

  classify(checkInAt: string, checkOutAt: string): StayClassification {
    const checkIn = new Date(checkInAt);
    const checkOut = new Date(checkOutAt);
    const durationMinutes = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 60_000);
    const localCheckInDate = this.localDate(checkIn);
    const localCheckOutDate = this.localDate(checkOut);
    const dateDifference = this.calendarDayDifference(localCheckInDate, localCheckOutDate);
    const billingMode: BillingMode = dateDifference === 0
      ? 'SHORT_STAY'
      : dateDifference > 0
        ? 'NIGHTLY'
        : 'MANUAL_REVIEW';
    return { billingMode, localCheckInDate, localCheckOutDate, durationMinutes, nights: Math.max(0, dateDifference) };
  }

  private localDate(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  private calendarDayDifference(from: string, to: string): number {
    const fromUtc = Date.parse(`${from}T00:00:00Z`);
    const toUtc = Date.parse(`${to}T00:00:00Z`);
    return Math.round((toUtc - fromUtc) / 86_400_000);
  }
}
