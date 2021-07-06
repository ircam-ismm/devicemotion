import { AbstractExperience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import renderInitializationScreens from '@soundworks/template-helpers/client/render-initialization-screens.js';

import devicemotion from '@ircam/devicemotion';
import os from 'platform-detect/os.mjs';
import browser from 'platform-detect/browser.mjs';
const { windows, android, macos, ios, linuxBased } = os;
const { chrome, edge, safari, firefox } = browser;

class PlayerExperience extends AbstractExperience {
  constructor(client, config = {}, $container) {
    super(client);

    this.config = config;
    this.$container = $container;

    // require services
    this.startSensors = this.startSensors.bind(this);
    // default initialization views
    renderInitializationScreens(client, config, $container);
  }

  async start() {
    super.start();

    this.state = await this.client.stateManager.create('player');
    this.state.subscribe(updates => this.renderApp());

    this.state.set({
      os: windows ? 'windows' :
          android ? 'android' :
          macos ? 'macos' :
          ios ? 'ios' :
          linuxBased ? 'linuxBased' :
          'unknown',
      browser: chrome ? 'chrome' :
               edge ? 'edge' :
               safari ? 'safari' :
               firefox ? 'firefox' :
               'unknown',
      });

    this.event = null;
    this.renderApp();
  }

  async startSensors() {
    console.log('- first `devicemotion.requestPermission()`');
    const permission = await devicemotion.requestPermission();
    console.log(`> permission ${permission}`);

    // request permission a sconced time, it has been seen to chrome returns
    // denied the second time ot was called
    {
      console.log('- second `devicemotion.requestPermission()`');
      const _permission = await devicemotion.requestPermission();
      console.log(`> permission ${_permission}`);

      if (_permission !== permission) {
        throw new Error(`requestPermission doesn't return a consistent permission when called twice`);
      }
    }

    this.state.set({ permission });

    if (permission === 'granted') {
      const data = new Float32Array(8);
      // send only half of the messages, the stack get overflowed
      let flag = true;

      const startTime = performance.now() * 0.001;

      devicemotion.addEventListener(e => {
        flag = !flag;

        if (!flag) {
          return;
        }

        const time = performance.now() * 0.001 - startTime;

        data[0] = this.client.id;
        data[1] = e.accelerationIncludingGravity.x;
        data[2] = e.accelerationIncludingGravity.y;
        data[3] = e.accelerationIncludingGravity.z;
        data[4] = e.rotationRate.alpha;
        data[5] = e.rotationRate.beta;
        data[6] = e.rotationRate.gamma;
        data[7] = time;

        this.client.socket.sendBinary('sensors', data);

        this.event = {
          acc: e.accelerationIncludingGravity,
          gyro: e.rotationRate,
          time: time,
        };

        this.renderApp();
      });
    }

    this.renderApp();
  }

  renderApp() {
    const values = this.state.getValues();

    if (values.permission === null) {
      render(html`
        <div
          class="screen"
          @click="${this.startSensors}"
          style="
            box-sizing: border-box;
            padding-top: 30px;
            text-align: center;
          "
        >
          click to start sensors
        </div>
      `, this.$container);
    } else {
      render(html`
        <h2 style="font-size: 13px; margin: 10px">id: ${this.client.id}</h2>
        <pre style="box-sizing: border-box; padding: 10px;">
          <code>
${JSON.stringify(values, null, 2)}
          </code>
        </pre>
        <pre style="box-sizing: border-box; padding: 10px;">
          <code>
${JSON.stringify(this.event, null, 2)}
          </code>
        </pre>
      `, this.$container);
    }
  }
}

export default PlayerExperience;
