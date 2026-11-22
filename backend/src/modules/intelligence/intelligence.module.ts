import { Module } from '@nestjs/common';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';
import { ScheduleHealthCalculator } from './health-calculators/schedule-health.calculator';
import { ProgressHealthCalculator } from './health-calculators/progress-health.calculator';
import { OperationalHealthCalculator } from './health-calculators/operational-health.calculator';
import { EvidenceHealthCalculator } from './health-calculators/evidence-and-quality.calculator';
import { AssessmentScoringService } from './services/assessment-scoring.service';
import { EvidenceAnalyzerService } from './services/evidence-analyzer.service';
import { FollowUpGeneratorService } from './services/followup-generator.service';

@Module({
  controllers: [IntelligenceController],
  providers: [
    IntelligenceService,
    ScheduleHealthCalculator,
    ProgressHealthCalculator,
    OperationalHealthCalculator,
    EvidenceHealthCalculator,
    AssessmentScoringService,
    EvidenceAnalyzerService,
    FollowUpGeneratorService,
  ],
  exports: [IntelligenceService, AssessmentScoringService, EvidenceAnalyzerService, FollowUpGeneratorService],
})
export class IntelligenceModule {}
