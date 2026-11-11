import {
  Controller,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Query,
  StreamableFile,
} from '@nestjs/common';
import { Public } from '../identity/access.decorators';
import { MediaService } from '../media/media.service';
import {
  PublicCategoryListQueryDto,
  PublicLocaleQueryDto,
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
  @Header('Cache-Control', 'private, no-store')
  async getCategoryImage(@Param('slug', PublicSlugPipe) slug: string) {
    const mediaAssetId = await this.content.getCategoryImageAssetId(slug);
    return this.streamPublicImage(mediaAssetId);
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
  @Header('Cache-Control', 'private, no-store')
  async getRecordImage(@Param('publicId', ParseUUIDPipe) publicId: string) {
    const mediaAssetId = await this.content.getRecordImageAssetId(publicId);
    return this.streamPublicImage(mediaAssetId);
  }

  @Get('records/:publicId/images/:mediaAssetId')
  @Header('Cache-Control', 'private, no-store')
  async getRecordAttachmentImage(
    @Param('publicId', ParseUUIDPipe) publicId: string,
    @Param('mediaAssetId', ParseUUIDPipe) mediaAssetId: string,
  ) {
    const approvedAssetId = await this.content.getRecordAttachmentImageAssetId(
      publicId,
      mediaAssetId,
    );
    return this.streamPublicImage(approvedAssetId);
  }

  private async streamPublicImage(mediaAssetId: string) {
    const image = await this.media.publicInlineImage(mediaAssetId);
    return new StreamableFile(image.stream, {
      type: image.contentType,
      length: image.contentLength,
      disposition: 'inline',
    });
  }
}
