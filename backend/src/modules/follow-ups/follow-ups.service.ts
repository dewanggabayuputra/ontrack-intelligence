import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFollowUpDto, UpdateFollowUpDto } from './follow-ups.dto';

@Injectable()
export class FollowUpsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(status?: string) {
    return this.prisma.followUp.findMany({
      where: status ? { status: status as any } : undefined,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        project: {
          select: {
            projectId: true,
            projectName: true,
          },
        },
      },
    });
  }

  async findByProject(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { OR: [{ id: projectId }, { projectId }] },
    });
    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return this.prisma.followUp.findMany({
      where: { projectId: project.id },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async create(data: CreateFollowUpDto) {
    const project = await this.prisma.project.findFirst({
      where: { OR: [{ id: data.projectId }, { projectId: data.projectId }] },
    });
    if (!project) {
      throw new NotFoundException(`Project ${data.projectId} not found`);
    }

    if (data.findingId) {
      const finding = await this.prisma.projectFinding.findUnique({
        where: { id: data.findingId },
        include: { assessment: true },
      });
      if (!finding) {
        throw new NotFoundException(`Finding ${data.findingId} not found`);
      }
      if (finding.assessment.projectId !== project.id) {
        throw new BadRequestException('Finding does not belong to the selected project');
      }
    }

    return this.prisma.followUp.create({
      data: {
        projectId: project.id,
        findingId: data.findingId || null,
        title: data.title.trim(),
        description: data.description.trim(),
        owner: data.owner?.trim() || null,
        status: data.status || 'OPEN',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      },
      include: {
        project: {
          select: { projectId: true, projectName: true },
        },
      },
    });
  }

  async getHistory(id: string) {
    const followUp = await this.prisma.followUp.findUnique({ where: { id } });
    if (!followUp) {
      throw new NotFoundException(`Follow-up ${id} not found`);
    }

    return this.prisma.followUpHistory.findMany({
      where: { followUpId: id },
      orderBy: { changedAt: 'desc' },
    });
  }

  async update(id: string, data: UpdateFollowUpDto) {
    const existing = await this.prisma.followUp.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Follow-up ${id} not found`);
    }

    const status = data.status;
    if (status && status !== existing.status && !data.notes?.trim()) {
      throw new BadRequestException('Notes are required when changing follow-up status');
    }
    const updated = await this.prisma.followUp.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(data.owner !== undefined ? { owner: data.owner } : {}),
        ...(data.dueDate !== undefined
          ? { dueDate: data.dueDate ? new Date(data.dueDate) : null }
          : {}),
        ...(status && status !== existing.status
          ? {
              closedAt: status === 'RESOLVED' || status === 'CLOSED' || status === 'CANCELLED'
                ? new Date()
                : null,
            }
          : {}),
      },
    });

    if (status && status !== existing.status) {
      await this.prisma.followUpHistory.create({
        data: {
          followUpId: id,
          fromStatus: existing.status,
          toStatus: status,
          changedBy: data.changedBy?.trim() || null,
          notes: data.notes?.trim() || null,
        },
      });
    }

    return updated;
  }
}
