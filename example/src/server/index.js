import 'source-map-support/register';
import { Server } from '@soundworks/core/server';
import path from 'path';
import serveStatic from 'serve-static';
import compile from 'template-literal';
import getConfig from '../utils/getConfig.js';

import PlayerExperience from './PlayerExperience';
import LoggerExperience from './LoggerExperience';

import playerSchema from './schemas/player.js';

const ENV = process.env.ENV || 'default';
const config = getConfig(ENV);
const server = new Server();

// html template and static files (in most case, this should not be modified)
server.templateEngine = { compile };
server.templateDirectory = path.join('.build', 'server', 'tmpl');
server.router.use(serveStatic('public'));
server.router.use('build', serveStatic(path.join('.build', 'public')));
server.router.use('vendors', serveStatic(path.join('.vendors', 'public')));

console.log(`
--------------------------------------------------------
- launching "${config.app.name}" in "${ENV}" environment
- [pid: ${process.pid}]
--------------------------------------------------------
`);

if (config.env.useHttps === false) {
  console.log('----------------------------------------------------');
  console.log(`- WARNING                                          -`);
  console.log(`- usage of device motion requires https            -`);
  console.log(`- to work on modern browsers                       -`);
  console.log('----------------------------------------------------');
}

// -------------------------------------------------------------------
// register plugins
// -------------------------------------------------------------------
// server.pluginManager.register(pluginName, pluginFactory, [pluginOptions], [dependencies])

// -------------------------------------------------------------------
// register schemas
// -------------------------------------------------------------------
server.stateManager.registerSchema('player', playerSchema);

(async function launch() {
  try {
    // @todo - check how this behaves with a node client...
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

    const playerExperience = new PlayerExperience(server, 'player');
    const loggerExperience = new LoggerExperience(server, 'logger');

    // start all the things
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
