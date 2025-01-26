import { useState, useEffect, useRef } from "react";
import { useColyseusRoom, useColyseusState } from "../../lib/colyseus";
import "./Chat.css";
import { EventBus } from "../../lib/EventBus";

interface ChatMessage {
  playerName: string;
  message: string;
  timestamp: number;
}

export function Chat() {
  const room = useColyseusRoom();
  const [message, setMessage] = useState("");
  const [isDisabled, setIsDisabled] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);

  const player = useColyseusState((state) =>
    state?.players?.get(room?.sessionId)
  );

  useEffect(() => {
    EventBus.on("scene-ready", () => {
      setLoading(false);
    });

    return () => {
      EventBus.removeListener("scene-ready");
    };
  }, []);

  // Handle incoming chat messages
  useEffect(() => {
    if (!room) return;

    room.onMessage(
      "chat",
      ({ playerName, message, timestamp }: ChatMessage) => {
        const newMessage = { playerName, message, timestamp };
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      }
    );
  }, [room]);

  useEffect(() => {
    const chatInput = chatInputRef.current;
    if (chatInput) {
      const handleMouseLeave = () => {
        chatInput.blur();
      };

      chatInput.addEventListener("mouseleave", handleMouseLeave);

      return () => {
        chatInput.removeEventListener("mouseleave", handleMouseLeave);
      };
    }
  }, [chatInputRef.current]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (isDisabled) {
        return;
      }

      setIsDisabled(true);

      const trimmedMessage = message.trim();
      if (trimmedMessage) {
        room.send("chat", { message: trimmedMessage });

        setMessage("");
      }
      chatInputRef.current.blur();

      // Re-enable the input after 1 second
      setTimeout(() => {
        setIsDisabled(false);
      }, 2000);

      e.preventDefault();
    }
  };

  const handleFocus = () => {
    EventBus.emit("disable-keyboard");
  };

  const handleBlur = () => {
    EventBus.emit("enable-keyboard");
  };

  if (loading || !player) {
    return;
  }

  return (
    <div className="chat-container">
      <ul className="chat-box">
        {messages.map((msg) => (
          <li key={msg.timestamp}>
            {msg.playerName}: {msg.message}
          </li>
        ))}
      </ul>

      <input
        ref={chatInputRef}
        className="chat-send"
        type="text"
        placeholder="Type to chat..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={isDisabled}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </div>
  );
}
