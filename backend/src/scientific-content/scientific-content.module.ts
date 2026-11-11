import { Module } from '@nestjs/common';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';
import { SavedRecordsController } from './saved-records.controller';
import { ScientificStructureController } from './scientific-structure.controller';
import { ScientificStructureService } from './scientific-structure.service';
import { PublishingModule } from '../publishing/publishing.module';
import { MediaModule } from '../media/media.module';
import { PublicScientificContentController } from './public-scientific-content.controller';
import { PublicScientificContentService } from './public-scientific-content.service';

@Module({
  imports: [PublishingModule, MediaModule],
  controllers: [
    ScientificStructureController,
    RecordsController,
    SavedRecordsController,
    PublicScientificContentController,
  ],
  providers: [ScientificStructureService, RecordsService, PublicScientificContentService],
})
export class ScientificContentModule {}
