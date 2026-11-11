import { Module } from '@nestjs/common';
import { ScientificTrustController } from './scientific-trust.controller';
import { ScientificTrustService } from './scientific-trust.service';

@Module({
  controllers: [ScientificTrustController],
  providers: [ScientificTrustService],
  exports: [ScientificTrustService],
})
export class PublishingModule {}
