import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

function toArray({ value }: { value: unknown }): unknown {
  if (value === undefined) return undefined;
  return Array.isArray(value) ? value : [value];
}

const GENDERS = ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"] as const;
const MARRIAGE_STATUSES = ["DIVORCED", "WIDOWED", "SEPARATED", "ANNULLED"] as const;
const CHILDREN_COUNTS = ["NONE", "ONE", "TWO", "THREE_OR_MORE"] as const;

/**
 * Query-string values arrive as strings; `@Type(() => Number)` +
 * ValidationPipe's `transform: true` (set globally in main.ts) coerce them
 * before validation runs. Array-valued filters (gender, marriageStatus,
 * childrenCount) accept either a single value or a comma-free repeated
 * query param (`?gender=MALE&gender=FEMALE`) per standard Express/Nest
 * query parsing — a CSV-splitting layer isn't needed here the way it is in
 * the wizard's plain-text inputs.
 */
export class SearchProfilesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(18)
  minAge?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(100)
  maxAge?: number;

  @IsOptional()
  @IsIn(GENDERS)
  gender?: (typeof GENDERS)[number];

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
  @Type(() => Number)
  @IsInt()
  minHeightCm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxHeightCm?: number;

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsIn(MARRIAGE_STATUSES, { each: true })
  marriageStatus?: (typeof MARRIAGE_STATUSES)[number][];

  @IsOptional()
  @Transform(toArray)
  @IsArray()
  @IsIn(CHILDREN_COUNTS, { each: true })
  childrenCount?: (typeof CHILDREN_COUNTS)[number][];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  willingToRelocate?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
