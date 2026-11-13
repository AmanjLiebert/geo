import {
  Controller,
  Get,
  Header,
  Headers,
  Param,
  ParseUUIDPipe,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { Public } from '../identity/access.decorators';
import { MediaService } from '../media/media.service';
import {
  PublicCategoryListQueryDto,
  PublicLocaleQueryDto,
  PublicImageQueryDto,
  PublicRecordListQueryDto,
} from './dto/public-scientific-query.dto';
import { PublicScientificContentService } from './public-scientific-content.service';
import { PublicSlugPipe } from './public-slug.pipe';

const PUBLIC_REVALIDATE = 'public, max-age=0, must-revalidate';

@Controller('public/scientific')
@Public()
export class PublicScientificContentController {
  constructor(
    private readonly content: PublicScientificContentService,
    private readonly media: MediaService,
  ) {}

  @Get('categories')
  @Header('Cache-Control', PUBLIC_REVALIDATE)
  listCategories(@Query() query: PublicCategoryListQueryDto) {
    return this.content.listCategories(query.locale ?? 'en', query.limit ?? 50, query.offset ?? 0);
  }

  @Get('categories/:slug')
  @Header('Cache-Control', PUBLIC_REVALIDATE)
  getCategory(@Param('slug', PublicSlugPipe) slug: string, @Query() query: PublicLocaleQueryDto) {
    return this.content.getCategory(slug, query.locale ?? 'en');
  }

  @Get('categories/:slug/image')
  @Header('Cache-Control', 'private, no-cache, max-age=0, must-revalidate')
  async getCategoryImage(
    @Param('slug', PublicSlugPipe) slug: string,
    @Query() query: PublicImageQueryDto,
    @Headers('if-none-match') tag: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const mediaAssetId = await this.content.getCategoryImageAssetId(slug);
    return this.streamPublicImage(mediaAssetId, query.size, tag, reply);
  }

  @Get('records')
  @Header('Cache-Control', PUBLIC_REVALIDATE)
  listRecords(@Query() query: PublicRecordListQueryDto) {
    return this.content.listRecords(
      query.locale ?? 'en',
      query.limit ?? 20,
      query.offset ?? 0,
      query.category,
    );
  }

  @Get('records/:publicId')
  @Header('Cache-Control', PUBLIC_REVALIDATE)
  getRecord(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Query() query: PublicLocaleQueryDto,
  ) {
    return this.content.getRecord(publicId, query.locale ?? 'en');
  }

  @Get('records/:publicId/image')
  @Header('Cache-Control', 'private, no-cache, max-age=0, must-revalidate')
  async getRecordImage(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Query() query: PublicImageQueryDto,
    @Headers('if-none-match') tag: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const mediaAssetId = await this.content.getRecordImageAssetId(publicId);
    return this.streamPublicImage(mediaAssetId, query.size, tag, reply);
  }

  @Get('records/:publicId/images/:mediaAssetId')
  @Header('Cache-Control', 'private, no-cache, max-age=0, must-revalidate')
  async getRecordAttachmentImage(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Param('mediaAssetId', ParseUUIDPipe) mediaAssetId: string,
    @Query() query: PublicImageQueryDto,
    @Headers('if-none-match') tag: string | undefined,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const approvedAssetId = await this.content.getRecordAttachmentImageAssetId(
      publicId,
      mediaAssetId,
    );
    return this.streamPublicImage(approvedAssetId, query.size, tag, reply);
  }

  private async streamPublicImage(
    mediaAssetId: string,
    size: 'display' | 'thumbnail' = 'display',
    tag: string | undefined,
    reply: FastifyReply,
  ) {
    const image = await this.media.publicInlineImage(mediaAssetId, size, tag);
    reply.header('ETag', image.etag);
    if (!image.stream) {
      reply.code(304);
      return;
    }
    return new StreamableFile(image.stream, {
      type: image.contentType,
      length: image.contentLength,
      disposition: 'inline',
    });
  }
}
