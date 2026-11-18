import type { Message, MessageContentAttributes } from '@/types/Message';
import { getQuotedImages, getWhatsAppReadTime, isWhatsAppRevoked } from '../customMessageMetadata';

const message = {
  id: 1,
  conversationId: 42,
  messageType: 1,
  status: 'read',
  private: false,
  contentAttributes: {},
  attachments: [
    { id: 101, fileType: 'image', dataUrl: 'https://example.test/first' },
    { id: 102, fileType: 'image', dataUrl: 'https://example.test/second' },
  ],
} as Message;
const attrs = (value: object) => value as MessageContentAttributes;

describe('二开消息元数据', () => {
  it('旧消息不使用创建时间冒充读取时间', () => {
    expect(getWhatsAppReadTime(message)).toBeNull();
  });
  it('保留带时区的真实读取时间', () => {
    const value = '2026-11-18T10:00:00Z';
    expect(
      getWhatsAppReadTime({ ...message, contentAttributes: attrs({ whatsappReadAt: value }) }),
    ).toBe(value);
  });
  it.each(['invalid', '2026-11-18T10:00:00'])('拒绝无效或无时区读取时间 %s', value => {
    expect(
      getWhatsAppReadTime({ ...message, contentAttributes: attrs({ whatsappReadAt: value }) }),
    ).toBeNull();
  });
  it('私密备注和未读消息不展示读取时间', () => {
    const item = {
      ...message,
      contentAttributes: attrs({ whatsappReadAt: '2026-11-18T10:00:00Z' }),
    };
    expect(getWhatsAppReadTime({ ...item, private: true })).toBeNull();
    expect(getWhatsAppReadTime({ ...item, status: 'sent' })).toBeNull();
    expect(getWhatsAppReadTime({ ...item, messageType: 0 })).toBeNull();
  });
  it('撤回事实不等同于删除且不应用于私密备注', () => {
    const item = {
      ...message,
      content: '历史正文',
      contentAttributes: attrs({ whatsappRevoked: true }),
    };
    expect(isWhatsAppRevoked(item)).toBe(true);
    expect(item.content).toBe('历史正文');
    expect(isWhatsAppRevoked({ ...item, private: true })).toBe(false);
  });
  it('按精确 ID 引用第二张图', () => {
    expect(getQuotedImages(message, attrs({ inReplyToAttachmentId: 102 }), 42)).toEqual([
      'https://example.test/second',
    ]);
  });
  it('目标附件缺失不能显示第一张图', () => {
    expect(getQuotedImages(message, attrs({ inReplyToAttachmentId: 999 }), 42)).toEqual([]);
  });
  it('禁止跨会话和已删除原消息预览', () => {
    expect(getQuotedImages(message, null, 43)).toEqual([]);
    expect(
      getQuotedImages({ ...message, contentAttributes: attrs({ deleted: true }) }, null, 42),
    ).toEqual([]);
  });
  it('仅接受有界内嵌 JPEG，拒绝远程缩略图和其他 data 类型', () => {
    expect(
      getQuotedImages(
        message,
        attrs({
          inReplyToAttachmentId: 999,
          quotedImageThumbnail: 'data:image/jpeg;base64,/9j/AA==',
        }),
        42,
      ),
    ).toHaveLength(1);
    for (const quotedImageThumbnail of [
      'https://example.test/untrusted',
      'data:image/svg+xml;base64,AAAA',
      'data:image/jpeg;base64,/9j/' + 'A'.repeat(43715),
    ]) {
      expect(
        getQuotedImages(message, attrs({ inReplyToAttachmentId: 999, quotedImageThumbnail }), 42),
      ).toEqual([]);
    }
  });
  it('旧多图保留候选列表，单图直接预览', () => {
    expect(getQuotedImages(message, null, 42)).toHaveLength(2);
    expect(
      getQuotedImages({ ...message, attachments: message.attachments.slice(1) }, null, 42),
    ).toEqual(['https://example.test/second']);
  });
  it('候选列表最多十张', () => {
    const attachments = Array.from({ length: 20 }, (_, id) => ({ ...message.attachments[0], id }));
    expect(getQuotedImages({ ...message, attachments }, null, 42)).toHaveLength(10);
  });
});
