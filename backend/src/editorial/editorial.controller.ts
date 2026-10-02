import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Permission } from '../identity/access-control';
import { CurrentAuth, HighRiskAction, RequirePermissions } from '../identity/access.decorators';
import { AuthContext } from '../identity/auth-context';
import { localePattern } from '../scientific-content/dto/upsert-record-translation.dto';
import {
  CreateManagedPageDto,
  CreateNewsDto,
  UpsertNewsTranslationDto,
  UpsertOrganizationDto,
  UpsertPageTranslationDto,
} from './dto/editorial.dto';
import { EditorialListQueryDto } from './dto/editorial-list-query.dto';
import { EditorialService } from './editorial.service';

@Controller('editorial')
export class EditorialController {
  constructor(private readonly editorial: EditorialService) {}

  @Get('news')
  @RequirePermissions(Permission.MANAGE_NEWS)
  @Header('Cache-Control', 'private, no-store')
  listNews(@Query() query: EditorialListQueryDto) {
    return this.editorial.listNews(
      parseInteger(query.limit, 20),
      parseInteger(query.offset, 0),
      query.status,
    );
  }

  @Post('news')
  @RequirePermissions(Permission.MANAGE_NEWS)
  createNews(@CurrentAuth() auth: AuthContext, @Body() input: CreateNewsDto) {
    return this.editorial.createNews(auth.user.id, input);
  }

  @Put('news/:id/translations/:locale')
  @RequirePermissions(Permission.MANAGE_NEWS)
  newsTranslation(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locale') locale: string,
    @Body() input: UpsertNewsTranslationDto,
  ) {
    assertLocale(locale);
    return this.editorial.newsTranslation(auth.user.id, id, locale, input);
  }

  @Post('news/:id/translations/:locale/review')
  @RequirePermissions(Permission.MANAGE_NEWS)
  @HighRiskAction()
  reviewNewsTranslation(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locale') locale: string,
  ) {
    assertLocale(locale);
    return this.editorial.reviewTranslation('news', auth.user.id, id, locale);
  }

  @Post('news/:id/submit-review')
  @RequirePermissions(Permission.MANAGE_NEWS)
  submitNews(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.editorial.submit('news', auth.user.id, id);
  }

  @Post('news/:id/publish')
  @RequirePermissions(Permission.MANAGE_NEWS)
  @HighRiskAction()
  publishNews(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.editorial.publish('news', auth.user.id, id);
  }

  @Get('pages')
  @RequirePermissions(Permission.MANAGE_SITE_CONTENT)
  @Header('Cache-Control', 'private, no-store')
  listPages(@Query() query: EditorialListQueryDto) {
    return this.editorial.listPages(
      parseInteger(query.limit, 20),
      parseInteger(query.offset, 0),
      query.status,
    );
  }

  @Post('pages')
  @RequirePermissions(Permission.MANAGE_SITE_CONTENT)
  createPage(@CurrentAuth() auth: AuthContext, @Body() input: CreateManagedPageDto) {
    return this.editorial.createPage(auth.user.id, input);
  }

  @Put('pages/:id/translations/:locale')
  @RequirePermissions(Permission.MANAGE_SITE_CONTENT)
  pageTranslation(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locale') locale: string,
    @Body() input: UpsertPageTranslationDto,
  ) {
    assertLocale(locale);
    return this.editorial.pageTranslation(auth.user.id, id, locale, input);
  }

  @Post('pages/:id/translations/:locale/review')
  @RequirePermissions(Permission.MANAGE_SITE_CONTENT)
  @HighRiskAction()
  reviewPageTranslation(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locale') locale: string,
  ) {
    assertLocale(locale);
    return this.editorial.reviewTranslation('page', auth.user.id, id, locale);
  }

  @Post('pages/:id/submit-review')
  @RequirePermissions(Permission.MANAGE_SITE_CONTENT)
  submitPage(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.editorial.submit('page', auth.user.id, id);
  }

  @Post('pages/:id/publish')
  @RequirePermissions(Permission.MANAGE_SITE_CONTENT)
  @HighRiskAction()
  publishPage(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.editorial.publish('page', auth.user.id, id);
  }

  @Put('organization')
  @RequirePermissions(Permission.MANAGE_SITE_CONTENT)
  organization(@CurrentAuth() auth: AuthContext, @Body() input: UpsertOrganizationDto) {
    return this.editorial.upsertOrganization(auth.user.id, input);
  }
}

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function assertLocale(locale: string) {
  if (!localePattern.test(locale)) throw new BadRequestException('Invalid locale.');
}
