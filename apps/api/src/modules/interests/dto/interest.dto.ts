import { IsIn, IsString } from "class-validator";

export class SendInterestDto {
  @IsString()
  recipientId!: string;
}

export class RespondInterestDto {
  @IsIn(["ACCEPTED", "DECLINED"])
  response!: "ACCEPTED" | "DECLINED";
}
