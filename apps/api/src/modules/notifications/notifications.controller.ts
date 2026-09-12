import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { RequestAcl } from "../../common/types/request-acl";
import { NotificationsService } from "./notifications.service";

@Controller()
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get("notifications")
  list(@CurrentUser() acl: RequestAcl) {
    return this.notifications.listMine(acl);
  }

  @Patch("notifications/:id/read")
  markRead(@CurrentUser() acl: RequestAcl, @Param("id") id: string) {
    return this.notifications.markRead(acl, id);
  }

  @Post("me/push-token")
  saveToken(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.notifications.savePushToken(acl, body);
  }
}
