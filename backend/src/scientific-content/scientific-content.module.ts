import { Module } from '@nestjs/common';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';
import { SavedRecordsController } from './saved-records.controller';
import { ScientificStructureController } from './scientific-structure.controller';
import { ScientificStructureService } from './scientific-structure.service';

@Module({
  controllers: [ScientificStructureController, RecordsController, SavedRecordsController],
  providers: [ScientificStructureService, RecordsService],
})
export class ScientificContentModule {}
