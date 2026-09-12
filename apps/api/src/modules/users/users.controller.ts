import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { RequestAcl } from "../../common/types/request-acl";
import { UsersService } from "./users.service";

@Controller("me")
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  me(@CurrentUser() acl: RequestAcl) {
    return this.users.me(acl);
  }

  @Get("acl")
  acl(@CurrentUser() acl: RequestAcl) {
    return this.users.acl(acl);
  }

  @Get("children")
  children(@CurrentUser() acl: RequestAcl) {
    return this.users.children(acl);
  }

  @Post("children/select")
  selectChild(@CurrentUser() acl: RequestAcl, @Body() body: unknown) {
    return this.users.selectChild(acl, body);
  }
}
