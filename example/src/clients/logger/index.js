import '@babel/polyfill';
import '@wessberg/pointer-events';
import { Client } from '@soundworks/core/client';
// import services

import LoggerExperience from './LoggerExperience';
import initQoS from '../utils/qos.js';

const config = window.soundworksConfig;

async function init($container) {
  try {
    const client = new Client();

    // -------------------------------------------------------------------
    // launch application
    // -------------------------------------------------------------------

    await client.init(config);
    initQoS(client);

    const experience = new LoggerExperience(client, config, $container);
    // remove loader and init default views for the services
    document.body.classList.remove('loading');

    await client.start();
    experience.start();
  } catch(err) {
    console.error(err);
  }
}

window.addEventListener('load', async () => {
  const $container = document.querySelector('#container');
  init($container, 0);
});
