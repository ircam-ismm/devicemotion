import '@babel/polyfill';
import 'source-map-support/register';

import { Server } from '@soundworks/core/server';
import getConfig from './utils/getConfig';
import path from 'path';
import serveStatic from 'serve-static';
import compile from 'template-literal';

// import services
import PlayerExperience from './PlayerExperience';
import LoggerExperience from './LoggerExperience';

import playerSchema from './schemas/player.js';

const ENV = process.env.ENV || 'default';
const config = getConfig(ENV);

console.log(`
--------------------------------------------------------
- running "${config.app.name}" in "${ENV}" environment -
--------------------------------------------------------
`);

(async function launch() {
  try {
    const server = new Server();

    // config.env.useHttps = false;

    if (config.env.useHttps === false) {
      console.log('----------------------------------------------------');
      console.log(`- WARNING                                          -`);
      console.log(`- usage of device motion requires https            -`);
      console.log(`- to work on modern browsers                       -`);
      console.log('----------------------------------------------------');
    }

    // -------------------------------------------------------------------
    // register services
    // -------------------------------------------------------------------

    // -------------------------------------------------------------------
    // launch application
    // -------------------------------------------------------------------

    await server.init(config, (clientType, config, httpRequest) => {
      return {
        clientType: clientType,
        app: {
          name: config.app.name,
          author: config.app.author,
        },
        env: {
          type: config.env.type,
          websockets: config.env.websockets,
          assetsDomain: config.env.assetsDomain,
        }
      };
    });

    // register schemas and init shared states

    // html template and static files (in most case, this should not be modified)
    server.configureHtmlTemplates({ compile }, path.join('.build', 'server', 'tmpl'))
    server.router.use(serveStatic('public'));
    server.router.use('build', serveStatic(path.join('.build', 'public')));

    server.stateManager.registerSchema('player', playerSchema);

    const playerExperience = new PlayerExperience(server, 'player');
    const loggerExperience = new LoggerExperience(server, 'logger');

    await server.start();
    playerExperience.start();
    loggerExperience.start();

  } catch (err) {
    console.error(err.stack);
  }
})();

process.on('unhandledRejection', (reason, p) => {
  console.log('> Unhandled Promise Rejection');
  console.log(reason);
});
