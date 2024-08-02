type KeyEffectDistance = {
  distanceX: number;
  distanceY: number;
};

interface KeyEffect {
  initialX: number;
  initialY: number;
  name?: string;
  description?: string;
}

interface KeyMap<E> {
  keys: Record<string, E>;
  name?: string;
  description?: string;
}

interface KeyMappingConfig {
  dpad?: KeyMap<KeyEffect & KeyEffectDistance>[];
  tap?: KeyMap<KeyEffect>[];
  swipe?: KeyMap<KeyEffect & KeyEffectDistance>[];
}

type DeviceRendererKeyMapping = {
  enable(isEnable: boolean): void;
  setConfig(config: KeyMappingConfig): void;
  activeKeyMappingDebug(isTraceActivate?: boolean, isGridActivate?: boolean): void;
};

type VmEvent =
  | 'ANDROID_ID'
  | 'baseband'
  | 'BATTERY_LEVEL'
  | 'BATTERY_LEVEL'
  | 'BATTERY_STATUS'
  | 'battery'
  | 'beforeunload'
  | 'BLK'
  | 'CLIPBOARD'
  | 'diskio'
  | 'fingerprint'
  | 'fingerprint'
  | 'framework'
  | 'gps'
  | 'gps'
  | 'IMEI'
  | 'network_profile'
  | 'NETWORK'
  | 'settings'
  | 'SYSTEM_PATCHER_LAST_RESULT'
  | 'SYSTEM_PATCHER_STATUS'
  | 'systempatcher'
  | 'vinput'
  | string // This list is not exhaustive and should be completed

type VmCommunication = {
  disconnect(): void;
  addEventListener(event: VmEvent, callback: (msg: string) => void): void;
  sendData(data: { channel: string; messages: string[] }): void;
};

type RegisteredFunctionDoc = {
  apiName: string,
  apiDescription: string,
}

type Utils = {
  getRegisteredFunctions(): RegisteredFunctionDoc[];
};

type Media = {
  mute(): void;
  unmute(): void;
};

type Video = {
  fullscreen: () => void;
};

type Template = 'bootstrap'
  | 'fullscreen'
  | 'fullwindow'
  | 'renderer'
  | 'renderer_minimal'
  | 'renderer_no_toolbar'
  | 'renderer_partial';

interface RendererSetupOptions {
  baseband?: boolean; // Default: false
  battery?: boolean; // Default: true
  biometrics?: boolean; // Default: true
  camera?: boolean; // Default: true
  capture?: boolean; // Default: true
  clipboard?: boolean; // Default: true
  connectionFailedURL?: string;
  diskIO?: boolean; // Default: true
  fileUpload?: boolean; // Default: true
  fileUploadUrl?: string;
  fullscreen?: boolean; // Default: true
  gamepad?: boolean; // Default: true
  giveFeedbackLink?: string;
  gps?: boolean; // Default: true
  gpsSpeedSupport?: boolean; // Default: false
  i18n?: Record<string, string>;
  identifiers?: boolean; // Default: true
  keyboard?: boolean; // Default: true
  keyboardMapping?: boolean; // Default: true
  microphone?: boolean; // Default: false
  mobilethrottling?: boolean; // Default: false
  mouse?: boolean; // Default: true
  navbar?: boolean; // Default: true
  network?: boolean; // Default: true
  phone?: boolean; // Default: true
  power?: boolean; // Default: true
  rotation?: boolean; // Default: true
  streamBitrate?: boolean; // Default: false
  streamResolution?: boolean; // Default: true
  stun?: { urls?: string[] };
  template?: Template; // Default: 'renderer'
  token?: string;
  touch?: boolean; // Default: true
  translateHomeKey?: boolean; // Default: false
  turn?: {
    urls?: string[];
    username?: string;
    credential?: string;
    default?: boolean; // Default: false
  };
  volume?: boolean; // Default: true
}

type DefaultTrue<B, T> = B extends void
? T // Key is not present
: B extends true | undefined
  ? T // Key is true or undefined
  : B extends false
    ? undefined // Key is false
    : T | undefined; // Key is true, false or undefined (we cannot infer anything)

type ExtractKey<O, K extends keyof O> = O extends { [P in K]: infer T } ? T : void;

type DeviceRendererApi<O extends RendererSetupOptions = RendererSetupOptions> = {
keyMapping: DefaultTrue<ExtractKey<O, 'keyboardMapping'>, DeviceRendererKeyMapping>;
media: Media;
utils: Utils;
video?: Video; // Available if any plugin (e.g. fullscreen) using it is enabled.
VM_communication: VmCommunication;
};

declare class DeviceRendererFactory {
constructor();
setupRenderer<O extends RendererSetupOptions>(
  targetElement: HTMLDivElement,
  webrtcAddress: string,
  options?: O,
): DeviceRendererApi<O>;
}

export { DeviceRendererApi, DeviceRendererFactory, RendererSetupOptions, KeyMappingConfig }
