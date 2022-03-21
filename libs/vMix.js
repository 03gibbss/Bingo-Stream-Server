const { ConnectionTCP } = require("node-vmix");

module.exports = class vMix {
  constructor(system, config) {
    this.system = system;
    this.config = config;
    if (config.active) {
      this.vmix = new ConnectionTCP(config.address);
    }
    this.events();
  }

  setLayer(scene, layer, obs) {
    if (this.config.active) {
      this.vmix.send({
        Function: "SetLayer",
        Input: scene,
        Value: `${layer},${obs}`,
      });
    }

    console.log(`vMix | Layer to ${layer} set to ${scene} [${obs}]`);
  }

  transition(scene) {
    if (this.config.active) {
      this.vmix.send({ Function: "PreviewInput", Input: scene });
      this.vmix.send({ Function: "Transition2" });
    }

    console.log(`vMix | Transition to ${scene}`);
  }

  events() {
    if (this.config.active) {
      this.vmix.on("error", (err) => {
        console.log(err);
      });
    }
  }
};
