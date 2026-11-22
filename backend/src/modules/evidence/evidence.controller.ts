import { Controller, Get, Param } from '@nestjs/common';
import { EvidenceService } from './evidence.service';

@Controller('evidence')
export class EvidenceController {
  constructor(private readonly evidenceService: EvidenceService) {}

  @Get('project/:projectId')
  getProjectEvidence(@Param('projectId') projectId: string) {
    return this.evidenceService.getProjectEvidence(projectId);
  }
}
