import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { CsvParserService } from '../../common/services/csv-parser.service';
import { JsonParserService } from '../../common/services/json-parser.service';

@Module({
  controllers: [ImportsController],
  providers: [ImportsService, CsvParserService, JsonParserService],
  exports: [ImportsService],
})
export class ImportsModule {}
