import { colyseus } from "../../use-colyseus/colyseus";


// To-do, we can share game states..
export const {
  client,
  connectToColyseus,
  disconnectFromColyseus,
  useColyseusRoom,
  useColyseusState,
  colyseusRoom,
  roomStore
} = colyseus<any>(process.env.BACKEND_URL);
