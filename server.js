require("dotenv").config();

const colors = require("colors");
const EventEmitter = require("events");
const { createServer } = require("http");
const { Server } = require("socket.io");

const OBS = require("./libs/OBS");
const VMIX = require("./libs/vMix");

const scenePresets = require("./presets");

let availablePresets = {};

const system = new EventEmitter();

const useOBS2 = process.env.OBS2ACTIVE === "true" ? true : false;
const useOBS3 = process.env.OBS3ACTIVE === "true" ? true : false;
const useVmix = process.env.VMIXACTIVE === "true" ? true : false;

let state = {
  OBS1: {
    connected: false,
  },
  OBS2: {
    connected: false,
  },
  OBS3: {
    connected: false,
  },
  vMix: {
    connected: false,
  },
  availableInputs: [],
  playerNames: [],
};

let currentScene = "Multiview A";

let scenes = require("./presets/scenes");

const httpServer = createServer();

const init = async () => {
  const io = new Server(httpServer, {
    cors: {
      origin: `http://localhost:3000`,
      methods: ["GET", "POST"],
    },
  });

  Object.keys(scenePresets).map((key) => {
    const scene = key;
    let presets = [];
    scenePresets[key].map((preset) => {
      const name = preset.name;
      const inputs = Object.keys(preset.values).map((key) => {
        const position = key;
        const value = preset.values[key];
        return value.input;
      });

      const needsOBS2 =
        inputs.find(
          (input) =>
            input === "Team 3 A" ||
            input === "Team 3 B" ||
            input === "Team 4 A" ||
            input === "Team 4 B"
        ) === undefined
          ? false
          : true;

      const needsOBS3 =
        inputs.find(
          (input) =>
            input === "Team 5 A" ||
            input === "Team 5 B" ||
            input === "Team 6 A" ||
            input === "Team 6 B"
        ) === undefined
          ? false
          : true;

      if (needsOBS3 && useOBS3) {
        presets.push(preset);
      } else if (needsOBS2 && useOBS2 && !needsOBS3) {
        presets.push(preset);
      } else if (!needsOBS2 && !needsOBS3) {
        presets.push(preset);
      }
    });

    availablePresets[scene] = presets;
  });

  const obs1 = new OBS(system, {
    address: process.env.OBS1ADDRESS,
    port: process.env.OBS1PORT,
    password: "",
    name: "OBS1",
  });

  try {
    await obs1.connect();
    state["OBS1"].connected = true;
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
      state["OBS2"].connected = true;
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
      state["OBS3"].connected = true;
    } catch (err) {
      console.log(err);
    }
  }

  let vmix = new VMIX(system, {
    address: process.env.VMIXADDRESS,
    active: useVmix,
  });

  if (useVmix) state["vMix"].connected = true; // vMix doesn't confirm if it connects or not, but if it fails to connect, the app will crash and never reach this line anyway...

  if (state["OBS1"].connected) {
    state.availableInputs = [
      ...state.availableInputs,
      "Team 1 A",
      "Team 1 B",
      "Team 2 A",
      "Team 2 B",
    ];
    state.playerNames = [
      ...state.playerNames,
      `1A: ${process.env.PLAYER1}`,
      `1B: ${process.env.PLAYER2}`,
      `2A: ${process.env.PLAYER3}`,
      `2B: ${process.env.PLAYER4}`,
    ];
  }

  if (state["OBS2"].connected) {
    state.availableInputs = [
      ...state.availableInputs,
      "Team 3 A",
      "Team 3 B",
      "Team 4 A",
      "Team 4 B",
    ];
    state.playerNames = [
      ...state.playerNames,
      `3A: ${process.env.PLAYER5}`,
      `3B: ${process.env.PLAYER6}`,
      `4A: ${process.env.PLAYER7}`,
      `4B: ${process.env.PLAYER8}`,
    ];
  }

  if (state["OBS3"].connected) {
    state.availableInputs = [
      ...state.availableInputs,
      "Team 5 A",
      "Team 5 B",
      "Team 6 A",
      "Team 6 B",
    ];
    state.playerNames = [
      ...state.playerNames,
      `5A: ${process.env.PLAYER9}`,
      `5B: ${process.env.PLAYER10}`,
      `6A: ${process.env.PLAYER11}`,
      `6B: ${process.env.PLAYER12}`,
    ];
  }

  try {
    setInitialSceneItemValues(obs1, obs2, obs3, vmix);
  } catch (err) {
    console.log(err);
  }

  console.log(
    colors.green.bold(`Websocket available on port: ${process.env.PORT}`)
  );

  io.on("connect", (socket) => {
    console.log(colors.blue("New Websocket Connection from:", socket.id));

    socket.on("disconnect", (reason) => {
      console.log(colors.red(`${socket.id} websocket disconnected: ${reason}`));
    });

    socket.emit("init", state);

    socket.emit("sceneInfo", scenes);

    socket.emit("currentScene", currentScene);

    socket.emit("presetInfo", availablePresets);

    socket.on("handlePreset", async (scene, preset) => {
      if (scene === currentScene) return;

      const storedPreset = scenePresets[scene].find((p) => {
        return p.name === preset;
      });

      Object.keys(storedPreset.values).map(async (key) => {
        try {
          await handleChange(
            scene,
            key,
            storedPreset.values[key].input,
            obs1,
            obs2,
            obs3,
            vmix,
            io
          );
        } catch (err) {
          console.log(err);
        }
      });

      // for (const key of Object.keys(storedPreset.values)) {
      //   try {
      //     await handleChange(
      //       scene,
      //       key,
      //       storedPreset.values[key].input,
      //       obs1,
      //       obs2,
      //       obs3,
      //       vmix,
      //       io
      //     );
      //   } catch (err) {
      //     console.log(err);
      //   }
      //   setTimeout(() => {}, 50);
      // }
    });

    socket.on("handleChange", async (scene, position, input) => {
      await handleChange(scene, position, input, obs1, obs2, obs3, vmix, io);
    });

    socket.on("handleTransition", async (scene) => {
      if (scene.includes("Solo")) {
        const playerName = scene.slice(6);

        const idx = state.playerNames.findIndex(p => p === playerName);

        const input = state.availableInputs[idx];

        console.log(playerName, idx, input)

        const obs = findOBS(input);

        const newScene = `Solo ${input}`;

        switch (obs) {
          case "OBS1":
            try {
              await obs1.setCurrentScene(newScene);
              if (useOBS2) await obs2.setCurrentScene("Blank");
              if (useOBS3) await obs3.setCurrentScene("Blank");
            } catch (err) {
              console.log(err);
            }

            vmix.transition("Solo OBS1");

            currentScene = scene;
            io.emit("currentScene", currentScene);
            break;
          case "OBS2":
            try {
              await obs1.setCurrentScene("Blank");
              if (useOBS2) await obs2.setCurrentScene(newScene);
              if (useOBS3) await obs3.setCurrentScene("Blank");
            } catch (err) {
              console.log(err);
            }

            vmix.transition("Solo OBS2");

            currentScene = scene;
            io.emit("currentScene", currentScene);
            break;
          case "OBS3":
            try {
              await obs1.setCurrentScene("Blank");
              if (useOBS2) await obs2.setCurrentScene("Blank");
              if (useOBS3) await obs3.setCurrentScene(newScene);
            } catch (err) {
              console.log(err);
            }

            vmix.transition("Solo OBS3");

            currentScene = scene;
            io.emit("currentScene", currentScene);
            break;
          default:
            return;
        }
      } else if (scene.includes("vMix")) {
        vmix.transition(scene);
        currentScene = scene;
        io.emit("currentScene", currentScene);
      } else {
        try {
          await obs1.setCurrentScene(scene);
          if (useOBS2) await obs2.setCurrentScene(scene);
          if (useOBS3) await obs3.setCurrentScene(scene);
        } catch (err) {
          console.log(err);
        }

        vmix.transition(scene);

        currentScene = scene;
        io.emit("currentScene", currentScene);
      }
    });
  });

  httpServer.listen(process.env.PORT);
};

init();

const findOBS = (input) => {
  if (
    input === "Team 1 A" ||
    input === "Team 1 B" ||
    input === "Team 2 A" ||
    input === "Team 2 B"
  ) {
    return "OBS1";
  } else if (
    input === "Team 3 A" ||
    input === "Team 3 B" ||
    input === "Team 4 A" ||
    input === "Team 4 B"
  ) {
    return "OBS2";
  } else if (
    input === "Team 5 A" ||
    input === "Team 5 B" ||
    input === "Team 6 A" ||
    input === "Team 6 B"
  ) {
    return "OBS3";
  } else {
    return null;
  }
};

const getPositionValues = (position) => {
  switch (position) {
    case "Top Left":
      return { x: 0, y: 0, scale: 0.5 };
    case "Top Right":
      return { x: 960, y: 0, scale: 0.5 };
    case "Bottom Left":
      return { x: 0, y: 540, scale: 0.5 };
    case "Bottom Right":
      return { x: 960, y: 540, scale: 0.5 };
    case "Left":
      return { x: 0, y: 0, scale: 0.5 };
    case "Right":
      return { x: 960, y: 0, scale: 0.5 };
    case "Left Cam":
      return { x: 0, y: 540, scale: 0.5 };
    case "Right Cam":
      return { x: 960, y: 540, scale: 0.5 };
    case "3":
      return { x: 0, y: 540, scale: 0.25 };
    case "4":
      return { x: 0, y: 810, scale: 0.25 };
    case "5":
      return { x: 480, y: 540, scale: 0.25 };
    case "6":
      return { x: 480, y: 810, scale: 0.25 };
    case "7":
      return { x: 960, y: 540, scale: 0.25 };
    case "8":
      return { x: 960, y: 810, scale: 0.25 };
    case "9":
      return { x: 1440, y: 540, scale: 0.25 };
    case "10":
      return { x: 1440, y: 810, scale: 0.25 };
    default:
      return;
  }
};

const getPositionLabel = (xposition, yposition, scale, type) => {
  if (type === "Game") {
    switch (true) {
      case xposition === 0 && yposition === 0 && scale === 0.5:
        return "Top Left";
      case xposition === 960 && yposition === 0 && scale === 0.5:
        return "Top Right";
      case xposition === 0 && yposition === 540 && scale === 0.5:
        return "Bottom Left";
      case xposition === 960 && yposition === 540 && scale === 0.5:
        return "Bottom Right";
      case xposition === 0 && yposition === 540 && scale === 0.25:
        return "3";
      case xposition === 0 && yposition === 810 && scale === 0.25:
        return "4";
      case xposition === 480 && yposition === 540 && scale === 0.25:
        return "5";
      case xposition === 480 && yposition === 810 && scale === 0.25:
        return "6";
      case xposition === 960 && yposition === 540 && scale === 0.25:
        return "7";
      case xposition === 960 && yposition === 810 && scale === 0.25:
        return "8";
      case xposition === 1440 && yposition === 540 && scale === 0.25:
        return "9";
      case xposition === 1440 && yposition === 810 && scale === 0.25:
        return "10";
      default:
        return;
    }
  } else {
    switch (true) {
      case xposition === 0 && yposition === 540 && scale === 0.5:
        return "Left Cam";
      case xposition === 960 && yposition === 540 && scale === 0.5:
        return "Right Cam";
      default:
        return;
    }
  }
};

const getVmixLayer = (position) => {
  switch (position) {
    case "Top Left":
    case "Left":
      return 1;
    case "Top Right":
    case "Right":
      return 2;
    case "Bottom Left":
    case "Left Cam":
    case "3":
      return 3;
    case "Bottom Right":
    case "Right Cam":
    case "4":
      return 4;
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
    case "10":
      return position;
    default:
      return;
  }
};

const deleteAllItemsInScene = async (obs, scene) => {
  const sceneItems = await obs.getSceneItemList(scene);
  for (const { itemId } of sceneItems) {
    await obs.deleteSceneItem(scene, itemId);
  }
};

const addItemsToScene = async (obs1, obs2, obs3, vmix, scene) => {
  const positions = Object.keys(scenes[scene]);
  for (const position of positions) {
    const { type, input } = scenes[scene][position];

    selectOBSAndAddItem(obs1, obs2, obs3, input, position, scene, type);

    handleVmixChange(scene, position, input, vmix);
  }
};

const selectOBSAndAddItem = (
  obs1,
  obs2,
  obs3,
  input,
  position,
  scene,
  type
) => {
  const obs = findOBS(input);

  const positionValues = getPositionValues(position);

  switch (obs) {
    case "OBS1":
      addItemToScene(obs1, scene, type, input, positionValues);
      break;
    case "OBS2":
      if (useOBS2) addItemToScene(obs2, scene, type, input, positionValues);
      break;
    case "OBS3":
      if (useOBS3) addItemToScene(obs3, scene, type, input, positionValues);
      break;
    default:
      return;
  }
};

const addItemToScene = async (obs, sceneName, type, input, position) => {
  return new Promise(async (resolve, reject) => {
    try {
      const id = await obs.addSceneItem(sceneName, `${type} ${input}`);

      await obs.setSceneItemProperties(
        sceneName,
        id,
        position.x,
        position.y,
        position.scale
      );

      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

const setInitialSceneItemValues = async (obs1, obs2, obs3, vmix) => {
  const sceneNames = Object.keys(scenes);

  for (const scene of sceneNames) {
    try {
      await deleteAllItemsInScene(obs1, scene);

      if (useOBS2) {
        await deleteAllItemsInScene(obs2, scene);
      }

      if (useOBS3) {
        await deleteAllItemsInScene(obs3, scene);
      }

      await addItemsToScene(obs1, obs2, obs3, vmix, scene);
    } catch (err) {
      console.log(err);
    }
  }
};

const deleteItemInPosition = async (scene, position, type, obs) => {
  const sceneItems = await obs
    .getSceneItemList(scene)
    .then()
    .catch((err) => console.log(err));

  for (const { itemId } of sceneItems) {
    const itemProperties = await obs
      .getSceneItemProperties(scene, itemId)
      .then()
      .catch((err) => {
        console.log(err);
      });

    // error was being caused if itemId couldn't be found in scene
    // this if statement might cause some items not to be deleted, need to test
    if (!itemProperties) return;

    const positionLabel = getPositionLabel(
      itemProperties.position.x,
      itemProperties.position.y,
      itemProperties.scale.x,
      type
    );

    if (positionLabel === position) {
      await obs
        .deleteSceneItem(scene, itemId)
        .then()
        .catch((err) => console.log(err));
    }
  }
};

const handleChange = async (
  scene,
  position,
  input,
  obs1,
  obs2,
  obs3,
  vmix,
  io
) => {
  return new Promise((resolve, reject) => {
    if (scene === currentScene) return reject();
    if (scenes[scene][position]["input"] === input)
      return reject("Position already set to input");

    let type = "Game";

    if (position.includes("Cam")) {
      type = "Cam";
    }

    scenes[scene][position]["input"] = input;
    scenes[scene][position]["type"] = type;

    handleOBSChange(scene, position, input, type, obs1, obs2, obs3);

    handleVmixChange(scene, position, input, vmix);

    io.emit("sceneInfo", scenes);

    setTimeout(() => {
      resolve();
    }, 50);
  });
};

const handleOBSChange = (scene, position, input, type, obs1, obs2, obs3) => {
  deleteItemInPosition(scene, position, type, obs1);
  if (useOBS2) deleteItemInPosition(scene, position, type, obs2);
  if (useOBS3) deleteItemInPosition(scene, position, type, obs3);

  selectOBSAndAddItem(obs1, obs2, obs3, input, position, scene, type);
};

const handleVmixChange = (scene, position, input, vmix) => {
  const layer = getVmixLayer(position);

  const obs = findOBS(input);

  vmix.setLayer(scene, layer, obs);
};
