import { Command } from "@colyseus/command";
import type { BaseRoom } from "../../rooms/BaseRoom";
import type { BaseRoomState } from "../../states/BaseRoomState";

export class ExampleCommand<
  TRoom extends BaseRoom<TState>,
  TState extends BaseRoomState
 
> extends Command<TRoom> {
  execute(payload: this["payload"]) {
    // Placeholder
  }
}
