import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { SearchService } from "./search.service";
import { SearchProfilesQueryDto } from "./dto/search-profiles.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/session.service";

@UseGuards(JwtAuthGuard)
@Controller("search")
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get("profiles")
  async searchProfiles(@CurrentUser() user: AccessTokenPayload, @Query() query: SearchProfilesQueryDto) {
    const result = await this.search.search(user.sub, query);
    return { success: true, data: result };
  }
}
