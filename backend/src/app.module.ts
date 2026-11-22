import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { ImportsModule } from './modules/imports/imports.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { IntelligenceModule } from './modules/intelligence/intelligence.module';
import { FollowUpsModule } from './modules/follow-ups/follow-ups.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Core
    PrismaModule,
    
    // Domain Modules
    ProjectsModule,
    ImportsModule,
    EvidenceModule,
    IntelligenceModule,
    FollowUpsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
