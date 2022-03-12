require("dotenv").config();

const colors = require("colors");
const EventEmitter = require("events");
const { createServer } = require("http");
const { Server } = require("socket.io");

const OBS = require("./libs/OBS");

const system = new EventEmitter();

const useOBS2 = false;
const useOBS3 = false;

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
};

let currentScene = "Multiview";

let scenes = {
  "Quad A": {
    "Top Left": {
      type: "Game",
      input: "Team 1 A",
    },
    "Top Right": {
      type: "Game",
      input: "Team 1 A",
    },
    "Bottom Left": {
      type: "Game",
      input: "Team 1 A",
    },
    "Bottom Right": {
      type: "Game",
      input: "Team 1 A",
    },
  },
  "Quad B": {
    "Top Left": {
      type: "Game",
      input: "Team 1 A",
    },
    "Top Right": {
      type: "Game",
      input: "Team 1 A",
    },
    "Bottom Left": {
      type: "Game",
      input: "Team 1 A",
    },
    "Bottom Right": {
      type: "Game",
      input: "Team 1 A",
    },
  },
  "Dual A": {
    "Top Left": {
      type: "Game",
      input: "Team 1 A",
    },
    "Top Right": {
      type: "Game",
      input: "Team 1 A",
    },
  },
  "Dual B": {
    "Top Left": {
      type: "Game",
      input: "Team 1 A",
    },
    "Top Right": {
      type: "Game",
      input: "Team 1 A",
    },
  },
  "Dual with Cams A": {
    "Top Left": {
      type: "Game",
      input: "Team 1 A",
    },
    "Top Right": {
      type: "Game",
      input: "Team 1 A",
    },
    "Left Cam": {
      type: "Cam",
      input: "Team 1 A",
    },
    "Right Cam": {
      type: "Cam",
      input: "Team 1 A",
    },
  },
  "Dual with Cams B": {
    "Top Left": {
      type: "Game",
      input: "Team 1 A",
    },
    "Top Right": {
      type: "Game",
      input: "Team 1 A",
    },
    "Left Cam": {
      type: "Cam",
      input: "Team 1 A",
    },
    "Right Cam": {
      type: "Cam",
      input: "Team 1 A",
    },
  },
};

const httpServer = createServer();

const init = async () => {
  const io = new Server(httpServer, {
    cors: {
      origin: `http://localhost:3000`,
      methods: ["GET", "POST"],
    },
  });

  const obs1 = new OBS(system, io, {
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
    obs2 = new OBS(system, io, {
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
    obs3 = new OBS(system, io, {
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

  await setInitialSceneItemValues(obs1, obs2, obs3);

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

    socket.on("handleChange", (scene, position, input) => {
      if (scene === currentScene) return;

      let type = "Game";

      if (position.includes("Cam")) {
        type = "Cam";
      }

      scenes[scene][position]["input"] = input;
      scenes[scene][position]["type"] = type;

      handleChange(scene, position, input, type, obs1, obs2, obs3);

      io.emit("sceneInfo", scenes);
    });

    socket.on("handleTransition", (scene) => {
      obs1.setCurrentScene(scene);
      if (useOBS2) obs2.setCurrentScene(scene);
      if (useOBS3) obs3.setCurrentScene(scene);

      currentScene = scene;
      io.emit("currentScene", currentScene);
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

const deleteAllItemsInScene = async (obs, scene) => {
  const sceneItems = await obs.getSceneItemList(scene);
  for (const { itemId } of sceneItems) {
    await obs.deleteSceneItem(scene, itemId);
  }
};

const addItemsToScene = async (obs1, obs2, obs3, scene) => {
  const positions = Object.keys(scenes[scene]);
  for (const position of positions) {
    const { type, input } = scenes[scene][position];

    selectOBSAndAddItem(obs1, obs2, obs3, input, position, scene, type);
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
      addItemToScene(obs2, scene, type, input, positionValues);
      break;
    case "OBS3":
      addItemToScene(obs3, scene, type, input, positionValues);
      break;
    default:
      return;
  }
};

const addItemToScene = async (obs, sceneName, type, input, position) => {
  const id = await obs.addSceneItem(sceneName, `${type} ${input}`);

  await obs
    .setSceneItemProperties(
      sceneName,
      id,
      position.x,
      position.y,
      position.scale
    )
    .then()
    .catch((err) => {
      console.log(err);
    });
};

const setInitialSceneItemValues = async (obs1, obs2, obs3) => {
  const sceneNames = Object.keys(scenes);

  for (const scene of sceneNames) {
    await deleteAllItemsInScene(obs1, scene);

    if (useOBS2) {
      await deleteAllItemsInScene(obs2, scene);
    }

    if (useOBS3) {
      await deleteAllItemsInScene(obs3, scene);
    }

    await addItemsToScene(obs1, obs2, obs3, scene);
  }
};

const deleteItemInPosition = async (scene, position, type, obs) => {
  const sceneItems = await obs.getSceneItemList(scene);

  for (const { itemId } of sceneItems) {
    const itemProperties = await obs.getSceneItemProperties(scene, itemId);

    const positionLabel = getPositionLabel(
      itemProperties.position.x,
      itemProperties.position.y,
      itemProperties.scale.x,
      type
    );

    if (positionLabel === position) {
      await obs.deleteSceneItem(scene, itemId);
    }
  }
};

const handleChange = async (scene, position, input, type, obs1, obs2, obs3) => {
  deleteItemInPosition(scene, position, type, obs1);
  if (useOBS2) deleteItemInPosition(scene, position, type, obs2);
  if (useOBS3) deleteItemInPosition(scene, position, type, obs3);

  selectOBSAndAddItem(obs1, obs2, obs3, input, position, scene, type);
};
