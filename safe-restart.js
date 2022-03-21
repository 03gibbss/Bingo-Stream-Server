require("dotenv").config();
const EventEmitter = require("events");
const { resolve } = require("path");

const OBS = require("./libs/OBS");
const VMIX = require("./libs/vMix");

const system = new EventEmitter();

const useOBS2 = process.env.OBS2ACTIVE === "true" ? true : false;
const useOBS3 = process.env.OBS3ACTIVE === "true" ? true : false;
const useVmix = process.env.VMIXACTIVE === "true" ? true : false;

// safe scene to switch to
let scene = "Multiview A";

const init = async () => {
  const obs1 = new OBS(system, {
    address: process.env.OBS1ADDRESS,
    port: process.env.OBS1PORT,
    password: "",
    name: "OBS1",
  });

  try {
    await obs1.connect();
  } catch (err) {
    console.log(err);
  }

  let obs2;

  if (useOBS2) {
    obs2 = new OBS(system, {
      address: process.env.OBS2ADDRESS,
      port: process.env.OBS2PORT,
      password: "",
      name: "OBS2",
    });

    try {
      await obs2.connect();
    } catch (err) {
      console.log(err);
    }
  }

  let obs3;

  if (useOBS3) {
    obs3 = new OBS(system, {
      address: process.env.OBS3ADDRESS,
      port: process.env.OBS3PORT,
      password: "",
      name: "OBS3",
    });

    try {
      await obs3.connect();
    } catch (err) {
      console.log(err);
    }
  }

  let vmix = new VMIX(system, {
    address: process.env.VMIXADDRESS,
    active: useVmix,
  });

  try {
    await obs1.setCurrentScene(scene);
    if (useOBS2) await obs2.setCurrentScene(scene);
    if (useOBS3) await obs3.setCurrentScene(scene);
  } catch (err) {
    console.log(err);
  }

  vmix.transition(scene);

  process.exit(0);
};

init();
