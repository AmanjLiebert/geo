import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Permission } from '../identity/access-control';
import { CurrentAuth, RequirePermissions } from '../identity/access.decorators';
import { AuthContext } from '../identity/auth-context';
import { AddEvidenceDto, CreateReferenceDto, UpdateReferenceDto } from './dto/reference.dto';
import { CreateLocationDto } from './dto/location.dto';
import { CreateRelationshipDto } from './dto/relationship.dto';
import { ScientificTrustService } from './scientific-trust.service';
import { CreateMapLayerDto } from './dto/map-layer.dto';
import { ReferenceListQueryDto } from './dto/reference-list-query.dto';

@Controller()
@RequirePermissions(Permission.MANAGE_SCIENTIFIC_CONTENT)
export class ScientificTrustController {
  constructor(private readonly trust: ScientificTrustService) {}

  @Post('references')
  createReference(@CurrentAuth() auth: AuthContext, @Body() input: CreateReferenceDto) {
    return this.trust.createReference(auth.user.id, input);
  }

  @Get('references')
  @Header('Cache-Control', 'private, no-store')
  listReferences(@Query() query: ReferenceListQueryDto) {
    return this.trust.listReferences(query.limit ?? 50, query.offset ?? 0, query.q);
  }

  @Get('references/:id')
  @Header('Cache-Control', 'private, no-store')
  getReference(@Param('id', ParseUUIDPipe) id: string) {
    return this.trust.getReference(id);
  }

  @Patch('references/:id')
  updateReference(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: UpdateReferenceDto,
  ) {
    return this.trust.updateReference(auth.user.id, id, input);
  }

  @Post('records/:id/evidence')
  addEvidence(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: AddEvidenceDto,
  ) {
    return this.trust.addEvidence(auth.user.id, id, input);
  }

  @Get('records/:id/evidence')
  @Header('Cache-Control', 'private, no-store')
  listEvidence(@Param('id', ParseUUIDPipe) id: string) {
    return this.trust.listEvidence(id);
  }

  @Post('records/:id/locations')
  addLocation(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreateLocationDto,
  ) {
    return this.trust.addLocation(auth.user.id, id, input);
  }

  @Get('records/:id/locations')
  @Header('Cache-Control', 'private, no-store')
  @RequirePermissions(Permission.MANAGE_SCIENTIFIC_CONTENT, Permission.READ_RESTRICTED_LOCATIONS)
  listLocations(@Param('id', ParseUUIDPipe) id: string) {
    return this.trust.listLocations(id, true);
  }

  @Post('records/:id/relationships')
  addRelationship(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: CreateRelationshipDto,
  ) {
    return this.trust.addRelationship(auth.user.id, id, input);
  }

  @Get('records/:id/relationships')
  @Header('Cache-Control', 'private, no-store')
  listRelationships(@Param('id', ParseUUIDPipe) id: string) {
    return this.trust.listRelationships(id);
  }

  @Get('records/:id/publication-check')
  @Header('Cache-Control', 'private, no-store')
  publicationCheck(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.trust.publicationIssues(id, auth.user.id);
  }

  @Get('map-layers')
  @Header('Cache-Control', 'private, no-store')
  mapLayers() {
    return this.trust.listMapLayers();
  }

  @Post('map-layers')
  createMapLayer(@CurrentAuth() auth: AuthContext, @Body() input: CreateMapLayerDto) {
    return this.trust.createMapLayer(auth.user.id, input);
  }
}
