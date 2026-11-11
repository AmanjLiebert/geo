import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { AuthContext } from './auth-context';
import { Permission } from './access-control';

export const PUBLIC_ENDPOINT_KEY = 'identity.public';
export const REQUIRED_PERMISSIONS_KEY = 'identity.permissions';
export const HIGH_RISK_ACTION_KEY = 'identity.high-risk';

export const Public = () => SetMetadata(PUBLIC_ENDPOINT_KEY, true);
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(REQUIRED_PERMISSIONS_KEY, permissions);
export const HighRiskAction = () => SetMetadata(HIGH_RISK_ACTION_KEY, true);

export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthContext =>
    context.switchToHttp().getRequest<{ auth: AuthContext }>().auth,
);
