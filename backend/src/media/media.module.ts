import { Module } from '@nestjs/common';
import { JobsModule } from '../jobs/jobs.module';
import { MediaController } from './media.controller';
import { MediaProcessorService } from './media-processor.service';
import { MediaService } from './media.service';

@Module({
  imports: [JobsModule],
  controllers: [MediaController],
  providers: [MediaService, MediaProcessorService],
  exports: [MediaService, MediaProcessorService],
})
export class MediaModule {}
