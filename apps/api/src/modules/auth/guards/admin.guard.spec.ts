import { ExecutionContext } from "@nestjs/common";
import { AdminGuard } from "./admin.guard";
import { AppException } from "@/common/errors/app-exception";

function contextWithUser(user: { sub: string; role: string } | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe("AdminGuard", () => {
  const guard = new AdminGuard();

  it("allows a request whose JWT role is ADMIN", () => {
    expect(guard.canActivate(contextWithUser({ sub: "admin-1", role: "ADMIN" }))).toBe(true);
  });

  it("rejects a regular USER role", () => {
    expect(() => guard.canActivate(contextWithUser({ sub: "user-1", role: "USER" }))).toThrow(AppException);
  });

  it("rejects a MODERATOR role — this guard is strictly ADMIN, not 'any staff'", () => {
    expect(() => guard.canActivate(contextWithUser({ sub: "mod-1", role: "MODERATOR" }))).toThrow(AppException);
  });

  it("rejects when no user is on the request at all (guard ordering mistake safety net)", () => {
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(AppException);
  });
});
