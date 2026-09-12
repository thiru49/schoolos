import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { RequestAcl } from "../types/request-acl";

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<{ acl?: RequestAcl }>();
  return req.acl;
});
