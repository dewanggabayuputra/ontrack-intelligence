import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class EvidenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getProjectEvidence(projectId: string) {
    const [updates, production] = await Promise.all([
      this.prisma.projectUpdate.findMany({
        where: { projectId },
        orderBy: { timestamp: 'desc' },
      }),
      this.prisma.productionRecord.findMany({
        where: { projectId },
        orderBy: { timestamp: 'desc' },
      }),
    ]);

    return {
      projectId,
      updates,
      productionRecords: production,
      totalEvidence: updates.length + production.length,
    };
  }
}
