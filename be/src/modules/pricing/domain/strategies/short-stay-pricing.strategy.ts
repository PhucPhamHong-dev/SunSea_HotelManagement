import { ApplicationError } from '../../../../common/errors/application-error';
import { ErrorCode } from '../../../../common/errors/error-codes';
import type { PricingCharge, PricingInput, ShortStayRule } from '../pricing.types';

export class ShortStayPricingStrategy {
  calculate(input: PricingInput, rule: ShortStayRule): PricingCharge[] {
    const durationMinutes = Math.max(1, Math.ceil((new Date(input.checkOutAt).getTime() - new Date(input.checkInAt).getTime()) / 60_000));
    if (durationMinutes <= rule.baseDurationMinutes) {
      return [{
        chargeType: 'short_stay_base',
        description: `Short stay ${rule.baseDurationMinutes} minutes`,
        quantity: 1,
        unitPrice: rule.baseAmount,
        amount: rule.baseAmount,
      }];
    }
    if (rule.extraUnitAmount === null || rule.extraUnitAmount === undefined) {
      throw new ApplicationError(ErrorCode.PRICING_CONFIGURATION_REQUIRED, 'Short stay extra-hour pricing is not configured', 422);
    }
    const extraMinutes = durationMinutes - rule.baseDurationMinutes;
    const units = rule.roundingMode === 'FLOOR'
      ? Math.floor(extraMinutes / rule.extraUnitMinutes)
      : rule.roundingMode === 'PRORATE'
        ? extraMinutes / rule.extraUnitMinutes
        : Math.ceil(extraMinutes / rule.extraUnitMinutes);
    const charges: PricingCharge[] = [{
      chargeType: 'short_stay_base',
      description: `Short stay ${rule.baseDurationMinutes} minutes`,
      quantity: 1,
      unitPrice: rule.baseAmount,
      amount: rule.baseAmount,
    }];
    if (units > 0) {
      charges.push({
        chargeType: 'short_stay_extra',
        description: 'Short stay extra time',
        quantity: units,
        unitPrice: rule.extraUnitAmount,
        amount: units * rule.extraUnitAmount,
      });
    }
    return charges;
  }
}
