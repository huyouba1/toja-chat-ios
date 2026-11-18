import { Platform } from 'react-native';
import { isRemotePushEnabled } from '../signingCapabilities';

const original = process.env.EXPO_PUBLIC_IOS_FREE_SIGNING;
afterEach(() => {
  jest.restoreAllMocks();
  if (original === undefined) delete process.env.EXPO_PUBLIC_IOS_FREE_SIGNING;
  else process.env.EXPO_PUBLIC_IOS_FREE_SIGNING = original;
});

describe('免费签名能力', () => {
  it('免费 iOS 构建禁用远程推送', () => {
    // 只替换平台字段，保留Expo测试环境所需的原生模块mock。
    jest.replaceProperty(Platform, 'OS', 'ios');
    process.env.EXPO_PUBLIC_IOS_FREE_SIGNING = 'true';
    expect(isRemotePushEnabled()).toBe(false);
  });
  it('普通签名保留远程推送', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    process.env.EXPO_PUBLIC_IOS_FREE_SIGNING = 'false';
    expect(isRemotePushEnabled()).toBe(true);
  });
  it('不影响 Android 推送', () => {
    process.env.EXPO_PUBLIC_IOS_FREE_SIGNING = 'true';
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(isRemotePushEnabled()).toBe(true);
  });
});
