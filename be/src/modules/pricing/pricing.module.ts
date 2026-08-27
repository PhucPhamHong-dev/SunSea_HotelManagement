import { Module } from '@nestjs/common';
import { PricingEngineService } from './application/services/pricing-engine.service';
import { StayClassifierService } from './application/services/stay-classifier.service';

@Module({ providers: [StayClassifierService, PricingEngineService], exports: [StayClassifierService, PricingEngineService] })
export class PricingModule {}
