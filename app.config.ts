import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  // 免费个人签名不具备 APNs 权限；构建配置与运行时必须使用同一开关。
  const freeSigning = process.env.EXPO_PUBLIC_IOS_FREE_SIGNING === 'true';
  return {
    name: process.env.EXPO_PUBLIC_APP_NAME || 'Toja Chat',
    slug: process.env.EXPO_PUBLIC_APP_SLUG || 'toja-chat-mobile',
    version: '4.11.6',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    // 保留现有 SSO 回调协议，与 src/utils/ssoUtils.ts 保持一致。
    scheme: 'chatwootapp',
    ios: {
      supportsTablet: true,
      bundleIdentifier: process.env.EXPO_PUBLIC_IOS_BUNDLE_IDENTIFIER || 'com.toja.chat.mobile',
      infoPlist: {
        NSCameraUsageDescription:
          'This app requires access to the camera to upload images and videos.',
        NSPhotoLibraryUsageDescription:
          'This app requires access to the photo library to upload images.',
        NSMicrophoneUsageDescription:
          'This app requires access to the microphone for voice calls and voice notes.',
        NSAppleMusicUsageDescription:
          'This app does not use Apple Music, but a system API may require this permission.',
        TojaFreeSigning: freeSigning,
        UIBackgroundModes: freeSigning
          ? ['audio']
          : ['fetch', 'remote-notification', 'audio', 'voip'],
        ITSAppUsesNonExemptEncryption: false,
      },
      // Please use the relative path to the google-services.json file
      googleServicesFile: freeSigning
        ? undefined
        : process.env.EXPO_PUBLIC_IOS_GOOGLE_SERVICES_FILE,
      entitlements: freeSigning ? {} : { 'aps-environment': 'production' },
      // 自有域名需配置 apple-app-site-association 后才启用通用链接。
      associatedDomains:
        !freeSigning && process.env.EXPO_PUBLIC_APP_LINK_HOST
          ? [`applinks:${process.env.EXPO_PUBLIC_APP_LINK_HOST}`]
          : [],
    },
    android: {
      adaptiveIcon: { foregroundImage: './assets/adaptive-icon.png', backgroundColor: '#ffffff' },
      package: 'com.chatwoot.app',
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.USE_FULL_SCREEN_INTENT',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_MICROPHONE',
        'android.permission.MANAGE_OWN_CALLS',
      ],
      // Please use the relative path to the google-services.json file
      googleServicesFile: process.env.EXPO_PUBLIC_ANDROID_GOOGLE_SERVICES_FILE,
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'app.chatwoot.com',
              pathPrefix: '/app/accounts/',
              pathPattern: '/*/conversations/*',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
        {
          action: 'VIEW',
          data: [
            {
              // 保留现有 SSO 回调协议，与 src/utils/ssoUtils.ts 保持一致。
              scheme: 'chatwootapp',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },
    extra: {
      eas: {
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        storybookEnabled: process.env.EXPO_STORYBOOK_ENABLED,
      },
    },
    // 个人构建不得绑定官方 Chatwoot 的 Expo 团队。
    owner: process.env.EXPO_PUBLIC_EXPO_OWNER,
    plugins: [
      'expo-font',
      'expo-image',
      'expo-status-bar',
      [
        'expo-splash-screen',
        {
          image: './assets/splash.png',
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
          enableFullScreenImage_legacy: true,
        },
      ],
      [
        'react-native-permissions',
        {
          iosPermissions: ['Camera', 'PhotoLibrary', 'MediaLibrary', 'Notifications', 'Microphone'],
        },
      ],
      [
        '@sentry/react-native',
        {
          url: 'https://sentry.io/',
          project: process.env.EXPO_PUBLIC_SENTRY_PROJECT_NAME,
          organization: process.env.EXPO_PUBLIC_SENTRY_ORG_NAME,
        },
      ],
      'expo-web-browser',
      '@config-plugins/react-native-webrtc',
      '@react-native-community/datetimepicker',
      // 免费构建不生成 Firebase/APNs 原生初始化，保留前台 API 和 ActionCable。
      ...(!freeSigning ? ['@react-native-firebase/app', '@react-native-firebase/messaging'] : []),
      [
        'expo-build-properties',
        {
          // compileSdk/targetSdk 36 = Expo SDK 54 / RN 0.81 default (Android 16).
          // notifee (issue #808) needs compileSdk >= 35, satisfied by 36.
          android: {
            minSdkVersion: 24,
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            enableProguardInReleaseBuilds: true,
          },
        },
      ],
      './with-ffmpeg-pod.js',
      './with-android-notification-channel.js',
      './with-notifee-maven-repo.js',
      './with-ios-modular-headers.js',
      './with-ios-scene-lifecycle.js',
    ],
  };
};
