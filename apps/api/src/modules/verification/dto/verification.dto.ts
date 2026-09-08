import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class SubmitIdVerificationDto {
  @IsString()
  @MinLength(1)
  documentStorageKey!: string;
}

export class RejectVerificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
