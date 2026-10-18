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
  Put,
} from '@nestjs/common';
import { Permission } from '../identity/access-control';
import { CurrentAuth, RequirePermissions } from '../identity/access.decorators';
import { AuthContext } from '../identity/auth-context';
import {
  AttachMediaDto,
  CreateMediaUploadDto,
  ReorderRecordAttachmentsDto,
  UpdateRecordAttachmentDto,
} from './dto/create-media-upload.dto';
import { MediaService } from './media.service';

@Controller('media')
@RequirePermissions(Permission.MANAGE_SCIENTIFIC_CONTENT)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('uploads')
  @Header('Cache-Control', 'private, no-store')
  initiate(@CurrentAuth() auth: AuthContext, @Body() input: CreateMediaUploadDto) {
    return this.media.initiate(auth.user.id, input);
  }

  @Post(':id/confirm')
  @Header('Cache-Control', 'private, no-store')
  confirm(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.media.confirm(auth.user.id, id);
  }

  @Post(':id/view')
  @Header('Cache-Control', 'private, no-store')
  viewer(@Param('id', ParseUUIDPipe) id: string) {
    return this.media.viewerUrl(id);
  }

  @Post('records/:recordId/attachments')
  @Header('Cache-Control', 'private, no-store')
  attachToRecord(
    @CurrentAuth() auth: AuthContext,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() input: AttachMediaDto,
  ) {
    return this.media.attachToRecord(auth.user.id, recordId, input);
  }

  @Get('records/:recordId/attachments')
  @Header('Cache-Control', 'private, no-store')
  listRecordAttachments(@Param('recordId', ParseUUIDPipe) recordId: string) {
    return this.media.listRecordAttachments(recordId);
  }

  @Patch('records/:recordId/attachments/:mediaAssetId')
  @Header('Cache-Control', 'private, no-store')
  updateAttachment(
    @CurrentAuth() auth: AuthContext,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Param('mediaAssetId', ParseUUIDPipe) mediaAssetId: string,
    @Body() input: UpdateRecordAttachmentDto,
  ) {
    return this.media.updateAttachment(auth.user.id, recordId, mediaAssetId, input);
  }

  @Post('records/:recordId/attachments/:mediaAssetId/primary')
  @Header('Cache-Control', 'private, no-store')
  setPrimary(
    @CurrentAuth() auth: AuthContext,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Param('mediaAssetId', ParseUUIDPipe) mediaAssetId: string,
  ) {
    return this.media.setPrimaryAttachment(auth.user.id, recordId, mediaAssetId);
  }

  @Put('records/:recordId/attachments/order')
  @Header('Cache-Control', 'private, no-store')
  reorder(
    @CurrentAuth() auth: AuthContext,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() input: ReorderRecordAttachmentsDto,
  ) {
    return this.media.reorderAttachments(auth.user.id, recordId, input.mediaAssetIds);
  }

  @Delete('records/:recordId/attachments/:mediaAssetId')
  @Header('Cache-Control', 'private, no-store')
  detach(
    @CurrentAuth() auth: AuthContext,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Param('mediaAssetId', ParseUUIDPipe) mediaAssetId: string,
  ) {
    return this.media.detachFromRecord(auth.user.id, recordId, mediaAssetId);
  }
}
