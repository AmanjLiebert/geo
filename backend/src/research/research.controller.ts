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
} from '@nestjs/common';
import { Permission } from '../identity/access-control';
import { CurrentAuth, HighRiskAction, RequirePermissions } from '../identity/access.decorators';
import { AuthContext } from '../identity/auth-context';
import { localePattern } from '../scientific-content/dto/upsert-record-translation.dto';
import {
  AddContributorDto,
  AttachResearchMediaDto,
  CreateResearchDto,
  UpsertResearchTranslationDto,
} from './dto/research.dto';
import { ResearchService } from './research.service';

@Controller('research')
@RequirePermissions(Permission.MANAGE_RESEARCH)
export class ResearchController {
  constructor(private readonly research: ResearchService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  list() {
    return this.research.list();
  }

  @Post()
  create(@CurrentAuth() auth: AuthContext, @Body() input: CreateResearchDto) {
    return this.research.create(auth.user.id, input);
  }

  @Get(':id')
  @Header('Cache-Control', 'private, no-store')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.research.get(id);
  }

  @Put(':id/translations/:locale')
  translation(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locale') locale: string,
    @Body() input: UpsertResearchTranslationDto,
  ) {
    if (!localePattern.test(locale)) throw new BadRequestException('Invalid locale.');
    return this.research.upsertTranslation(auth.user.id, id, locale, input);
  }

  @Post(':id/translations/:locale/review')
  @HighRiskAction()
  reviewTranslation(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('locale') locale: string,
  ) {
    if (!localePattern.test(locale)) throw new BadRequestException('Invalid locale.');
    return this.research.reviewTranslation(auth.user.id, id, locale);
  }

  @Post(':id/contributors')
  contributor(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: AddContributorDto,
  ) {
    return this.research.addContributor(auth.user.id, id, input);
  }

  @Post(':id/media')
  media(
    @CurrentAuth() auth: AuthContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: AttachResearchMediaDto,
  ) {
    return this.research.attachMedia(auth.user.id, id, input);
  }

  @Post(':id/submit-review')
  submit(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.research.submit(auth.user.id, id);
  }

  @Post(':id/publish')
  @HighRiskAction()
  publish(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.research.publish(auth.user.id, id);
  }

  @Post(':id/archive')
  archive(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.research.archive(auth.user.id, id);
  }
}
