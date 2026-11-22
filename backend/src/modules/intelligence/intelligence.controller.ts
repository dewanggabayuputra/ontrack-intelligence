import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';
import { AssessmentRequestDto, ProjectAssessmentResponseDto } from '@common/dto/assessment.dto';

@Controller('intelligence')
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  /**
   * Run assessment for a project
   * POST /api/v1/intelligence/assess/:projectId
   */
  @Post('assess/:projectId')
  async assessProject(
    @Param('projectId') projectId: string,
    @Body() request?: AssessmentRequestDto,
  ): Promise<ProjectAssessmentResponseDto> {
    return this.intelligenceService.assessProject(projectId, request?.asOfDate);
  }

  /**
   * Get latest assessment for project
   * GET /api/v1/intelligence/assessment/:projectId
   */
  @Get('assessment/:projectId')
  async getLatestAssessment(@Param('projectId') projectId: string): Promise<ProjectAssessmentResponseDto> {
    return this.intelligenceService.getLatestAssessment(projectId);
  }

  /**
   * Get assessment history for project
   * GET /api/v1/intelligence/history/:projectId
   */
  @Get('history/:projectId')
  async getAssessmentHistory(
    @Param('projectId') projectId: string,
    @Query('limit') limit: string = '10',
  ): Promise<ProjectAssessmentResponseDto[]> {
    return this.intelligenceService.getAssessmentHistory(projectId, parseInt(limit));
  }

  /**
   * Get follow-up recommendations for project
   * GET /api/v1/intelligence/followups/:projectId
   */
  @Get('followups/:projectId')
  async getFollowUpRecommendations(@Param('projectId') projectId: string): Promise<any> {
    return this.intelligenceService.getFollowUpRecommendations(projectId);
  }

  /**
   * Get dashboard summary for all projects
   * GET /api/v1/intelligence/dashboard/summary
   */
  @Get('dashboard/summary')
  async getDashboardSummary(): Promise<any> {
    return this.intelligenceService.getDashboardSummary();
  }
}
