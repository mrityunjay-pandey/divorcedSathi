import { IsIn, IsString, Length, ValidateIf } from "class-validator";

export class VerifyOtpDto {
  @ValidateIf((o: VerifyOtpDto) => !o.mobileNumber)
  @IsString()
  email?: string;

  @ValidateIf((o: VerifyOtpDto) => !o.email)
  @IsString()
  mobileNumber?: string;

  @IsIn(["EMAIL", "MOBILE"])
  identifierType!: "EMAIL" | "MOBILE";

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class ResendOtpDto {
  @ValidateIf((o: ResendOtpDto) => !o.mobileNumber)
  @IsString()
  email?: string;

  @ValidateIf((o: ResendOtpDto) => !o.email)
  @IsString()
  mobileNumber?: string;

  @IsIn(["EMAIL", "MOBILE"])
  identifierType!: "EMAIL" | "MOBILE";
}

export class LoginDto {
  @ValidateIf((o: LoginDto) => !o.mobileNumber)
  @IsString()
  email?: string;

  @ValidateIf((o: LoginDto) => !o.email)
  @IsString()
  mobileNumber?: string;

  @IsString()
  password!: string;
}

export class RefreshDto {
  @IsString()
  refreshToken!: string;
}
