import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Permission } from '../identity/access-control';
import { CurrentAuth, RequirePermissions } from '../identity/access.decorators';
import { AuthContext } from '../identity/auth-context';
import { AttachMediaDto, CreateMediaUploadDto } from './dto/create-media-upload.dto';
import { MediaService } from './media.service';

@Controller('media')
@RequirePermissions(Permission.MANAGE_SCIENTIFIC_CONTENT)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post('uploads')
  initiate(@CurrentAuth() auth: AuthContext, @Body() input: CreateMediaUploadDto) {
    return this.media.initiate(auth.user.id, input);
  }

  @Post(':id/confirm')
  confirm(@CurrentAuth() auth: AuthContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.media.confirm(auth.user.id, id);
  }

  @Post(':id/view')
  viewer(@Param('id', ParseUUIDPipe) id: string) {
    return this.media.viewerUrl(id);
  }

  @Post('records/:recordId/attachments')
  attachToRecord(
    @CurrentAuth() auth: AuthContext,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() input: AttachMediaDto,
  ) {
    return this.media.attachToRecord(auth.user.id, recordId, input);
  }
}
