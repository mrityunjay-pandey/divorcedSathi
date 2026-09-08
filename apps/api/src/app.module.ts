import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { AuthModule } from "./modules/auth/auth.module";
import { ProfilesModule } from "./modules/profiles/profiles.module";
import { FamilyModule } from "./modules/family/family.module";
import { PreferencesModule } from "./modules/preferences/preferences.module";
import { SearchModule } from "./modules/search/search.module";
import { DiscoveryModule } from "./modules/discovery/discovery.module";
import { InterestsModule } from "./modules/interests/interests.module";
import { MessagingModule } from "./modules/messaging/messaging.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { HealthController } from "./health.controller";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global baseline: 100 req/min per IP. Auth-sensitive endpoints get
    // tighter, endpoint-specific limits layered on top as those modules
    // (or a dedicated rate-limit module) are built out.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    AuthModule,
    ProfilesModule,
    FamilyModule,
    PreferencesModule,
    SearchModule,
    DiscoveryModule,
    InterestsModule,
    MessagingModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
