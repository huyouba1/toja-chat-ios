import { Platform } from 'react-native';

/** 免费 iOS 签名不调用 Firebase 远程推送；Android 沿用既有逻辑。 */
export const isRemotePushEnabled = () =>
  !(Platform.OS === 'ios' && process.env.EXPO_PUBLIC_IOS_FREE_SIGNING === 'true');
