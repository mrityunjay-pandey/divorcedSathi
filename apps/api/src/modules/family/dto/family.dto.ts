import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

const CURRENT_YEAR = new Date().getFullYear();

export class UpsertPreviousMarriageDto {
  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(CURRENT_YEAR)
  marriedYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(CURRENT_YEAR)
  endedYear?: number;

  @IsOptional()
  @IsBoolean()
  divorceFinalized?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  additionalInfo?: string;
}

const CHILDREN_COUNTS = ["NONE", "ONE", "TWO", "THREE_OR_MORE"] as const;
const LIVING_ARRANGEMENTS = ["WITH_ME", "WITH_OTHER_PARENT", "SHARED", "OTHER"] as const;

export class UpsertFamilyDetailsDto {
  @IsIn(CHILDREN_COUNTS)
  childrenCount!: (typeof CHILDREN_COUNTS)[number];

  @IsOptional()
  @IsIn(LIVING_ARRANGEMENTS)
  childrenLivingArrangement?: (typeof LIVING_ARRANGEMENTS)[number];
}
