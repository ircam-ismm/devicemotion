import { Experience } from '@soundworks/core/server';

class PlayerExperience extends Experience {
  constructor(server, clientTypes, options = {}) {
    super(server, clientTypes);

  }

  start() {
    super.start();
  }

  enter(client) {
    super.enter(client);

    client.socket.addBinaryListener('sensors', data => {
      this.server.sockets.broadcastBinary('logger', null, 'sensors', data);
    });
  }

  exit(client) {
    super.exit(client);
  }
}

export default PlayerExperience;
