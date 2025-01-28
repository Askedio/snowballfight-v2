import { colyseus } from "../use-colyseus/colyseus";

console.log(process.env.BACKEND_URL)

// To-do, we can share game states..
export const {
  client,
  connectToColyseus,
  disconnectFromColyseus,
  useColyseusRoom,
  useColyseusState,
  roomStore,
  stateStore,
} = colyseus<any>(process.env.BACKEND_URL);
