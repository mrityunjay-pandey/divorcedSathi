import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const REASONS = [
  "FAKE_PROFILE",
  "SCAM",
  "HARASSMENT",
  "ABUSE",
  "INAPPROPRIATE_CONTENT",
  "MISREPRESENTATION",
  "SOLICITATION",
  "FINANCIAL_SCAM",
  "OTHER",
] as const;

export class CreateReportDto {
  @IsString()
  reportedUserId!: string;

  @IsIn(REASONS)
  reason!: (typeof REASONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class BlockUserDto {
  @IsString()
  targetUserId!: string;
}
