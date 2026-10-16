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
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateStructureRequestDto } from './dto/create-structure-request.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { EditCategoryDto } from './dto/edit-category.dto';
import { CategoryArchiveDto } from './dto/category-archive.dto';
import { ActiveTemplateQueryDto, LocaleQueryDto } from './dto/structure-query.dto';
import { TemplateMigrationPreviewDto } from './dto/template-migration-preview.dto';
import { ScientificStructureService } from './scientific-structure.service';

@Controller('scientific-structure')
@RequirePermissions(Permission.MANAGE_SCIENTIFIC_CONTENT)
export class ScientificStructureController {
  constructor(private readonly structure: ScientificStructureService) {}

  @Get('categories')
  @Header('Cache-Control', 'private, no-store')
  listCategories(@Query() query: LocaleQueryDto) {
    return this.structure.listCategories(query.locale);
  }

  @Get('categories/manage')
  @Header('Cache-Control', 'private, no-store')
  listManagedCategories(@Query() query: LocaleQueryDto) {
    return this.structure.listCategories(query.locale, true);
  }

  @Post('categories')
  @Header('Cache-Control', 'private, no-store')
  createCategory(@CurrentAuth() auth: AuthContext, @Body() input: CreateCategoryDto) {
    return this.structure.createCategory(auth.user.id, input);
  }

  @Patch('categories/:categoryId')
  @Header('Cache-Control', 'private, no-store')
  editCategory(
    @CurrentAuth() auth: AuthContext,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() input: EditCategoryDto,
  ) {
    return this.structure.editCategory(auth.user.id, categoryId, input);
  }

  @Get('categories/:categoryId/archive-preview')
  @Header('Cache-Control', 'private, no-store')
  previewCategoryArchive(@Param('categoryId', ParseUUIDPipe) categoryId: string) {
    return this.structure.previewCategoryArchive(categoryId);
  }

  @Post('categories/:categoryId/archive')
  @Header('Cache-Control', 'private, no-store')
  archiveCategory(
    @CurrentAuth() auth: AuthContext,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() input: CategoryArchiveDto,
  ) {
    return this.structure.setCategoryArchive(auth.user.id, categoryId, false, input);
  }

  @Post('categories/:categoryId/restore')
  @Header('Cache-Control', 'private, no-store')
  restoreCategory(
    @CurrentAuth() auth: AuthContext,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Body() input: CategoryArchiveDto,
  ) {
    return this.structure.setCategoryArchive(auth.user.id, categoryId, true, input);
  }

  @Get('categories/:categoryId/record-types')
  @Header('Cache-Control', 'private, no-store')
  listRecordTypes(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query() query: LocaleQueryDto,
  ) {
    return this.structure.listRecordTypes(categoryId, query.locale);
  }

  @Get('templates/active')
  @Header('Cache-Control', 'private, no-store')
  getActiveTemplate(@Query() query: ActiveTemplateQueryDto) {
    return this.structure.getActiveTemplate(query.categoryId, query.recordTypeId, query.locale);
  }

  @Get('template-versions/:versionId')
  @Header('Cache-Control', 'private, no-store')
  getTemplateVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Query() query: LocaleQueryDto,
  ) {
    return this.structure.getTemplateVersion(versionId, query.locale);
  }

  @Post('template-migrations/preview')
  previewTemplateMigration(@Body() input: TemplateMigrationPreviewDto) {
    return this.structure.previewMigration(input.fromVersionId, input.toVersionId, input.mapping);
  }

  @Get('requests')
  @Header('Cache-Control', 'private, no-store')
  listStructureRequests(@Query() query: PaginationQueryDto) {
    return this.structure.listStructureRequests(query.limit ?? 50, query.offset ?? 0);
  }

  @Post('requests')
  createStructureRequest(
    @CurrentAuth() auth: AuthContext,
    @Body() input: CreateStructureRequestDto,
  ) {
    return this.structure.createStructureRequest(auth.user.id, input);
  }
}
