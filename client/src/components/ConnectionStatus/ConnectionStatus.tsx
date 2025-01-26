import { useEffect, useState } from "react";
import "./ConnectionStatus.css";
import { EventBus } from "../../lib/EventBus";

export function ConnectionStatus() {
  const [status, setStatus] = useState("");

  useEffect(() => {
    EventBus.on("connection-status-changed", ({ status }) => {
      setStatus(status);
    });

    return () => {
      EventBus.removeListener("connection-status-changed");
    };
  }, []);

  if (!status) {
    return;
  }

  return <div className="connectionStatusText">{status}</div>;
}
