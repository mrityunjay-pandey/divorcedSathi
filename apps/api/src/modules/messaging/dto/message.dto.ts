import { IsString, MaxLength, MinLength } from "class-validator";

export class SendMessageDto {
  @IsString()
  @MinLength(1, { message: "Message can't be empty." })
  @MaxLength(4000)
  content!: string;
}
