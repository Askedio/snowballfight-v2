import { useColyseusState } from "../../lib/colyseus";

export function Game({game}: {game: Phaser.Game}) {
    const state = useColyseusState(); // Get the entire room state

    if(!state) {
        return;
    }


    return <></>

}