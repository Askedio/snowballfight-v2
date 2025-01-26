import "./index.css";

import { createRoot } from "react-dom/client";
import { App } from "./App";
import { BrowserRouter, Route, Routes } from "react-router";

const root = createRoot(document.getElementById("app") as HTMLElement);

root.render(
  <BrowserRouter>
    <Routes>
      <Route path="*" element={<App />} />
    </Routes>
  </BrowserRouter>
);
