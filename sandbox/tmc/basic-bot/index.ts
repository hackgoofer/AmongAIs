import { Game, MoveDirection } from "@gathertown/gather-game-client";
global.WebSocket = require("isomorphic-ws");

import dotenv from "dotenv";
dotenv.config();

const { GATHER_API_KEY, SPACE_ID } = process.env;

if (!GATHER_API_KEY) {
  throw new Error("Missing the GATHER_API_KEY in .env file");
}

if (!SPACE_ID) {
  throw new Error("Missing the SPACE_ID in .env file");
}
// setup
const game = new Game(SPACE_ID, () =>
  Promise.resolve({ apiKey: GATHER_API_KEY })
);
game.connect(); // replace with your spaceId of choice
game.subscribeToConnection((connected) => console.log("connected?", connected));

// print game events
game.subscribeToEvent("playerMoves", (data, _context) => {
  console.log('[Event] "move"', data);
});

// listen for chats and move
game.subscribeToEvent("playerChats", (data, _context) => {
  console.log('[Event] "playerChats"', data);
  game.move(MoveDirection.Dance);
  const message = data.playerChats;
  if (message.messageType === "DM") {
    // do something
    switch (message.contents.toLowerCase()) {
      case "up":
        game.move(MoveDirection.Up);
        break;
      case "down":
        game.move(MoveDirection.Down);
        break;
      case "left":
        game.move(MoveDirection.Left);
        break;
      case "right":
        game.move(MoveDirection.Right);
        break;
      case "dance":
        game.move(MoveDirection.Dance);
        break;
      default:
        game.chat(message.senderId, [], "", { contents: 'foobar' });
    }
  }
});

// name and status setup
setTimeout(() => {
  console.log("setting name and status");
  if (game.engine) {
    game.engine.sendAction({
      $case: "setName",
      setName: {
        name: "bot1",
      },
    });
    game.engine.sendAction({
      $case: "setTextStatus",
      setTextStatus: {
        textStatus: "",
      },
    });
  }
  // });
}, 2000); // wait two seconds before setting these just to give the game a chance to init
