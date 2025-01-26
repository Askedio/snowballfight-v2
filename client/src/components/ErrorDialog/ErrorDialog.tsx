import { useEffect, useState } from "react";
import "./ErrorDialog.css";
import { EventBus } from "../../lib/EventBus";

export function ErrorDialog() {
  const [error, setError] = useState("");

  useEffect(() => {
    EventBus.on("error", ({ error }) => {
      setError(error);
    });

    return () => {
      EventBus.removeListener("error");
    };
  }, []);

  if (!error) {
    return;
  }

  return <div className="error">{error}</div>;
}
