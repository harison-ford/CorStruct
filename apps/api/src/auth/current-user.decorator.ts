import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { CurrentUser as AuthUser } from "./current-user";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return req.user;
  },
);
