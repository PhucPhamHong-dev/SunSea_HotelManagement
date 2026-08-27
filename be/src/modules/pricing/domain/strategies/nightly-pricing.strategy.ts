import { ApplicationError } from '../../../../common/errors/application-error';
import { ErrorCode } from '../../../../common/errors/error-codes';
import type { PricingCharge, PricingInput } from '../pricing.types';

export class NightlyPricingStrategy {
  calculate(input: PricingInput, nights: number): PricingCharge[] {
    if (input.roomRateSnapshot === null || input.roomRateSnapshot === undefined) {
      throw new ApplicationError(ErrorCode.ROOM_PRICE_NOT_CONFIGURED, 'Room nightly rate is not configured', 422);
    }
    return [{
      chargeType: 'room_night',
      description: `${nights} night(s)`,
      quantity: nights,
      unitPrice: input.roomRateSnapshot,
      amount: nights * input.roomRateSnapshot,
    }];
  }
}
