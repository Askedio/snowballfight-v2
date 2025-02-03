import "./index.css";

import { createRoot } from "react-dom/client";
import { App } from "./App";
import { BrowserRouter, Route, Routes } from "react-router";
import { Terms } from "./Terms";
import { Privacy } from "./Privacy";

const root = createRoot(document.getElementById("app") as HTMLElement);

root.render(
  <BrowserRouter>
    <Routes>
    <Route path="terms" element={<Terms />} />
    <Route path="privacy" element={<Privacy />} />
    <Route path="*" element={<App />} />
    </Routes>
  </BrowserRouter>
);
