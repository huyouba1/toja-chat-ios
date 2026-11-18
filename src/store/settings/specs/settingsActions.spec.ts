import { Platform } from 'react-native';
import { getUniqueId } from 'react-native-device-info';
import { settingsActions } from '../settingsActions';
import { SettingsService } from '../settingsService';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('react-native-permissions', () => jest.requireActual('react-native-permissions/mock'));

jest.mock('@react-native-firebase/messaging', () => jest.fn());

jest.mock('react-native-device-info', () => ({
  getSystemName: jest.fn(),
  getManufacturer: jest.fn(),
  getModel: jest.fn(),
  getApiLevel: jest.fn(),
  getBrand: jest.fn(),
  getBuildNumber: jest.fn(),
  getUniqueId: jest.fn(),
}));

jest.mock('@/i18n', () => ({
  t: (key: string) => key,
}));

jest.mock('@/utils/toastUtils', () => ({
  showToast: jest.fn(),
}));

jest.mock('../settingsService', () => ({
  SettingsService: {
    verifyInstallationUrl: jest.fn(),
  },
}));

const setInstallationUrl = (url: string) =>
  settingsActions.setInstallationUrl(url)(jest.fn(), () => ({}), undefined);

describe('setInstallationUrl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SettingsService.verifyInstallationUrl as jest.Mock).mockResolvedValue(true);
  });

  it('builds both URLs from the host', async () => {
    const action = await setInstallationUrl('app.chatwoot.com');

    expect(action.payload).toEqual({
      installationUrl: 'https://app.chatwoot.com/',
      webSocketUrl: 'wss://app.chatwoot.com/cable',
      baseUrl: 'app.chatwoot.com',
    });
  });

  it('keeps a pasted scheme out of the websocket URL', async () => {
    const action = await setInstallationUrl('https://app.chatwoot.com');

    expect(action.payload).toEqual({
      installationUrl: 'https://app.chatwoot.com/',
      webSocketUrl: 'wss://app.chatwoot.com/cable',
      baseUrl: 'app.chatwoot.com',
    });
  });

  it('keeps surrounding whitespace out of the websocket URL', async () => {
    const action = await setInstallationUrl('   https://app.chatwoot.com');

    expect(action.payload).toEqual({
      installationUrl: 'https://app.chatwoot.com/',
      webSocketUrl: 'wss://app.chatwoot.com/cable',
      baseUrl: 'app.chatwoot.com',
    });
  });

  it('rejects a host holding whitespace without calling the server', async () => {
    const action = await setInstallationUrl('app chatwoot.com');

    expect(action.type).toBe('settings/setInstallationUrl/rejected');
    expect(SettingsService.verifyInstallationUrl).not.toHaveBeenCalled();
  });
});

describe('免费 iOS 设备注册', () => {
  it('不访问设备标识或 Firebase，也不创建空推送订阅', async () => {
    const previous = process.env.EXPO_PUBLIC_IOS_FREE_SIGNING;
    const platform = jest.replaceProperty(Platform, 'OS', 'ios');
    process.env.EXPO_PUBLIC_IOS_FREE_SIGNING = 'true';
    jest.clearAllMocks();
    try {
      const action = await settingsActions.saveDeviceDetails()(jest.fn(), () => ({}), undefined);
      expect(action.type).toBe('settings/saveDeviceDetails/fulfilled');
      expect(action.payload).toEqual({ fcmToken: null });
      expect(getUniqueId).not.toHaveBeenCalled();
    } finally {
      platform.restore();
      if (previous === undefined) delete process.env.EXPO_PUBLIC_IOS_FREE_SIGNING;
      else process.env.EXPO_PUBLIC_IOS_FREE_SIGNING = previous;
    }
  });
});
