import { useState, useEffect, useRef } from "react";
import { useColyseusRoom } from "../../lib/colyseus";
import "./Chat.css";

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

    // Adding the mouseleave event listener to blur the input when the mouse leaves
    const chatInput = chatInputRef.current;
    if (chatInput) {
      const handleMouseLeave = () => {
        if (document.activeElement === chatInput) {
          chatInput.blur(); // Remove focus when the mouse leaves the input
        }
      };

      chatInput.addEventListener("mouseleave", handleMouseLeave);

      // Cleanup event listener on component unmount
      return () => {
        chatInput.removeEventListener("mouseleave", handleMouseLeave);
      };
    }
  }, [room]);

  // Don't render if no room is available
  if (!room) return null;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (isDisabled) {
        return;
      }

      setIsDisabled(true);

      // Trim the input and send it if there's a message
      const trimmedMessage = message.trim();
      if (trimmedMessage) {
        room.send("chat", { message: trimmedMessage });

        setMessage(""); // Clear the input after sending
      }

      // Re-enable the input after 1 second
      setTimeout(() => {
        setIsDisabled(false);
      }, 1000);

      e.preventDefault();
    }
  };

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
      />
    </div>
  );
}
