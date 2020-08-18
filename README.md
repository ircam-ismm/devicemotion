# `@ircam/devicemotion`

> Low level library dedicated at normalizing `devicemotion` (accelerationIncludingGravity` and `rotationRate`) across browsers according to the specification ((https://www.w3.org/TR/orientation-event/#devicemotion)[https://www.w3.org/TR/orientation-event/#devicemotion])

Important : "HTTPS"

## Install

```
npm install @ircam/devicemotion --save
```

## Example

```js
import devicemotion from '@ircam/devicemotion';

const permission = await devicemotion.requestPermission();

if (permission === 'granted') {
  devicemotion.addEventListener(e => console.log(e));
}
```

## API

## Misc

> estimating linear acceleration from `accelerationIncludingGravity`

```js
// Otherwise, if accelerationIncludingGravity values are provided,
// estimate the acceleration with a high-pass filter
const accelerationIncludingGravity = [
  e.accelerationIncludingGravity.x * this._unifyMotionData,
  e.accelerationIncludingGravity.y * this._unifyMotionData,
  e.accelerationIncludingGravity.z * this._unifyMotionData
];
const k = this._calculatedAccelerationDecay;

// High-pass filter to estimate the acceleration (without the gravity)
this._calculatedAcceleration[0] = (1 + k) * 0.5 * (accelerationIncludingGravity[0] - this._lastAccelerationIncludingGravity[0]) + k * this._calculatedAcceleration[0];
this._calculatedAcceleration[1] = (1 + k) * 0.5 * (accelerationIncludingGravity[1] - this._lastAccelerationIncludingGravity[1]) + k * this._calculatedAcceleration[1];
this._calculatedAcceleration[2] = (1 + k) * 0.5 * (accelerationIncludingGravity[2] - this._lastAccelerationIncludingGravity[2]) + k * this._calculatedAcceleration[2];

this._lastAccelerationIncludingGravity[0] = accelerationIncludingGravity[0];
this._lastAccelerationIncludingGravity[1] = accelerationIncludingGravity[1];
this._lastAccelerationIncludingGravity[2] = accelerationIncludingGravity[2];

outEvent[0] = this._calculatedAcceleration[0];
outEvent[1] = this._calculatedAcceleration[1];
outEvent[2] = this._calculatedAcceleration[2];
```

> estimation rotationRate from `orientation`

```js
_calculateRotationRateFromOrientation(orientation) {
    const now = getLocalTime();
    const k = 0.8; // TODO: improve low pass filter (frames are not regular)
    const alphaIsValid = (typeof orientation[0] === 'number');

    if (this._lastOrientationTimestamp) {
      let rAlpha = null;
      let rBeta;
      let rGamma;

      let alphaDiscontinuityFactor = 0;
      let betaDiscontinuityFactor = 0;
      let gammaDiscontinuityFactor = 0;

      const deltaT = now - this._lastOrientationTimestamp;

      if (alphaIsValid) {
        // alpha discontinuity (+360 -> 0 or 0 -> +360)
        if (this._lastOrientation[0] > 320 && orientation[0] < 40)
          alphaDiscontinuityFactor = 360;
        else if (this._lastOrientation[0] < 40 && orientation[0] > 320)
          alphaDiscontinuityFactor = -360;
      }

      // beta discontinuity (+180 -> -180 or -180 -> +180)
      if (this._lastOrientation[1] > 140 && orientation[1] < -140)
        betaDiscontinuityFactor = 360;
      else if (this._lastOrientation[1] < -140 && orientation[1] > 140)
        betaDiscontinuityFactor = -360;

      // gamma discontinuities (+180 -> -180 or -180 -> +180)
      if (this._lastOrientation[2] > 50 && orientation[2] < -50)
        gammaDiscontinuityFactor = 180;
      else if (this._lastOrientation[2] < -50 && orientation[2] > 50)
        gammaDiscontinuityFactor = -180;

      if (deltaT > 0) {
        // Low pass filter to smooth the data
        if (alphaIsValid)
          rAlpha = k * this._calculatedRotationRate[0] + (1 - k) * (orientation[0] - this._lastOrientation[0] + alphaDiscontinuityFactor) / deltaT;

        rBeta = k * this._calculatedRotationRate[1] + (1 - k) * (orientation[1] - this._lastOrientation[1] + betaDiscontinuityFactor) / deltaT;
        rGamma = k * this._calculatedRotationRate[2] + (1 - k) * (orientation[2] - this._lastOrientation[2] + gammaDiscontinuityFactor) / deltaT;

        this._calculatedRotationRate[0] = rAlpha;
        this._calculatedRotationRate[1] = rBeta;
        this._calculatedRotationRate[2] = rGamma;
      }

      // TODO: resample the emission rate to match the devicemotion rate
      this.rotationRate.emit(this._calculatedRotationRate);
    }

    this._lastOrientationTimestamp = now;
    this._lastOrientation[0] = orientation[0];
    this._lastOrientation[1] = orientation[1];
    this._lastOrientation[2] = orientation[2];
  }
```

## License

BSD-3-Clause
