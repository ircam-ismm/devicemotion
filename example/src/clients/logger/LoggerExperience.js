import { AbstractExperience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat'
import renderInitializationScreens from '@soundworks/template-helpers/client/render-initialization-screens.js';

import '@ircam/simple-components/sc-signal.js';

class LoggerExperience extends AbstractExperience {
  constructor(client, config, $container) {
    super(client);

    this.config = config;
    this.$container = $container;

    renderInitializationScreens(client, config, $container);
  }

  start() {
    super.start();

    this.playerStates = new Map();
    this.playerGuis = new Map()

    this.client.stateManager.observe(async (schemaName, stateId, nodeId) => {
      if (schemaName === 'player') {
        const playerState = await this.client.stateManager.attach(schemaName, stateId, nodeId);
        this.playerStates.set(nodeId, playerState);

        playerState.onDetach(() => {
          this.playerStates.delete(nodeId);
          this.playerGuis.delete(nodeId);
          this.renderApp();
        });

        this.renderApp();

        const $acc = document.querySelector(`#acc-${nodeId}`);
        const $gyro = document.querySelector(`#gyro-${nodeId}`);
        this.playerGuis.set(nodeId, { $acc, $gyro });
      }
    });

    this.client.socket.addBinaryListener('sensors', data => {
      if (this.playerGuis.has(data[0])) {
        const { $acc, $gyro } = this.playerGuis.get(data[0]);

        $acc.value = {
          time: data[7],
          data: [data[1], data[2], data[3]]
        };

        $gyro.value = {
          time: data[7],
          data: [data[4], data[5], data[6]]
        };
      }
    });

    this.renderApp();
  }

  renderApp() {
    const players = [];
    for (let [id, state] of (this.playerStates)) {
      players.push({ id, values: state.getValues() });
    }

    render(html`
      <div
        style="
          margin-right: 240px;
          box-sizing: border-box;
          padding: 20px;
        "
      >
        <div style="
          margin-bottom: 14px;
        ">
          <h2 style="font-size: 16px; margin: 10px 0">accelerationIncludingGravity (accelerometer)</h2>
          <ul>
            <li>x: <span style="color: #4682B4">blue</span></li>
            <li>y: <span style="color: #ffa500">orange</span></li>
            <li>z: <span style="color: #00e600">green</span></li>
          </ul>
          <h2 style="font-size: 16px; margin: 10px 0">rotationRate (gyroscopes)</h2>
          <ul>
            <li>alpha (yaw): <span style="color: #4682B4">blue</span></li>
            <li>beta (pitch): <span style="color: #ffa500">orange</span></li>
            <li>gamma (roll): <span style="color: #00e600">green</span></li>
          </ul>
        </div>
        ${repeat(players, (player) => player.id, player => {
          return html`
            <div style="
              width: 320px;
              float: left;
            ">
              <h2 style="font-size: 13px; margin: 10px 0">id: ${player.id}</h2>
              <h3>acc</h3>
              <sc-signal id="acc-${player.id}"
                duration="2"
                min="-10"
                max="10"
              ></sc-signal>
              <h3>gyro</h3>
              <sc-signal id="gyro-${player.id}"
                duration="2"
                min="-180"
                max="180"
              ></sc-signal>
            </div>
          `
        })}
        <!-- <sc-signal></sc-signal> -->
      </div>

      <!-- informations -->
      <div style="
        width: 400px;
        height: 100%;
        position: absolute;
        right: 0;
        top: 0;
        background-color: #232323;
        box-sizing: border-box;
        padding: 10px;
        overflow-y: auto;
      ">
        <h2>accelerometer axis</h2>
        <img src="./images/axis.png" style="width: 100%" />
        <h2>gyroscope alpha</h2>
        <img src="./images/rotation-alpha.png" style="width: 100%" />
        <h2>gyroscope beta</h2>
        <img src="./images/rotation-beta.png" style="width: 100%" />
        <h2>gyroscope gamma</h2>
        <img src="./images/rotation-gamma.png" style="width: 100%" />
      </div>
    `, this.$container);
  }
}

export default LoggerExperience;
