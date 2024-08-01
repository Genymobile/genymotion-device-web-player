declare module '@genymotion/device-web-player' {
  interface KeyEffect {
    initialX: number;
    initialY: number;
    name?: string;
    description?: string;
  }

  type Distance = {
    distanceX: number;
    distanceY: number;
  };

  interface KeyMap<E> {
    keys: Record<string, E>;
    name?: string;
    description?: string;
  }

  interface KeyMappingConfig {
    dpad?: KeyMap<KeyEffect & Distance>[];
    tap?: KeyMap<KeyEffect>[];
    swipe?: KeyMap<KeyEffect & Distance>[];
  }
  type DeviceRendererKeyMapping = {
    enable(isEnable: boolean): void;
    setConfig(config: KeyMappingConfig): void;
    activeKeyMappingDebug(isTraceActivate: boolean, isGridActivate: boolean): void;
  };
  type VmCommunication = {
    disconnect(): void;
    addEventListener(event: string, callback: (msg: unknown) => void): void;
    sendData(data: { channel: string; messages: string[] });
  };
  type Utils = {
    getRegisteredFunctions(): unknown[];
  };
  type Media = {
    mute(): void;
    unmute(): void;
  };
  type DeviceRenderer = {
    VM_communication: VmCommunication;
    utils: Utils;
    keyMapping: DeviceRendererKeyMapping;
    media: Media;
    video: HTMLVideoElement;
  };
  interface Options {
    token?: string;
    template?:
      | 'bootstrap'
      | 'fullscreen'
      | 'fullwindow'
      | 'renderer' // Default
      | 'renderer_minimal'
      | 'renderer_no_toolbar'
      | 'renderer_partial';
    i18n?: Record<string, unknown>;
    stun?: { urls?: Record<string, string> };
    turn?: {
      urls?: string[];
      username?: string;
      credential?: string;
      default?: boolean; // Default: false
    };
    streamResolution?: boolean; // Default: true
    streamBitrate?: boolean; // Default: false
    touch?: boolean; // Default: true
    mouse?: boolean; // Default: true
    keyboard?: boolean; // Default: true
    volume?: boolean; // Default: true
    rotation?: boolean; // Default: true
    navbar?: boolean; // Default: true
    power?: boolean; // Default: true
    fullscreen?: boolean; // Default: true
    camera?: boolean; // Default: true
    microphone?: boolean; // Default: false
    fileUpload?: boolean; // Default: true
    fileUploadUrl?: string;
    clipboard?: boolean; // Default: true
    battery?: boolean; // Default: true
    gps?: boolean; // Default: true
    gpsSpeedSupport?: boolean; // Default: false
    capture?: boolean; // Default: true
    identifiers?: boolean; // Default: true
    network?: boolean; // Default: true
    phone?: boolean; // Default: true
    Baseband?: boolean; // Default: false
    diskIO?: boolean; // Default: true
    gamepad?: boolean; // Default: true
    biometrics?: boolean; // Default: true
    translateHomeKey?: boolean; // Default: false
    connectionFailedURL?: string;
    giveFeedbackLink?: string;
  }
  declare class DeviceRendererFactory {
    constructor();
    setupRenderer(targetElement: HTMLDivElement, vmUrl: string, options?: Options): DeviceRenderer;
  }
}

