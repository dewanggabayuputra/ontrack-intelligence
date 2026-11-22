import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { FollowUpStatus } from '@prisma/client';

export class CreateFollowUpDto {
  @IsNotEmpty()
  @IsString()
  projectId: string;

  @IsOptional()
  @IsString()
  findingId?: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  owner?: string;

  @IsOptional()
  @IsEnum(FollowUpStatus)
  status?: FollowUpStatus;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class UpdateFollowUpDto {
  @IsOptional()
  @IsEnum(FollowUpStatus)
  status?: FollowUpStatus;

  @IsOptional()
  @IsString()
  owner?: string | null;

  @IsOptional()
  @IsDateString()
  dueDate?: string | null;

  @IsOptional()
  @IsString()
  changedBy?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
