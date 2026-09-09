import { IsOptional, IsString, MaxLength } from "class-validator";

export class AddPhotoDto {
  @IsString()
  storageKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;
}
