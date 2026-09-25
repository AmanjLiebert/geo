import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccessGuard } from './access.guard';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ExternalIdentityEntity } from './entities/external-identity.entity';
import { IdentityInvitationEntity } from './entities/identity-invitation.entity';
import { PermissionEntity } from './entities/permission.entity';
import { RolePermissionEntity } from './entities/role-permission.entity';
import { SecurityAuditEventEntity } from './entities/security-audit-event.entity';
import { UserSessionEntity } from './entities/user-session.entity';
import { UserEntity } from './entities/user.entity';
import { FirebaseIdentityTokenVerifier } from './firebase-identity-token-verifier.service';
import { IDENTITY_TOKEN_VERIFIER } from './identity-token-verifier';
import { SecurityAuditService } from './security-audit.service';
import { SessionService } from './session.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

const entities = [
  UserEntity,
  ExternalIdentityEntity,
  UserSessionEntity,
  PermissionEntity,
  RolePermissionEntity,
  IdentityInvitationEntity,
  SecurityAuditEventEntity,
];

@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  controllers: [AuthController, UsersController],
  providers: [
    FirebaseIdentityTokenVerifier,
    { provide: IDENTITY_TOKEN_VERIFIER, useExisting: FirebaseIdentityTokenVerifier },
    AuthService,
    SessionService,
    UsersService,
    SecurityAuditService,
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
  exports: [SessionService],
})
export class IdentityModule {}
