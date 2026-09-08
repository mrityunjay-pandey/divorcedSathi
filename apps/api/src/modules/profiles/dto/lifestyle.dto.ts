import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

const DIETS = ["VEGETARIAN", "NON_VEGETARIAN", "VEGAN", "EGGETARIAN", "PREFER_NOT_TO_SAY"] as const;
const HABIT_FREQUENCIES = ["NEVER", "OCCASIONALLY", "REGULARLY", "PREFER_NOT_TO_SAY"] as const;

export class UpsertLifestyleDto {
  @IsOptional()
  @IsIn(DIETS)
  diet?: (typeof DIETS)[number];

  @IsOptional()
  @IsIn(HABIT_FREQUENCIES)
  smoking?: (typeof HABIT_FREQUENCIES)[number];

  @IsOptional()
  @IsIn(HABIT_FREQUENCIES)
  drinking?: (typeof HABIT_FREQUENCIES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  fitnessRoutine?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  hobbies?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pets?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  travelFrequency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sleepSchedule?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  socialLifestyle?: string;
}
