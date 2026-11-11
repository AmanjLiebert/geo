import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { Permission } from './access-control';
import { CurrentAuth, HighRiskAction, RequirePermissions } from './access.decorators';
import { AuthContext } from './auth-context';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  @RequirePermissions(Permission.MANAGE_USERS)
  list(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.users.listUsers(parseInteger(limit, 50), parseInteger(offset, 0));
  }

  @Get('invitations')
  @Header('Cache-Control', 'private, no-store')
  @RequirePermissions(Permission.MANAGE_INVITATIONS)
  listInvitations(@Query('limit') limit?: string, @Query('offset') offset?: string) {
    return this.users.listInvitations(parseInteger(limit, 50), parseInteger(offset, 0));
  }

  @Post('invitations')
  @RequirePermissions(Permission.MANAGE_INVITATIONS)
  @HighRiskAction()
  @RouteConfig({ rateLimit: { max: 20, timeWindow: 60_000 } })
  createInvitation(@CurrentAuth() auth: AuthContext, @Body() input: CreateInvitationDto) {
    return this.users.createInvitation(auth.user.id, input);
  }

  @Delete('invitations/:id')
  @RequirePermissions(Permission.MANAGE_INVITATIONS)
  @HighRiskAction()
  async revokeInvitation(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) invitationId: string,
  ): Promise<{ revoked: true }> {
    await this.users.revokeInvitation(auth.user.id, invitationId);
    return { revoked: true };
  }

  @Patch(':id/role')
  @RequirePermissions(Permission.MANAGE_USERS)
  @HighRiskAction()
  async updateRole(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() input: UpdateUserRoleDto,
  ): Promise<{ updated: true }> {
    await this.users.updateRole(auth.user.id, userId, input.role);
    return { updated: true };
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.MANAGE_USERS)
  @HighRiskAction()
  async updateStatus(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() input: UpdateUserStatusDto,
  ): Promise<{ updated: true }> {
    await this.users.updateStatus(auth.user.id, userId, input.status);
    return { updated: true };
  }
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}
