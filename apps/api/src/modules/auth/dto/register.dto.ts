import { IsEmail, IsIn, IsOptional, IsString, Matches, MinLength, ValidateIf } from "class-validator";

/**
 * Registration fields per brief §9. Deliberately minimal: gender, DOB, city,
 * and marriage status are collected here because the brief lists them under
 * "Registration", but anything beyond identity + credentials moves to the
 * Module 4 profile wizard rather than being force-collected up front.
 */
export class RegisterDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @ValidateIf((o: RegisterDto) => !o.mobileNumber)
  @IsEmail()
  email?: string;

  @ValidateIf((o: RegisterDto) => !o.email)
  @Matches(/^\+?[1-9]\d{7,14}$/, { message: "Enter a valid mobile number in international format." })
  mobileNumber?: string;

  @IsString()
  @MinLength(8, { message: "Password must be at least 8 characters." })
  password!: string;

  @IsIn(["male", "female", "other", "prefer_not_to_say"])
  gender!: "male" | "female" | "other" | "prefer_not_to_say";

  @IsString()
  dateOfBirth!: string; // ISO date; age-eligibility (18+) enforced in the service.

  @IsString()
  city!: string;

  @IsIn(["divorced"])
  marriageStatus!: "divorced"; // MVP scope is divorced-only, per brief §3/§9.

  @IsOptional()
  @IsString()
  lastName?: string;
}
