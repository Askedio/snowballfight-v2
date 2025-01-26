import { useState, useRef, useEffect } from "react";
import "./RoomModal.css";

interface RoomModalProps {
  currentRoom: string;
  onChangeRoom: (newRoomName: string) => void;
  onClose: () => void;
}

export function RoomModal({ currentRoom, onChangeRoom, onClose }: RoomModalProps) {
  const [newRoomName, setNewRoomName] = useState(currentRoom);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null); // Ref for the input field

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close the modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleSubmit = () => {
    onChangeRoom(newRoomName);
    onClose();
  };

  return (
    <div className="room-modal-overlay">
      <div className="room-modal" ref={modalRef}>
        <h2 className="text-lg font-bold mb-4">Change Room</h2>
        <input
          type="text"
          placeholder="Room Name"
          className="input-field w-full mb-4"
          value={newRoomName}
          onChange={(e) => setNewRoomName(e.target.value)}
          ref={inputRef}
        />
        <button type="button" className="btn-primary w-full" onClick={handleSubmit}>
          Change Room
        </button>
      </div>
    </div>
  );
}
