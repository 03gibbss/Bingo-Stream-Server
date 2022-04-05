const OBSWebSocket = require("obs-websocket-js");

module.exports = class OBS {
  constructor(system, config) {
    this.system = system;
    this.config = config;
    this.obs = new OBSWebSocket();
    this.events();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.obs
        .connect({
          address: `${
            this.config.address !== "" && this.config.address !== undefined
              ? this.config.address
              : "127.0.0.1"
          }:${
            this.config.port !== "" && this.config.port !== undefined
              ? this.config.port
              : "4444"
          }`,
          password: this.config.password,
        })
        .then(() => {
          console.log(`${this.config.name} connected`);
          resolve();
        })
        .catch((err) => {
          console.log(err);
          process.exit(0);
        });
    });
  }

  deleteSceneItem(scene, itemId) {
    return new Promise((resolve, reject) => {
      this.obs
        .send("DeleteSceneItem", {
          scene: scene,
          item: {
            id: itemId,
          },
        })
        .then(() => {
          console.log(`${this.config.name} | ${scene} [${itemId}] deleted`);
          resolve();
        })
        .catch((err) => reject(err));
    });
  }

  setSceneItemProperties(scene, itemId, xposition, yposition, scale) {
    return new Promise((resolve, reject) => {
      this.obs
        .send("SetSceneItemProperties", {
          "scene-name": scene,
          item: {
            id: itemId,
          },
          position: {
            x: xposition,
            y: yposition,
          },
          scale: {
            x: scale,
            y: scale,
          },
        })
        .then(() => {
          console.log(
            `${this.config.name} | ${scene} [${itemId}] Properties Set | X:${xposition} Y:${yposition} Scale:${scale}`
          );
          resolve();
        })
        .catch((err) => reject(err));
    });
  }

  addSceneItem(scene, sourceName) {
    return new Promise((resolve, reject) => {
      this.obs
        .send("AddSceneItem", {
          sceneName: scene,
          sourceName: sourceName,
        })
        .then((data) => {
          console.log(
            `${this.config.name} | ${scene} [${data.itemId}] added | ${sourceName}`
          );
          resolve(data.itemId);
        })
        .catch((err) => reject(err));
    });
  }

  setCurrentScene(scene) {
    return new Promise((resolve, reject) => {
      this.obs
        .send("SetCurrentScene", {
          "scene-name": scene,
        })
        .then(() => {
          console.log(`${this.config.name} | Transition to ${scene}`);
          resolve();
        })
        .catch((err) => reject(err));
    });
  }

  getSceneItemList(scene) {
    return new Promise((resolve, reject) => {
      this.obs
        .send("GetSceneItemList", {
          sceneName: scene,
        })
        .then((data) => {
          resolve(data.sceneItems);
        })
        .catch((err) => reject(err));
    });
  }

  getSceneItemProperties(scene, itemId) {
    return new Promise((resolve, reject) => {
      this.obs
        .send("GetSceneItemProperties", {
          "scene-name": scene,
          item: {
            id: itemId,
          },
        })
        .then((data) => {
          resolve(data);
        })
        .catch((err) => reject(err));
    });
  }

  setMute(source, mute) {
    return new Promise((resolve, reject) => {
      this.obs
        .send("SetMute", {
          source,
          mute,
        })
        .then((data) => {
          console.log(
            `${this.config.name} | ${source} has been ${mute ? "" : "un"}muted`
          );
          resolve(data);
        })
        .catch((err) => reject(err));
    });
  }

  events() {
    this.obs.on("error", (err) => {
      console.log(err);
    });
  }
};
