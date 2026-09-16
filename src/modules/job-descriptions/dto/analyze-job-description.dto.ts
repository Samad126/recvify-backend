import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class AnalyzeJobDescriptionDto {
  @ApiProperty({
    description:
      'Full job posting text to tailor this CV against. Only pasted text is supported for now — file/URL ingestion is planned.',
    example:
      'We are looking for a Senior Frontend Engineer with 5+ years of React experience, strong TypeScript skills, and familiarity with CI/CD pipelines...',
    minLength: 50,
    maxLength: 20000,
  })
  @IsString()
  @MinLength(50, { message: 'rawText must be at least 50 characters — paste the full job description' })
  @MaxLength(20000)
  rawText: string;
}
