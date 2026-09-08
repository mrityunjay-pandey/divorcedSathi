import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

const EMPLOYMENT_TYPES = ["SALARIED", "SELF_EMPLOYED", "BUSINESS_OWNER", "NOT_WORKING", "PREFER_NOT_TO_SAY"] as const;
const INCOME_RANGES = ["UNDER_5L", "L5_TO_10L", "L10_TO_20L", "L20_TO_50L", "ABOVE_50L", "PREFER_NOT_TO_SAY"] as const;

export class CreateProfileDto {
  @IsOptional()
  @IsInt()
  @Min(120)
  @Max(230)
  heightCm?: number;

  @IsString()
  city!: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  motherTongue?: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  community?: string;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType?: (typeof EMPLOYMENT_TYPES)[number];

  @IsOptional()
  @IsIn(INCOME_RANGES)
  incomeRange?: (typeof INCOME_RANGES)[number];
}

/** All fields optional on update — partial edits, per brief §51's "don't overwhelm users". */
export class UpdateProfileDto {
  @IsOptional()
  @IsInt()
  @Min(120)
  @Max(230)
  heightCm?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  motherTongue?: string;

  @IsOptional()
  @IsString()
  religion?: string;

  @IsOptional()
  @IsString()
  community?: string;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsIn(EMPLOYMENT_TYPES)
  employmentType?: (typeof EMPLOYMENT_TYPES)[number];

  @IsOptional()
  @IsIn(INCOME_RANGES)
  incomeRange?: (typeof INCOME_RANGES)[number];
}
