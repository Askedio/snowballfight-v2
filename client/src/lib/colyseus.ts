import { colyseus } from "../use-colyseus/colyseus";


// To-do, we can share game states..
export const {
  client,
  connectToColyseus,
  disconnectFromColyseus,
  useColyseusRoom,
  useColyseusState,
  roomStore,
  stateStore,
} = colyseus<any>(import.meta.env.VITE_BACKEND_URL);
 