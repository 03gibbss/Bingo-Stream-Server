const OBSWebSocket = require('obs-websocket-js');

module.exports = class OBS {
  constructor(system, io, config) {
    this.system = system;
    this.io = io;
    this.config = config;
    this.obs = new OBSWebSocket();
    this.currentScene = null;
    this.events();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.obs.connect({
        address: `${this.config.address !== '' && this.config.address !== undefined ? this.config.address : '127.0.0.1'}:${this.config.port !== '' && this.config.port !== undefined ? this.config.port : '4444'}`,
        password: this.config.password
      })
        .then(() => {
          console.log(`${this.config.name} connected`);
          resolve();
        })
        .catch(err => {
          reject(err);
        })
    })
  }

  deleteSceneItem(scene, itemId) {
    return new Promise((resolve, reject) => {
      this.obs.send('DeleteSceneItem', {
        'scene': scene,
        'item': {
          'id': itemId
        }
      })
        .then(() => {
          console.log(`${itemId} deleted`);
          resolve()
        })
        .catch(err => reject(err));
    })
  }

  setSceneItemProperties(scene, itemId, xposition, yposition, scale) {
    return new Promise((resolve, reject) => {
      this.obs.send('SetSceneItemProperties', {
        'scene-name': scene,
        'item': {
          'id': itemId
        },
        'position': {
          'x': xposition,
          'y': yposition
        },
        'scale': {
          'x': scale,
          'y': scale
        }
      })
        .then(() => {
          console.log(`${itemId} Properties Set`);
          resolve();
        })
        .catch(err => reject(err));
    })
  }

  addSceneItem(scene, sourceName) {
    return new Promise((resolve, reject) => {
      this.obs.send('AddSceneItem', {
        'sceneName': scene,
        'sourceName': sourceName
      })
        .then(data => {
          console.log(`${data.itemId} added`);
          resolve(data.itemId);
        })
        .catch(err => reject(err));
    })
  }

  getSceneItemList(scene) {
    return new Promise((resolve, reject) => {
      this.obs.send('GetSceneItemList', {
        'sceneName': scene
      })
        .then(data => {
          resolve(data.sceneItems)
        })
        .catch(err => reject(err));
    })
  }

  getSceneItemProperties(scene, itemId) {
    return new Promise((resolve, reject) => {
      this.obs.send('GetSceneItemProperties', {
        'scene-name': scene,
        'item': {
          'id': itemId
        }
      })
        .then(data => {
          resolve(data)
        })
        .catch(err => reject(err));
    })
  }

  events() {
    this.obs.on('error', err => {
      console.log(err);
    })
  }
}