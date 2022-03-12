require('dotenv').config()

const colors = require('colors');
const EventEmitter = require('events');
const { createServer } = require("http");
const { Server } = require("socket.io");

const DB = require('./libs/DB');

const OBS = require('./libs/OBS');

const system = new EventEmitter();

const useOBS3 = false;

let state = {
  OBS1: {
    connected: false
  },
  OBS2: {
    connected: false
  },
  OBS3: {
    connected: false
  },
  vMix: {
    connected: false
  }
};

let currentScene = 'Multiview Cams';

let scenes = {
  'Quad A': {
    'Top Left': {
      type: 'Game',
      input: 'Team 1 A'
    },
    'Top Right': {
      type: 'Game',
      input: 'Team 1 A'
    },
    'Bottom Left': {
      type: 'Game',
      input: 'Team 3 A'
    },
    'Bottom Right': {
      type: 'Game',
      input: 'Team 1 A'
    },
  },
  'Dual with Cams A': {
    'Top Left': {
      type: 'Game',
      input: 'Team 1 A'
    },
    'Top Right': {
      type: 'Game',
      input: 'Team 1 A'
    },
    'Bottom Left': {
      type: 'Cam',
      input: 'Team 4 A'
    },
    'Bottom Right': {
      type: 'Cam',
      input: 'Team 1 A'
    },
  }
}

// let scenes = {
//   'Quad A': {
//     'Top Left': 'Team 1 A',
//     'Top Right': 'Team 1 A',
//     'Bottom Left': 'Team 1 A',
//     'Bottom Right': 'Team 1 A'
//   },
//   'Quad B': {
//     'Top Left': 'Team 1 A',
//     'Top Right': 'Team 1 A',
//     'Bottom Left': 'Team 1 A',
//     'Bottom Right': 'Team 1 A'
//   },
//   'Dual A': {
//     'Left': 'Team 1 A',
//     'Right': 'Team 1 A'
//   },
//   'Dual B': {
//     'Left': 'Team 1 A',
//     'Right': 'Team 1 A'
//   },
//   'Dual with Cams A': {
//     'Left': 'Team 1 A',
//     'Right': 'Team 1 A',
//     'Left Cam': 'Team 1 A',
//     'Right Cam': 'Team 1 A'
//   },
//   'Dual with Cams B': {
//     'Left': 'Team 1 A',
//     'Right': 'Team 1 A',
//     'Left Cam': 'Team 1 A',
//     'Right Cam': 'Team 1 A'
//   },
// }

const expectedScenes = ['Quad A', 'Quad B', 'Dual A', 'Dual B', 'Dual with Cams A', 'Dual with Cams B'];

const httpServer = createServer();

const init = async () => {
  const db = new DB(system);

  const io = new Server(httpServer, {
    cors: {
      origin: `http://localhost:3000`,
      methods: ["GET", "POST"]
    }
  });

  const obs1 = new OBS(system, io, {
    address: 'localhost',
    port: '4444',
    password: '',
    name: 'OBS1'
  })

  try {
    await obs1.connect();
    state['OBS1'].connected = true;
  } catch (err) {
    console.log(err);
  }

  if (useOBS3) {
    const obs3 = new OBS(system, io, {
      address: 'localhost',
      port: '4444',
      password: '',
      name: 'OBS3'
    })

    try {
      await obs3.connect();
      state['OBS3'].connected = true;
    } catch (err) {
      console.log(err);
    }
  }

  await setInitialSceneItemValues(obs1);

  // DB example
  // system.emit('db_get', 'userIPs', userIPs => {
  //   if (userIPs === undefined) {
  //     store.userIPs = {
  //       1: '192.168.1.1:8888',
  //       2: '192.168.1.2:8888',
  //       3: '192.168.1.3:8888',
  //       4: '192.168.1.4:8888',
  //     };

  //     system.emit('db_set', 'userIPs', store.userIPs)
  //   } else {
  //     store.userIPs = userIPs;
  //   }
  // })



  console.log(colors.green.bold(`Websocket available on port: ${process.env.PORT}`));

  io.on('connect', socket => {
    console.log(colors.blue('New Websocket Connection from:', socket.id));

    socket.on('disconnect', reason => {
      console.log(colors.red(`${socket.id} websocket disconnected: ${reason}`));
    });

    socket.emit('init', state);

    socket.emit('sceneInfo', scenes);

    socket.emit('currentScene', currentScene);

    socket.on('handleChange', (scene, position, input) => {
      if (scene === currentScene) return;

      console.log('CHANGE', scene, position, input);

      scenes[scene][position] = input;

      handleChange(scene, position, input, obs1);

      io.emit('sceneInfo', scenes);
    });

    socket.on('handleTransition', scene => {
      console.log('TRANSITION', scene);

      currentScene = scene;
      io.emit('currentScene', currentScene);
    })

  });

  httpServer.listen(process.env.PORT);

}

init();

const findOBS = input => {
  if (input === 'Team 1 A' || input === 'Team 1 B' || input === 'Team 2 A' || input === 'Team 2 B') {
    return 'OBS1';
  } else if (input === 'Team 3 A' || input === 'Team 3 B' || input === 'Team 4 A' || input === 'Team 4 B') {
    return 'OBS2';
  } else if (input === 'Team 5 A' || input === 'Team 5 B' || input === 'Team 6 A' || input === 'Team 6 B') {
    return 'OBS3';
  } else {
    return null;
  }
}

const getPositionValues = position => {
  switch (position) {
    case 'Top Left':
      return { x: 0, y: 0, scale: 0.5 };
    case 'Top Right':
      return { x: 960, y: 0, scale: 0.5 };
    case 'Bottom Left':
      return { x: 0, y: 540, scale: 0.5 };
    case 'Bottom Right':
      return { x: 960, y: 540, scale: 0.5 };
    case 'Left':
      return { x: 0, y: 0, scale: 0.5 };
    case 'Right':
      return { x: 960, y: 0, scale: 0.5 };
    case 'Left Cam':
      return { x: 0, y: 540, scale: 0.5 };
    case 'Right Cam':
      return { x: 960, y: 540, scale: 0.5 };
    default:
      return;
  }
}

const getPositionLabel = (xposition, yposition, scale) => {
  switch (true) {
    case (xposition === 0 && yposition === 0 && scale === 0.5):
      return 'Top Left';
    case (xposition === 960 && yposition === 0 && scale === 0.5):
      return 'Top Right';
    case (xposition === 0 && yposition === 540 && scale === 0.5):
      return 'Bottom Left';
    case (xposition === 960 && yposition === 540 && scale === 0.5):
      return 'Bottom Right';
    default:
      return;
  }
}

const deleteAllItemsInScene = async (obs, sceneName) => {
  const sceneItems = await obs.getSceneItemList(sceneName);
  for (const sceneItem of sceneItems) {
    await obs.deleteSceneItem(sceneName, sceneItem.itemId);
  }
}

const addItemsToScene = async (obs1, sceneName) => {
  const scenePositions = Object.keys(scenes[sceneName]);
  for (const scenePosition of scenePositions) {
    const { type, input } = scenes[sceneName][scenePosition];

    const obs = findOBS(input);

    const position = getPositionValues(scenePosition);

    switch (obs) {
      case 'OBS1':
        const id = await obs1.addSceneItem(sceneName, `${type} ${input}`);

        await obs1.setSceneItemProperties(sceneName, id, position.x, position.y, position.scale)
          .then()
          .catch(err => {
            console.log(err);
          })
      default:

    }
  }
}

const setInitialSceneItemValues = async (obs1) => {
  const sceneNames = Object.keys(scenes);

  for (const sceneName of sceneNames) {
    await deleteAllItemsInScene(obs1, sceneName);
    await addItemsToScene(obs1, sceneName);
  }
}


const handleChange = async (scene, position, input, obs1) => {
  // get items from scene

  // find the one in the maching position

  // if it exists - delete it

  const sceneItems = await obs1.getSceneItemList(scene);

  for (const sceneItem of sceneItems) {

    console.log(sceneItem);

    const itemProperties = await obs1.getSceneItemProperties(scene, sceneItem.itemId);

    // console.log('ITEM PROPERTIES', itemProperties);

    const positionLabel = getPositionLabel(itemProperties.position.x, itemProperties.position.y, itemProperties.scale.x);

    console.log('POSITION LABEL', positionLabel);

    if (positionLabel === position) {
      console.log('delete this item', sceneItem.itemId);
    }
  }
}