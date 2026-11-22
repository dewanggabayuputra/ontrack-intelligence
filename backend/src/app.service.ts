import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  }

  getInfo() {
    return {
      name: 'OnTrack Project Intelligence System',
      version: '1.0.0',
      description: 'Enterprise project intelligence platform',
      api: {
        version: 'v1',
        documentation: '/api/docs',
      },
      modules: [
        'projects',
        'imports',
        'evidence',
        'intelligence',
        'follow-ups',
      ],
    };
  }
}
