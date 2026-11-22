import * as crypto from 'crypto';

/**
 * Generate SHA-256 hash of file content
 * Used for detecting duplicate imports
 */
export function hashFileContent(content: Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Generate unique source ID from project + timestamp
 */
export function generateSourceId(projectId: string, timestamp: Date): string {
  const data = `${projectId}-${timestamp.getTime()}`;
  return crypto.createHash('md5').update(data).digest('hex');
}
