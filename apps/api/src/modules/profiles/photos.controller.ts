import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { PhotosService } from "./photos.service";
import { AddPhotoDto } from "./dto/photo.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

@UseGuards(JwtAuthGuard)
@Controller("profiles/me/photos")
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Get()
  async list(@CurrentUser() user: AccessTokenPayload) {
    const photos = await this.photos.list(user.sub);
    return { success: true, data: { photos } };
  }

  @Post()
  async add(@CurrentUser() user: AccessTokenPayload, @Body() dto: AddPhotoDto) {
    const photo = await this.photos.add(user.sub, dto);
    return { success: true, data: { photo } };
  }

  @Post(":id/primary")
  async setPrimary(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    const photo = await this.photos.setPrimary(user.sub, id);
    return { success: true, data: { photo } };
  }

  @Delete(":id")
  async remove(@CurrentUser() user: AccessTokenPayload, @Param("id") id: string) {
    await this.photos.remove(user.sub, id);
    return { success: true, data: null };
  }
}
