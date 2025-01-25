import "./Chat.css"

export function Chat() {
  return (
    <div id="chatOnReady">
      <div id="chat">
        <ul id="chatBox" />
        <input id="chatSend" type="text" placeholder="Type to chat..." />
      </div>
    </div>
  );
}
