import { useEffect, useState } from "react";
import { EventBus } from "../../EventBus";
import "./loading.css"

export function Loading() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    EventBus.on("scene-ready", (currentScene) => {
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
      prepairing the battlefield...
    </div>
  );
}
