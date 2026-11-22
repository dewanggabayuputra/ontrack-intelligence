import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.project.findMany({
      orderBy: { projectName: 'asc' },
    });
  }

  async findOne(projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: {
        OR: [
          { id: projectId },
          { projectId },
        ],
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${projectId} not found`);
    }

    return project;
  }
}
