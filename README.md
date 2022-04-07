Node server for 'Bingo Stream' app - allows control of multiple OBS and vMix instances via websockets with a react front end: https://github.com/03gibbss/Bingo-Stream-Frontend

A node app using:

- obs-websocket-js (https://github.com/obs-websocket-community-projects/obs-websocket-js/tree/v4) to send commands to OBS Studio via websocket
- node-vmix (https://github.com/jensstigaard/node-vmix) to send commands to vMix
- socket.io (https://github.com/socketio/socket.io) to send messages between the frontend and backend

Allows control of multiple instances of OBS and vMix streaming software running on separate machines on a local network. Controlled by a react app dashboard with logic on the node app to determine which OBS and vMix sources to update.

Originally developed for Bingo Streams on The Yogscast twitch channel allowing multiple remote streams to be ingested across multiple PCs with this app allowing quick scene changes by revealing / hiding sources.
