import { Game, MoveDirection, MapObject } from "@gathertown/gather-game-client";
global.WebSocket = require("isomorphic-ws");
import dotenv from "dotenv";
import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionTool } from "openai/resources";

dotenv.config();

const { GATHER_API_KEY, SPACE_ID } = process.env;
const { OPENAI_API_KEY } = process.env;
const { BOT_NAME } = process.env;
const { GATHER_MAP_ID } = process.env;

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
if (!GATHER_MAP_ID) {
  throw new Error("Missing the MAP_ID in env");
}

// create openai client
const openai = new OpenAI();

async function chatCompletion(input: string, inventory_items: string[] = []) {
  const tools = [
      {
        "type": "function",
        "function": {
          "name": "make_new_item",
          "description": "Based on given inventory items, make a new item if it is within the bot's power and only if it makes sense based on the inventory items.",
          "parameters": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "description": "Name of the new item, e.g. Fire or Water or Spaceship",
              },
              "emoji": {"type": "string", "description": "appropriate emoji for the new item. e.g. 🔥 or 💧 or 🚀"},
              // "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
            },
            "required": ["name", "emoji"],
          },
        }
      }
  ] as ChatCompletionTool[];
  const messages = [
    { "role": "system", "content": `You are a rad ai in a space station. In your inventory, you have: ${inventory_items.length ? inventory_items.join(', ') : 'nothing!'}. You have access to the make_new_item function, which you should only use if the user is nice to you and you have the necessary items, otherwise refuse to make new items. You may suggest a list of necessary items only if the user asks for that.` },
    { "role": "user", "content": input },
  ] as ChatCompletionMessageParam[]
  console.log("MESSAGES", messages)
  const completion = await openai.chat.completions.create({
    messages,
    tools,
    model: "gpt-4-turbo-preview",
    tool_choice: "auto",
  });

  // SWYXTODO
  // https://platform.openai.com/docs/api-reference/chat/create#chat-create-tools
  // if a tool is called, then add it to inventory, and synthesize an alternate response
  if (completion.choices[0].message.tool_calls) {
    console.log("completion.choices[0].message.tool_calls", completion.choices[0].message.tool_calls)
    // add to inventory - TODO in future remove inventory consumed but now not so impt
    const new_item = JSON.parse(completion.choices[0].message.tool_calls[0].function.arguments) // has shape of {name: str, emoji: str}

    console.log("new_item", new_item)
    const me = game.getPlayersInMap(GATHER_MAP_ID!).find(player => player.id === CurrentPlayerId)
    const mynewobject = {
      // _tags: [Array],
      // templateId: 'ArborVitae - _QGSCUNlONJ9K6aJNPjDK',
      _name: new_item.name,
      x: me!.x,
      y: me!.y + 1,
      offsetX: 3.943202257156372,
      offsetY: 10.52558708190918,
      color: '#349141',
      orientation: 0,
      normal: 'https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/internal-dashboard/images/HonPfzx7iBQ4ZuHa-R6gg',
      highlighted: '',
      type: 6,
      width: 1,
      height: 2,
      previewMessage: 'custom object',
      distThreshold: 5,
      id: 'water - QGSCUNlONJ9K6aJNPjDK_410f7df5-518b-450d-9a5e-d744cc25fb79',
      objectPlacerId: 'XMtE7QpdxoUiQsVVWvHcMvIfpPK2',
      zIndex: 803,
      // properties: [Object]
    }
    me!.inventory.items["newId"+ new_item.name] = mynewobject




    // synthesize alt response
    // completion.choices[0].message.content will be null
    completion.choices[0].message.content = `I have added ${new_item.name}`
  }

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

interface ObjectHolder {
  [playerId: string]: {
    mapId: string,
    obj: MapObject | undefined
  }
}



let objects: ObjectHolder = {};
game.subscribeToEvent("playerInteractsWithObject", async (obj, context) => {
  if (context.player!.itemString && objects[context.playerId!]) {
    let temp = objects[context.playerId!]
    let newObj = {
      ...temp.obj,
      key: Object.keys(game.completeMaps[temp.mapId].objects!).length,
      x: context.player!.x!,
      y: context.player!.y!
    }
    game.setObject(temp.mapId, temp.obj!.id!, newObj)
  }

  const playerInteractsWithObject = obj.playerInteractsWithObject;
  const objectKey = playerInteractsWithObject["key"]
  console.log(context.player!.itemString)
  console.log(objects[context.playerId!])
  console.log("before inventory")
  console.log(context.player!.inventory)
  if (context.player!.inventory && context.map!.objects[objectKey]) {
    context.player!.inventory.order[objectKey] = Object.keys(context.player!.inventory.items).length;
    context.player!.inventory.items[objectKey] = context.map!.objects[objectKey];
    console.log("added inventory: " + objectKey);
  }
  console.log("added inventory: " + objectKey)
  console.log("end inventory")
  console.log(context.player!.inventory)

  // if(playerTriggersItem.closestObjectTemplate && playerTriggersItem.closestObjectTemplate === "Special Object"){
  //     let {mapId, obj} = game.getObject(playerTriggersItem.closestObject!)!;
  //     game.setItem(playerTriggersItem.closestObjectTemplate!, obj!.normal, context.playerId);
  //     objects[context.playerId!] = {mapId, obj};
  // }
})

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
    console.log(`SYSTEM [Event] "${event}"`, data);
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

// Function to get a player's inventory
function getPlayerInventory(playerId: string) {
  const players = game.getPlayersInMap(GATHER_MAP_ID)
  const player = players[playerId]
  if (player) {
    return player.inventory;
  } else {
    console.log(`Player with id ${playerId} not found.`);
    return null;
  }
}

// Function to convert inventory items to their names
function inventoryItemToNames(inventoryItems: Record<string, Object>): string[] {
  return Object.values(inventoryItems).map((item: any) => item._name);
}



let hasPlaced = false

// listen for chats and move
game.subscribeToEvent("playerChats", async (data, _context) => {

  if (!hasPlaced) {

    // temporary: manually add items for swyx. SWYXTODO

    console.log("game.completeMaps", game.completeMaps)
    const me = game.getPlayersInMap(GATHER_MAP_ID).find(player => player.id === CurrentPlayerId)

    // me!.inventory.order[objectKey] = Object.keys(me!.inventory.items).length;

    const mymap = game.completeMaps[GATHER_MAP_ID]
    const mynewobject = {
      // _tags: [Array],
      // templateId: 'ArborVitae - _QGSCUNlONJ9K6aJNPjDK',
      _name: 'Water',
      x: me!.x,
      y: me!.y + 1,
      offsetX: 3.943202257156372,
      offsetY: 10.52558708190918,
      color: '#349141',
      orientation: 0,
      normal: 'https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/internal-dashboard/images/HonPfzx7iBQ4ZuHa-R6gg',
      highlighted: '',
      type: 6,
      width: 1,
      height: 2,
      previewMessage: 'custom object',
      distThreshold: 5,
      id: 'water - QGSCUNlONJ9K6aJNPjDK_410f7df5-518b-450d-9a5e-d744cc25fb79',
      objectPlacerId: 'XMtE7QpdxoUiQsVVWvHcMvIfpPK2',
      zIndex: 803,
      // properties: [Object]
    }
    me!.inventory.items["randomId1"] = mynewobject
    const mynewobject2 = {
      // _tags: [Array],
      // templateId: 'ArborVitae - _QGSCUNlONJ9K6aJNPjDK',
      _name: 'Fire',
      x: me!.x,
      y: me!.y + 1,
      offsetX: 3.943202257156372,
      offsetY: 10.52558708190918,
      color: '#349141',
      orientation: 0,
      normal: 'https://cdn.gather.town/storage.googleapis.com/gather-town.appspot.com/internal-dashboard/images/HonPfzx7iBQ4ZuHa-R6gg',
      highlighted: '',
      type: 6,
      width: 1,
      height: 2,
      previewMessage: 'custom object',
      distThreshold: 5,
      id: 'Fire - QGSCUNlONJ9K6aJNPjDK_410f7df5-518b-450d-9a5e-d744cc25fb79',
      objectPlacerId: 'XMtE7QpdxoUiQsVVWvHcMvIfpPK2',
      zIndex: 803,
      // properties: [Object]
    }
    me!.inventory.items["randomId2"] = mynewobject2
    // mymap.objects["randomId"] = mynewobject

    // TODO: SEE HOW TO PLACE THINGS ON A MAP. THIS DOESN QUITE WORK BUT we see it working in https://github.com/gathertown/the-forest/blob/6cc6546b8419a4b7d36edcb254cd1c7f66df4724/index.ts#L147
    // game.sendAction({
    //   $case: "mapUpdateObjects",
    //   mapUpdateObjects: {
    //     mapId: GATHER_MAP_ID,
    //     objects: {
    //       ["randomId"]: mynewobject,
    //     },
    //   },
    // });
    // // const { x, y } = game.partialMaps[GATHER_MAP_ID].objects?.["randomId"]!; // the ! tells TS that I'm certain this tree exists. slightly unsafe but cleaner
    // console.log("my position", me?.x, me?.y)
    // game.setImpassable(GATHER_MAP_ID, me.x, me.y + 1, true); // +1 because the y is the top of the tree, and positive y is down



    hasPlaced = true
  }







  console.log('[Event] "playerChats"', data);
  const message = data.playerChats;
  const players = game.getPlayersInMap(GATHER_MAP_ID)
  // console.log("message", message);
  // console.log("players", players);
  const player = players.find((player) => {
    return player.id === message.senderId;
  })
  // console.log("player", player);
  const inventory = player!.inventory;

  if (message.senderId === CurrentPlayerId) {
    // don't respond to our own messages
    console.log("ignoring our own message");
    return;
  }
  console.log("inventory", inventory);

  // console.log("messageType:", message.messageType);
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
      case "i":
      case "inventory":
        // IF THE SENTIMENT SPARKS JOY IN BOT, THEN DANCE
        game.chat(message.senderId, [], "", { contents: `Inventory:
- ${inventoryItemToNames(inventory.items).join('\n -')}` });
        break;
      default:
        game.setEmote("💭");
        const senderId = message.senderId

        const completion = await chatCompletion(message.contents, inventoryItemToNames(inventory.items));
        game.chat(message.senderId, [], "", { contents: `${completion.message.content}` });
        game.setEmote("");
    }
  } else if (message.recipient === "LOCAL_CHAT") {
    // TODO: FILTER OUT MESSAGES FROM OTHER BOTS
    if (!player!.name.endsWith("bot")) {
      game.setEmote("💭");
      const completion = await chatCompletion(message.contents, inventoryItemToNames(inventory.items))
      game.chat("LOCAL_CHAT", [], "", { contents: `${completion.message.content}

Inventory:
${inventoryItemToNames(inventory.items).join('\n')}
` });
      game.setEmote("");
    } else {
      console.log('did not respond to bot player ' + player!.name)
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
