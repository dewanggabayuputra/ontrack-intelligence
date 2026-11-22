import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
  Param,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportsService } from './imports.service';

@Controller('imports')
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  /**
   * Import Project Master CSV
   * POST /api/v1/imports/project-master
   */
  @Post('project-master')
  @UseInterceptors(FileInterceptor('file'))
  async importProjectMaster(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be CSV format');
    }

    return this.importsService.importProjectMaster(file.buffer, file.originalname);
  }

  /**
   * Import Project Updates CSV
   * POST /api/v1/imports/project-updates
   */
  @Post('project-updates')
  @UseInterceptors(FileInterceptor('file'))
  async importProjectUpdates(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.originalname.endsWith('.csv')) {
      throw new BadRequestException('File must be CSV format');
    }

    return this.importsService.importProjectUpdates(file.buffer, file.originalname);
  }

  /**
   * Import Production Data JSON
   * POST /api/v1/imports/production-data
   */
  @Post('production-data')
  @UseInterceptors(FileInterceptor('file'))
  async importProductionData(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!file.originalname.endsWith('.json')) {
      throw new BadRequestException('File must be JSON format');
    }

    return this.importsService.importProductionData(file.buffer, file.originalname);
  }

  @Post('data-dictionary')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async uploadDataDictionary(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.importsService.uploadDataDictionaryPdf(file.buffer, file.originalname);
  }

  @Get('data-dictionary/:id/file')
  downloadDataDictionary(@Param('id') id: string): Promise<StreamableFile> {
    return this.importsService.getDataDictionaryPdf(id);
  }

  /**
   * Get import history
   * GET /api/v1/imports/history
   */
  @Get('history')
  async getImportHistory(
    @Query('limit') limit?: string,
  ) {
    return this.importsService.getImportHistory(limit ? parseInt(limit) : 50);
  }
}
