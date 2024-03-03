import { Game, MoveDirection, MapObject } from "@gathertown/gather-game-client";
global.WebSocket = require("isomorphic-ws");
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const { GATHER_API_KEY, SPACE_ID } = process.env;
const { OPENAI_API_KEY } = process.env;
const { BOT_NAME } = process.env;

if (!GATHER_API_KEY) {
  throw new Error("Missing the GATHER_API_KEY in env");
}
if (!SPACE_ID) {
  throw new Error("Missing the SPACE_ID in env");
}
if (!OPENAI_API_KEY) {
  throw new Error("Missing the OPENAI_API_KEY in env");
}
if (!BOT_NAME) {
  throw new Error("Missing the BOT_NAME in env");
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

let CurrentPlayerId = "";
game.connect();
game.subscribeToConnection((connected) => {
  console.log("players", game.players);
  console.log("connected?", connected);
});

interface ObjectHolder{
  [playerId:string]:{
      mapId: string,
      obj:MapObject|undefined
  }
}

let objects:ObjectHolder = {};


const eventList = [
  "info", "warn", "error", "ready", "serverHeartbeat", "transactionStatus", "playerMoves", "playerSetsStatus", "playerSpotlights", "playerRings", "playerChats", "playerGhosts", 
  "playerEntersWhisper", "playerLeavesWhisper", "playerActivelySpeaks", "playerSetsName", "playerSetsTextStatus", 
  "playerSetsEmojiStatus", "playerSetsAffiliation", "playerExits", "playerSetsIsSignedIn", "spaceOverwrites", 
  "spaceIsClosed", "playerEntersPortal", "spaceSetsIdMapping", "playerSetsLastActive", "playerShootsConfetti", 
  "playerSetsEventStatus", "playerSetsInConversation", "playerSetsCurrentArea", "playerSetsImagePointer", 
  "cookieFound", "playerEntersWhisperV2", "playerSetsGoKartId", "mapSetDimensions", "mapSetBackgroundImagePath", 
  "mapSetForegroundImagePath", "mapSetSpawns", "mapSetPortals", "mapSetAnnouncer", "mapSetAssets", "mapSetName", 
  "mapSetMuteOnEntry", "mapSetUseDrawnBG", "mapSetWalls", "mapSetFloors", "mapSetAreas", "mapSetSpawn", 
  "playerSetsIsAlone", "playerJoins", "mapSetEnabledChats", "mapSetDescription", "mapSetDecoration", 
  "mapSetTutorialTasks", "mapSetMiniMapImagePath", "spacePlaysSound", "mapSetScript", "playerSetsIsMobile", 
  "setScreenPointerServer", "playerSetsEmoteV2", "playerSetsFocusModeEndTime", "spaceSetsSpaceMembers", 
  "spaceSetsSpaceUsers", "customEvent", "playerBlocks", "playerUpdatesFocusModeStatus", "playerNotifies", 
  "playerSetsItemString", "playerSetsFollowTarget", "playerRequestsToLead", "playerSetsManualVideoSrc", 
  "playerSetsIsNpc", "playerSetsSubtitle", "mapCommitsChanges", "mapMoveObject", "playerEditsChatMessage", 
  "fxShakeObject", "fxShakeCamera", "playerSendsCommand", "spaceRegistersCommand", "speakerUpdatesSession", 
  "playerUpdatesInventory", "spaceUpdatesItems", "playerSetsVehicleId", "playerSetsSpeedModifier", "playerHighFives", 
  "spaceStopsSound", "hipToBeSquare", "playerCrafts", "playerTriggersInventoryItem", "playerSetsAllowScreenPointer", 
  "precomputedEnterLocation", "gotRequestMute", "playerSetsDeskInfo", "mapSetNooks", "dynamicGates", "playerWaves", 
  "playerSetsPronouns", "playerSetsTitle", "playerSetsTimezone", "playerSetsDescription", "playerSetsPhone", 
  "playerSetsPersonalImageUrl", "playerSetsProfileImageUrl", "spaceSetsCapacity", "spaceOverCapacityDeniesUser", 
  "playerSetsAway", "mapSetCollisionsBits", "playerSetsCity", "playerSetsCountry", "playerSetsStartDate", 
  "playerStartsRecording", "accessRequestsUpdated", "accessRequestRespondedTo", "spaceSetsGuestPassStatuses", 
  "playerSetsAvailability", "subscriptionsUpdated", "spaceRolePermissionOverrideUpdated", "playerSetsLastRaisedHand", 
  "playerSetsCurrentlyEquippedWearables", "playerSetsDisplayEmail", "mapDeleteObjectByKey", "mapSetObjectsV2", 
  "playerInteractsWithObject", "playerTriggersObject", "chimeSetsUserInfo", "playerChangesMaps"
];

eventList.forEach((event: any) => {
  game.subscribeToEvent(event as "info" | "warn" | "error" | "ready" | "serverHeartbeat" | "transactionStatus" | "playerMoves" | "playerSetsStatus" | "playerSpotlights" | "playerRings" | "playerChats" | "playerGhosts" | "playerEntersWhisper" | "playerLeavesWhisper" | "playerActivelySpeaks" | "playerSetsName" | "playerSetsTextStatus" | "playerSetsEmojiStatus" | "playerSetsAffiliation" | "playerExits" | "playerSetsIsSignedIn" | "spaceOverwrites" | "spaceIsClosed" | "playerEntersPortal" | "spaceSetsIdMapping" | "playerSetsLastActive" | "playerShootsConfetti" | "playerSetsEventStatus" | "playerSetsInConversation" | "playerSetsCurrentArea" | "playerSetsImagePointer" | "cookieFound" | "playerEntersWhisperV2" | "playerSetsGoKartId" | "mapSetDimensions" | "mapSetBackgroundImagePath" | "mapSetForegroundImagePath" | "mapSetSpawns" | "mapSetPortals" | "mapSetAnnouncer" | "mapSetAssets" | "mapSetName" | "mapSetMuteOnEntry" | "mapSetUseDrawnBG" | "mapSetWalls" | "mapSetFloors" | "mapSetAreas" | "mapSetSpawn" | "playerSetsIsAlone" | "playerJoins" | "mapSetEnabledChats" | "mapSetDescription" | "mapSetDecoration" | "mapSetTutorialTasks" | "mapSetMiniMapImagePath" | "spacePlaysSound" | "mapSetScript" | "playerSetsIsMobile" | "setScreenPointerServer" | "playerSetsEmoteV2" | "playerSetsFocusModeEndTime" | "spaceSetsSpaceMembers" | "spaceSetsSpaceUsers" | "customEvent" | "playerBlocks" | "playerUpdatesFocusModeStatus" | "playerNotifies" | "playerSetsItemString" | "playerSetsFollowTarget" | "playerRequestsToLead" | "playerSetsManualVideoSrc" | "playerSetsIsNpc" | "playerSetsSubtitle" | "mapCommitsChanges" | "mapMoveObject" | "playerEditsChatMessage" | "fxShakeObject" | "fxShakeCamera" | "playerSendsCommand" | "spaceRegistersCommand" | "speakerUpdatesSession" | "playerUpdatesInventory" | "spaceUpdatesItems" | "playerSetsVehicleId" | "playerSetsSpeedModifier" | "playerHighFives" | "spaceStopsSound" | "hipToBeSquare" | "playerCrafts" | "playerTriggersInventoryItem" | "playerSetsAllowScreenPointer" | "precomputedEnterLocation" | "gotRequestMute" | "playerSetsDeskInfo" | "mapSetNooks" | "dynamicGates" | "playerWaves" | "playerSetsPronouns" | "playerSetsTitle" | "playerSetsTimezone" | "playerSetsDescription" | "playerSetsPhone" | "playerSetsPersonalImageUrl" | "playerSetsProfileImageUrl" | "spaceSetsCapacity" | "spaceOverCapacityDeniesUser" | "playerSetsAway" | "mapSetCollisionsBits" | "playerSetsCity" | "playerSetsCountry" | "playerSetsStartDate" | "playerStartsRecording" | "accessRequestsUpdated" | "accessRequestRespondedTo" | "spaceSetsGuestPassStatuses" | "playerSetsAvailability" | "subscriptionsUpdated" | "spaceRolePermissionOverrideUpdated" | "playerSetsLastRaisedHand" | "playerSetsCurrentlyEquippedWearables" | "playerSetsDisplayEmail" | "mapDeleteObjectByKey" | "mapSetObjectsV2" | "playerInteractsWithObject" | "playerTriggersObject" | "chimeSetsUserInfo" | "playerChangesMaps", (data, _context) => {
    console.log(`Sasha [Event] "${event}"`, data);
  });
});

// print game events
// game.subscribeToEvent("playerMoves", (data, _context) => {
//   console.log('[Event] "move"', data);
// });

game.subscribeToEvent("playerJoins", async (data, _context) => {
  if (data.playerJoins.encId == 1) {
    // This is the authed player!
    CurrentPlayerId = `${game.getPlayerUidFromEncId(data.playerJoins.encId)}`;
    console.log("CurrentPlayerId", CurrentPlayerId);
  }
});

game.subscribeToEvent("playerSetsEmoteV2", (data, _context) => {
  console.log('[Event] "playerSetsEmoteV2"', data);
});

// listen for chats and move
game.subscribeToEvent("playerChats", async (data, _context) => {
  console.log('[Event] "playerChats"', data);
  const message = data.playerChats;

  if (message.senderId === CurrentPlayerId) {
    // don't respond to our own messages
    console.log("ignoring our own message");
    return;
  }

  console.log("messageType:", message.messageType);
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
        // IF THE SENTIMENT SPARKS JOY IN BOT, THEN DANCE
        game.move(MoveDirection.Dance);
        break;
      default: 
        game.setEmote("💭");
        const completion = await chatCompletion(message.contents);
        game.chat(message.senderId, [], "", { contents: `${completion.message.content}` });
        game.setEmote("");
    }
  } else if (message.recipient === "LOCAL_CHAT") {
    game.setEmote("💭");
    const completion = await chatCompletion(message.contents);
    game.chat("LOCAL_CHAT", [], "", { contents: `${completion.message.content}`});
    game.setEmote("");
  }
});

// name and status setup
setTimeout(() => {
  console.log("setting name and status");

  if (game.engine) {
    game.engine.sendAction({
      $case: "setName",
      setName: {
        name: BOT_NAME,
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

// setInterval(() => {
//   const directions = [MoveDirection.Up, MoveDirection.Down, MoveDirection.Left, MoveDirection.Right];
//   const randomDirection = directions[Math.floor(Math.random() * directions.length)];
//   game.move(randomDirection);
// }, 2000);
