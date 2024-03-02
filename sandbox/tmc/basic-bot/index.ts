import { Game, MoveDirection } from "@gathertown/gather-game-client";
global.WebSocket = require("isomorphic-ws");
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const { GATHER_API_KEY, SPACE_ID } = process.env;
const { OPENAI_API_KEY } = process.env;

if (!GATHER_API_KEY) {
  throw new Error("Missing the GATHER_API_KEY in env");
}
if (!SPACE_ID) {
  throw new Error("Missing the SPACE_ID in env");
}
if (!OPENAI_API_KEY) {
  throw new Error("Missing the OPENAI_API_KEY in env");
}

// create openai client
const openai = new OpenAI();

async function chatCompletion(input: string) {
  const completion = await openai.chat.completions.create({
    messages: [
      {"role": "system", "content": "You are a rad ai in a space station."},
      {"role": "user", "content": input},
    ],
    model: "gpt-4-turbo-preview",
  });
  // TODO: if we want to synthesize audio we would stream and start synthesizing.
  return completion.choices[0];
}

// Game client setup.
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
game.subscribeToEvent("playerChats", async (data, _context) => {
  console.log('[Event] "playerChats"', data);
  game.move(MoveDirection.Dance);
  const message = data.playerChats;
  console.log("playerChat", data);
  console.log("playerChat", _context);

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
  } else {
    // do something
    const completion = await chatCompletion(message.contents);
    game.chat("GLOBAL_CHAT", [], "", { contents: completion.message.content });
    // game.chat(message.senderId, [], "", { contents: 'foobar' });
  }
});

// name and status setup
setTimeout(() => {
  console.log("setting name and status");
  if (game.engine) {
    game.engine.sendAction({
      $case: "setName",
      setName: {
        name: "example bot",
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
