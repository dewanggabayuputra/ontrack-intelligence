import { Controller, Body, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { FollowUpsService } from './follow-ups.service';
import { CreateFollowUpDto, UpdateFollowUpDto } from './follow-ups.dto';

@Controller('follow-ups')
export class FollowUpsController {
  constructor(private readonly followUpsService: FollowUpsService) {}

  @Get()
  findAll(@Query('status') status?: string) {
    return this.followUpsService.findAll(status);
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId') projectId: string) {
    return this.followUpsService.findByProject(projectId);
  }

  @Post()
  create(@Body() data: CreateFollowUpDto) {
    return this.followUpsService.create(data);
  }

  @Get(':id/history')
  getHistory(@Param('id') id: string) {
    return this.followUpsService.getHistory(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() data: UpdateFollowUpDto) {
    return this.followUpsService.update(id, data);
  }

  @Put(':id')
  replace(@Param('id') id: string, @Body() data: UpdateFollowUpDto) {
    return this.followUpsService.update(id, data);
  }
}
