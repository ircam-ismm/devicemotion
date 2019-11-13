import { Experience } from '@soundworks/core/client';
import { render, html } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat'
import renderAppInitialization from '../views/renderAppInitialization';

import '../views/elements/sw-signal';
import sineGenerator from '../utils/sineGenerator.js';

class LoggerExperience extends Experience {
  constructor(client, config, $container) {
    super(client);

    this.config = config;
    this.$container = $container;
  }

  start() {
    super.start();

    this.playerStates = new Map();
    this.playerGuis = new Map()

    this.client.stateManager.observe(async (schemaName, nodeId) => {
      if (schemaName === 'player') {
        const playerState = await this.client.stateManager.attach(schemaName, nodeId);
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

        $acc.frame = {
          time: data[7],
          value: [data[1] / 9.81, data[2] / 9.81, data[3] / 9.81]
        };

        $gyro.frame = {
          time: data[7],
          value: [data[4] / 180, data[5] / 180, data[6] / 180]
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
          padding: 10px;
        "
      >
        <div style="
          margin-bottom: 14px;
        ">
          <h2 style="font-size: 13px; margin: 10px 0">acc</h2>
          <ul>
            <li>x: <span style="color: #4682B4">blue</span>
            <li>x: <span style="color: #ffa500">orange</span>
            <li>x: <span style="color: #00e600">green</span>
          </li>
          <h2 style="font-size: 13px; margin: 10px 0">gyro</h2>
          <ul>
            <li>alpha (yaw): <span style="color: #4682B4">blue</span>
            <li>beta (pitch): <span style="color: #ffa500">orange</span>
            <li>gamma (roll): <span style="color: #00e600">green</span>
          </li>
        </div>
        ${repeat(players, (player) => player.id, player => {
          return html`
            <div style="
              width: 320px;
              float: left;
            ">
              <h2 style="font-size: 13px; margin: 10px 0">id: ${player.id}</h2>
              <h3>acc</h3>
              <sw-signal id="acc-${player.id}"
                duration="2"
              ></sw-signal>
              <h3>gyro</h3>
              <sw-signal id="gyro-${player.id}"
                duration="2"
              ></sw-signal>
            </div>
          `
        })}
        <!-- <sw-signal></sw-signal> -->
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
        <h2>axis</h2>
        <img src="./images/axis.png" style="width: 100%" />
        <h2>alpha</h2>
        <img src="./images/rotation-alpha.png" style="width: 100%" />
        <h2>beta</h2>
        <img src="./images/rotation-beta.png" style="width: 100%" />
        <h2>gamma</h2>
        <img src="./images/rotation-gamma.png" style="width: 100%" />
      </div>
    `, this.$container);
  }
}

export default LoggerExperience;
