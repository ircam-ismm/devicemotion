# `@ircam/devicemotion`

> Minimal wrapper around the `devicemotion` API (cf. [https://www.w3.org/TR/orientation-event/#devicemotion](https://www.w3.org/TR/orientation-event/#devicemotion) to normalize API, axis and units accross browsers.

**Warning**: Be aware that most, if not all, recent browsers will require your application to run through a `https` connection to grant access to motion sensors.

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

#### `async devicemotion.requestPermission() -> Promise('granted' | 'refused')`

Request permission to access motion sensors, this method should be called on the startup of your application, most browsers will prompt your users so that they authorize the sensors to be accessed by the application

#### `devicemotion.addEventListener(callback: Function) -> void`

The callback will be called with the data formatted as specificied in [https://www.w3.org/TR/orientation-event/#devicemotion](https://www.w3.org/TR/orientation-event/#devicemotion)

```js
devicemotion.addEventListener(e => {
  console.log(e);

  /*
  e = { 
    interval // ms
    accelerationIncludingGravity = { x, y, z } // m/s2
    rotationRate = { alpha, beta, gamma } // deg/s
  }
  */
});
```

**Note:** The event object is internally reused by the library, therefore it's the responsibility of the application to copy the data if needed.

#### `devicemotion.removeEventListener(callback: Function) -> void`

## License

BSD-3-Clause
