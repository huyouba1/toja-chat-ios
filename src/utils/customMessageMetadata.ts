import type { Message, MessageContentAttributes } from '@/types/Message';

/** 仅返回公开出站消息的真实读取时间；缺失或非法回执不推断时间。 */
export function getWhatsAppReadTime(message: Message): string | null {
  if (message.private || message.messageType !== 1 || message.status !== 'read') return null;
  const value = message.contentAttributes?.whatsappReadAt;
  if (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? value : null;
}

/** 撤回只标记渠道事实，历史正文与附件继续保留。 */
export function isWhatsAppRevoked(message: Message): boolean {
  return !message.private && message.contentAttributes?.whatsappRevoked === true;
}

/**
 * 只解析当前会话内已加载的原消息附件；精确目标缺失时不拿其他照片替代。
 * 旧多图最多展示十张候选；缩略图仅接受后端允许的有界内嵌 JPEG。
 */
export function getQuotedImages(
  original: Message,
  attributes: MessageContentAttributes | null | undefined,
  conversationId: number,
): string[] {
  if (original.conversationId !== conversationId || original.contentAttributes?.deleted) return [];
  const attachmentId = attributes?.inReplyToAttachmentId;
  const images = (original.attachments || []).filter(item => item.fileType === 'image');
  if (Number.isSafeInteger(attachmentId) && (attachmentId as number) > 0) {
    const exact = images.find(item => item.id === attachmentId);
    if (exact?.dataUrl) return [exact.dataUrl];
  }
  if (!attachmentId && images.length === 1 && images[0].dataUrl) return [images[0].dataUrl];
  const thumbnail = attributes?.quotedImageThumbnail;
  if (
    typeof thumbnail === 'string' &&
    thumbnail.length <= 43715 &&
    /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]*={0,2}$/.test(thumbnail)
  )
    return [thumbnail];
  if (attachmentId) return [];
  return images
    .slice(0, 10)
    .map(item => item.dataUrl)
    .filter(Boolean);
}
