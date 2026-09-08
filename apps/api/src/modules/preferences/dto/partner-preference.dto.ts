import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

const INCOME_RANGES = ["UNDER_5L", "L5_TO_10L", "L10_TO_20L", "L20_TO_50L", "ABOVE_50L", "PREFER_NOT_TO_SAY"] as const;
const MARRIAGE_STATUSES = ["DIVORCED", "WIDOWED", "SEPARATED", "ANNULLED"] as const;
const CHILDREN_PREFERENCES = ["NO_CHILDREN", "HAS_CHILDREN", "OPEN_TO_EITHER"] as const;

export class UpsertPartnerPreferenceDto {
  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(100)
  ageMin?: number;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(100)
  ageMax?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredStates?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredCountries?: string[];

  @IsOptional()
  @IsBoolean()
  willingToRelocate?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredEducation?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredProfessions?: string[];

  @IsOptional()
  @IsIn(INCOME_RANGES)
  minIncomeRange?: (typeof INCOME_RANGES)[number];

  @IsOptional()
  @IsArray()
  @IsIn(MARRIAGE_STATUSES, { each: true })
  previousMarriagePreferences?: (typeof MARRIAGE_STATUSES)[number][];

  @IsOptional()
  @IsBoolean()
  openToAnyMarriageStatus?: boolean;

  @IsOptional()
  @IsIn(CHILDREN_PREFERENCES)
  childrenPreference?: (typeof CHILDREN_PREFERENCES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  lifestylePreferences?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  otherPreferences?: string;
}
