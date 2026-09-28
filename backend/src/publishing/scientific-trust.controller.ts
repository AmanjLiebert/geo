import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Permission } from '../identity/access-control';
import { CurrentAuth, HighRiskAction, RequirePermissions } from '../identity/access.decorators';
import { AuthContext } from '../identity/auth-context';
import { AddEvidenceDto, CreateReferenceDto } from './dto/reference.dto';
import { CreateLocationDto } from './dto/location.dto';
import { CreateRelationshipDto } from './dto/relationship.dto';
import { ScientificTrustService } from './scientific-trust.service';
import { CreateMapLayerDto } from './dto/map-layer.dto';

@Controller()
@RequirePermissions(Permission.MANAGE_SCIENTIFIC_CONTENT)
export class ScientificTrustController {
  constructor(private readonly trust: ScientificTrustService) {}

  @Post('references')
  createReference(@CurrentAuth() auth: AuthContext, @Body() input: CreateReferenceDto) {
    return this.trust.createReference(auth.user.id, input);
  }

  @Post('references/:id/verify')
  @HighRiskAction()
  verifyReference(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.trust.verifyReference(auth.user.id, id);
  }

  @Post('records/:id/evidence')
  addEvidence(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: AddEvidenceDto,
  ) {
    return this.trust.addEvidence(auth.user.id, id, input);
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
