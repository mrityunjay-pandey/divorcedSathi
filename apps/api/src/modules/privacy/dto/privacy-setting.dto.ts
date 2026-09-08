import { IsBoolean, IsIn, IsOptional } from "class-validator";

const LEVELS = ["EVERYONE", "REGISTERED", "MATCHES", "APPROVED", "NOBODY"] as const;

export class UpdatePrivacySettingDto {
  @IsOptional()
  @IsIn(LEVELS)
  incomeVisibility?: (typeof LEVELS)[number];

  @IsOptional()
  @IsIn(LEVELS)
  contactVisibility?: (typeof LEVELS)[number];

  @IsOptional()
  @IsIn(LEVELS)
  divorceDetailsVisibility?: (typeof LEVELS)[number];

  @IsOptional()
  @IsIn(LEVELS)
  childrenDetailsVisibility?: (typeof LEVELS)[number];

  @IsOptional()
  @IsIn(LEVELS)
  photoVisibility?: (typeof LEVELS)[number];

  @IsOptional()
  @IsBoolean()
  requirePhotoRequestApproval?: boolean;

  @IsOptional()
  @IsBoolean()
  showLastActiveStatus?: boolean;

  @IsOptional()
  @IsBoolean()
  showOnlineStatus?: boolean;
}
