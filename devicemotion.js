// platform-detect documentation is wrong because of that:
// https://stackoverflow.com/questions/43814830/destructuring-a-default-export-object
// so we destructure later on...
import os from 'platform-detect/os.mjs';
import browser from 'platform-detect/browser.mjs';
const { windows, android, macos, ios, linuxBased } = os;
const { chrome, edge, safari, firefox } = browser;

// warn on http protocol
if (window.location.protocol === 'http:') {
  console.warn('[devicemotion] the application is accessed through "http" protocol, be aware that recent browsers require an "https" connection to access motion sensors');
}

/**
 *
 * partial interface Window {
 *     [SecureContext] attribute EventHandler ondevicemotion;
 * };
 *
 * [SecureContext]
 * interface DeviceMotionEventAcceleration {  // m/s2
 *     readonly attribute double? x;
 *     readonly attribute double? y;
 *     readonly attribute double? z;
 * };
 *
 * [SecureContext]
 * interface DeviceMotionEventRotationRate {  // deg/s
 *     readonly attribute double? alpha;
 *     readonly attribute double? beta;
 *     readonly attribute double? gamma;
 * };
 *
 * [Constructor(DOMString type, optional DeviceMotionEventInit eventInitDict), Exposed=Window, SecureContext]
 * interface DeviceMotionEvent : Event {
 *     readonly attribute DeviceMotionEventAcceleration? acceleration;
 *     readonly attribute DeviceMotionEventAcceleration? accelerationIncludingGravity;
 *     readonly attribute DeviceMotionEventRotationRate? rotationRate;
 *     readonly attribute double interval;    // milliseconds (ms)
 *
 *     static Promise<PermissionState> requestPermission();
 * };
 */

// iOS outputs interval in sec instead of ms
const unifyInterval = ios ? 1000 : 1;
// iOS invert acceleration axis
const unifyAcceleration = ios ? -1 : 1;

let accelerationIncludingGravityProvided = false;
let accelerationProvided = false;
let rotationRateProvided = false;

let chromeVersion = (android && chrome && getChromeVersion()) || null;

const RAD_TO_DEG = 180 / Math.PI;

const shouldTriggerTimeoutDuration = 1 * 1000;

// https://stackoverflow.com/questions/4900436/how-to-detect-the-installed-chrome-version
function getChromeVersion() {
    const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
    return raw ? parseInt(raw[2], 10) : false;
}

const listeners = new Set();

/**
 * Minimal wrapper around the `devicemotion` API
 * cf. https://www.w3.org/TR/orientation-event/#devicemotion
 *
 * @example
 * import devicemotion from '@ircam/devicemotion';
 *
 * const permission = await devicemotion.requestPermission();
 * if (permission === 'granted') {
 *   const available = await devicemotion.init();
 *
 *   if (available) {
 *     devicemotion.addEventListener(e => console.log(e));
 *   }
 * }
 *
 *
 * notes:
 * Firefox -> interval: 100
 * Chrome  -> interval: 16
 */
const devicemotion = {
  _available: null,
  _checkTimeoutId: null,
  _resolveCheck: null,
  _processFunction: null,
  _androidFirefoxCheckCounter: 0,
  _event: {
    accelerationIncludingGravity: {},
    acceleration: {},
    rotationRate: {},
  },

  /**
   * @return {Boolean} - define if `devicemotion` is available
   */
  async _init() {
    this._check = this._check.bind(this);
    this._normalize = this._normalize.bind(this);
    this._process = this._process.bind(this);

    return new Promise(resolve => {
      this._resolveCheck = resolve;
      this._processFunction = this._check;

      /**
       * if we have no event after 1s (in desktop browser that implement
       * the API and seems to say nothing about that), we consider that the
       * API is not available.
       */
      this._checkTimeoutId = setTimeout(() => {
        window.removeEventListener('devicemotion', this._process);
        resolve(false);
      }, shouldTriggerTimeoutDuration);

      window.addEventListener('devicemotion', this._process);
    });
  },

  /**
   * check values and
   */
  _check(e) {
    // we have events, so we are not in desktop
    clearTimeout(this._checkTimeoutId);

    // in firefox android, accelerationIncludingGravity retrieve `null`
    // values on the first callback. so wait a second call to be sure.
    // we do that way because we don't know if it comes from this bug or if
    // `accelerationIncludingGravity` is just unavailable
    // @todo - check if still true
    if (android && firefox && this._androidFirefoxCheckCounter < 1) {
      this._androidFirefoxCheckCounter += 1;
    } else {
      // `aceelerationIncludingGravity` availability
      accelerationIncludingGravityProvided = (
        e.accelerationIncludingGravity &&
        (typeof e.accelerationIncludingGravity.x === 'number') &&
        (typeof e.accelerationIncludingGravity.y === 'number') &&
        (typeof e.accelerationIncludingGravity.z === 'number')
      );

      // `aceeleration` availability
      accelerationProvided = (
        e.acceleration &&
        (typeof e.acceleration.x === 'number') &&
        (typeof e.acceleration.y === 'number') &&
        (typeof e.acceleration.z === 'number')
      );

      // `rotationRate` availability
      rotationRateProvided = (
        e.rotationRate &&
        (typeof e.rotationRate.alpha === 'number') &&
        (typeof e.rotationRate.beta  === 'number') &&
        (typeof e.rotationRate.gamma === 'number')
      );

      // now that the sensors are checked, replace the `_processFunction`
      // with the listener dedicated at normalizing data.
      this._processFunction = this._normalize;
      this._resolveCheck(true);
    }
  },

  /**
   * clean values and propagate
   */
  _normalize(e) {
    if (listeners.size === 0) {
      return;
    }

    // accelerationIncludingGravity (m/s2)
    // - invert axes for iOS
    if (accelerationIncludingGravityProvided) {
      this._event.accelerationIncludingGravity.x = e.accelerationIncludingGravity.x * unifyAcceleration;
      this._event.accelerationIncludingGravity.y = e.accelerationIncludingGravity.y * unifyAcceleration;
      this._event.accelerationIncludingGravity.z = e.accelerationIncludingGravity.z * unifyAcceleration;
    }

    // acceleration (m/s2)
    // - invert axes for iOS
    if (accelerationProvided) {
      this._event.acceleration.x = e.acceleration.x * unifyAcceleration;
      this._event.acceleration.y = e.acceleration.y * unifyAcceleration;
      this._event.acceleration.z = e.acceleration.z * unifyAcceleration;
    }

    // rotationRate (deg/s)
    // In all platforms, rotation axes are messed up according to the spec
    // https://w3c.github.io/deviceorientation/spec-source-orientation.html
    // -> this is wrong ?
    //
    // gamma should be alpha
    // alpha should be beta
    // beta should be gamma
    if (rotationRateProvided) {
      const alpha = e.rotationRate.gamma;
      const beta  = e.rotationRate.alpha;
      const gamma = e.rotationRate.beta;

      this._event.rotationRate.alpha = alpha;
      this._event.rotationRate.beta  = beta;
      this._event.rotationRate.gamma = gamma;

      // this._event.rotationRate.alpha = e.rotationRate.alpha;
      // this._event.rotationRate.beta = e.rotationRate.beta;
      // this._event.rotationRate.gamma = e.rotationRate.gamma;

      // Chrome Android before version 65 was retrieving values in `rad/s`
      // instead of `deg/s`
      //
      // cf. https://bugs.chromium.org/p/chromium/issues/detail?id=541607
      // cf. https://github.com/immersive-web/webvr-polyfill/issues/307
      if (android && chrome && chromeVersion < 65) {
        this._event.rotationRate.alpha *= RAD_TO_DEG;
        this._event.rotationRate.beta  *= RAD_TO_DEG;
        this._event.rotationRate.gamma *= RAD_TO_DEG;
      }
    }

    this._event.interval = e.interval * unifyInterval;
    // emit
    listeners.forEach(listener => listener(this._event));
  },

  _process(e) {
    this._processFunction(e);
  },


  async requestPermission() {
    // return already determined permission
    // also prevent `_process` to be registered twice`
    if (this._available !== null) {
      return this._available;
    }

    // window.DeviceMotionEvent:
    // * implemented in: Chrome and Firefox desktop (Mac)
    // * not implemented in: Safari desktop (Mac)
    // * TBD: Edge
    //
    // If not `https` connection:
    // * is not defined in Chrome Android (checked version 77)
    // * permission is denied in iOS > 13
    if (!window.DeviceMotionEvent) {
      this._available = 'denied';

    // iOS >= 13 goes there
    } else if (window.DeviceMotionEvent.requestPermission) {
      const permission = await window.DeviceMotionEvent.requestPermission();
      let available = false;

      if (permission === 'granted') {
        available = await this._init();
      }

      this._available = (available && permission === 'granted') ? 'granted' : 'denied';

    // Safari < 12.1.3 goes there
    // Chrome Android goes there too (tested v83)
    //
    // warning: Safari 12.2.x and 12.3 require to enable a flag in Settings
    //
    // here we still have desktop browsers that implements the API but will
    // never fire any event (OSX Chrome and Firefox, Windows TBD).
    // they will thus be catched by the `init` method
    } else {
      const available = await this._init();

      this._available = available ? 'granted' : 'denied';
    }

    return this._available;
  },

  addEventListener(callback) {
    if (typeof callback === 'function') {
      listeners.add(callback);
    }
  },

  removeEventListener(callback) {
    if (typeof callback === 'function') {
      listeners.delete(callback);
    }
  },
}

export default devicemotion;
