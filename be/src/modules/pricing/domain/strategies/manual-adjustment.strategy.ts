import type { PricingCharge } from '../pricing.types';

export class ManualAdjustmentStrategy {
  calculate(amount: number): PricingCharge[] {
    return [{
      chargeType: 'manual_adjustment',
      description: 'Manual pricing adjustment',
      quantity: 1,
      unitPrice: amount,
      amount,
    }];
  }
}
