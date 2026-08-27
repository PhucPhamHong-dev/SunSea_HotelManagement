import { Injectable } from '@nestjs/common';
import { ApplicationError } from '../../../../common/errors/application-error';
import { ErrorCode } from '../../../../common/errors/error-codes';
import { ManualAdjustmentStrategy } from '../../domain/strategies/manual-adjustment.strategy';
import { NightlyPricingStrategy } from '../../domain/strategies/nightly-pricing.strategy';
import { ShortStayPricingStrategy } from '../../domain/strategies/short-stay-pricing.strategy';
import type { PricingInput, PricingResult, ShortStayRule } from '../../domain/pricing.types';
import { StayClassifierService } from './stay-classifier.service';

const DEFAULT_SHORT_STAY_RULE: ShortStayRule = {
  baseDurationMinutes: 120,
  baseAmount: 250_000,
  extraUnitMinutes: 60,
  extraUnitAmount: null,
  roundingMode: 'CEIL',
};

@Injectable()
export class PricingEngineService {
  constructor(private readonly classifier: StayClassifierService) {}

  calculate(input: PricingInput): PricingResult {
    const classification = this.classifier.classify(input.checkInAt, input.checkOutAt);
    if (classification.durationMinutes <= 0) {
      throw new ApplicationError(ErrorCode.VALIDATION_ERROR, 'Check-out must be after check-in', 400);
    }
    const lateCheckout = this.isLateCheckout(input.checkOutAt, input.standardCheckOutTime ?? '12:00');
    const charges = classification.billingMode === 'NIGHTLY'
      ? new NightlyPricingStrategy().calculate(input, classification.nights)
      : classification.billingMode === 'SHORT_STAY'
        ? new ShortStayPricingStrategy().calculate(input, input.shortStayRule ?? DEFAULT_SHORT_STAY_RULE)
        : input.manualAdjustment !== undefined
          ? new ManualAdjustmentStrategy().calculate(input.manualAdjustment)
          : [];
    if (classification.billingMode === 'MANUAL_REVIEW' && input.manualAdjustment === undefined) {
      throw new ApplicationError(ErrorCode.PRICING_CONFIGURATION_REQUIRED, 'Stay requires manual pricing review', 422);
    }
    const roomAmount = charges.reduce((total, charge) => total + charge.amount, 0);
    return {
      billingMode: classification.billingMode,
      durationMinutes: classification.durationMinutes,
      nights: classification.billingMode === 'NIGHTLY' ? classification.nights : 0,
      lateCheckout,
      requiresManualReview: classification.billingMode === 'MANUAL_REVIEW',
      roomAmount,
      total: roomAmount,
      charges,
    };
  }

  /**
   * Pricing for a stay whose checkout has not been declared. The first night
   * is charged immediately at check-in. Every following night is added only
   * at 17:00 in the hotel timezone, so this is intentionally calculated live
   * instead of persisted as a daily background charge.
   */
  calculateOpenStay(checkInAt: string, amountAsOf: string, roomRateSnapshot: number | null): PricingResult {
    const checkIn = new Date(checkInAt);
    const asOf = new Date(amountAsOf);
    const durationMinutes = Math.ceil((asOf.getTime() - checkIn.getTime()) / 60_000);
    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(asOf.getTime()) || durationMinutes < 0) {
      throw new ApplicationError(ErrorCode.VALIDATION_ERROR, 'Open-stay pricing requires an instant after check-in', 400);
    }

    const nights = this.openStayNights(checkIn, asOf);
    const input: PricingInput = {
      checkInAt,
      checkOutAt: amountAsOf,
      roomRateSnapshot,
    };
    const charges = new NightlyPricingStrategy().calculate(input, nights);
    const roomAmount = charges.reduce((total, charge) => total + charge.amount, 0);
    return {
      billingMode: 'NIGHTLY',
      durationMinutes,
      nights,
      lateCheckout: false,
      requiresManualReview: false,
      roomAmount,
      total: roomAmount,
      charges,
    };
  }

  private openStayNights(checkIn: Date, asOf: Date): number {
    const checkInLocal = this.localParts(checkIn);
    const asOfLocal = this.localParts(asOf);
    const startDay = Date.parse(`${checkInLocal.date}T00:00:00Z`);
    const currentDay = Date.parse(`${asOfLocal.date}T00:00:00Z`);
    const calendarDays = Math.round((currentDay - startDay) / 86_400_000);
    if (calendarDays <= 0) return 1;
    const hasPassedDailyCutoff = asOfLocal.hour > 17 || (asOfLocal.hour === 17 && asOfLocal.minute >= 0);
    return 1 + Math.max(0, calendarDays - (hasPassedDailyCutoff ? 0 : 1));
  }

  private localParts(value: Date): { date: string; hour: number; minute: number } {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: process.env.APP_TIMEZONE ?? 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(value).reduce<Record<string, string>>((result, part) => {
      result[part.type] = part.value;
      return result;
    }, {});
    return {
      date: `${parts.year}-${parts.month}-${parts.day}`,
      hour: Number(parts.hour),
      minute: Number(parts.minute),
    };
  }

  private isLateCheckout(checkOutAt: string, standardTime: string): boolean {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: process.env.APP_TIMEZONE ?? 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    const [hour = 0, minute = 0] = formatter.format(checkOutAt ? new Date(checkOutAt) : new Date()).split(':').map(Number);
    const [standardHour = 0, standardMinute = 0] = standardTime.split(':').map(Number);
    return hour * 60 + minute > standardHour * 60 + standardMinute;
  }
}
