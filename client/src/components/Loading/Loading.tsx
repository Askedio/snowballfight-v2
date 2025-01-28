import { useEffect, useState } from "react";
import { EventBus } from "../../lib/EventBus";
import "./Loading2.css";

export function Loading() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    EventBus.on("scene-ready", () => {
      setLoading(false);
    });

    return () => {
      EventBus.removeListener("scene-ready");
    };
  }, []);

  if (!loading) {
    return;
  }

  return (
    <div id="loading-wrapper">
      <div id="loading">
        <div className="loading-container">
          <img
            className="loading-image"
            src="/assets/images/weapons/snowball.png"
            alt="Loading..."
          />
          <img
            className="loading-image"
            src="/assets/images/weapons/snowball.png"
            alt="Loading..."
          />
          <img
            className="loading-image"
            src="/assets/images/weapons/snowball.png"
            alt="Loading..."
          />
        </div>
        preparing the battlefield...
      </div>
    </div>
  );
}
