import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetCurrentUser = createParamDecorator(
  (_data: never, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);