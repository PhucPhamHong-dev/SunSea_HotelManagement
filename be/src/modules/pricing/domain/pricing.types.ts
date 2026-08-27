export type BillingMode = 'SHORT_STAY' | 'NIGHTLY' | 'MANUAL_REVIEW';
export type RoundingMode = 'CEIL' | 'FLOOR' | 'PRORATE';

export interface ShortStayRule {
  baseDurationMinutes: number;
  baseAmount: number;
  extraUnitMinutes: number;
  extraUnitAmount: number | null;
  roundingMode: RoundingMode;
}

export interface PricingInput {
  checkInAt: string;
  checkOutAt: string;
  roomRateSnapshot: number | null;
  standardCheckOutTime?: string;
  shortStayRule?: ShortStayRule;
  manualAdjustment?: number;
}

export interface PricingCharge {
  chargeType: 'room_night' | 'short_stay_base' | 'short_stay_extra' | 'late_checkout' | 'manual_adjustment';
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PricingResult {
  billingMode: BillingMode;
  durationMinutes: number;
  nights: number;
  lateCheckout: boolean;
  requiresManualReview: boolean;
  roomAmount: number;
  total: number;
  charges: PricingCharge[];
}
