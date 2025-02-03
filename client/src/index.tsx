import "./index.css";

import { createRoot } from "react-dom/client";
import { App } from "./App";
import {
  Route,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
} from "react-router";
import { Terms } from "./Terms";
import { Privacy } from "./Privacy";

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/">
      <Route index element={<App />} />
      <Route path="terms" element={<Terms />} />
      <Route path="privacy" element={<Privacy />} />
    </Route>
  )
);

const root = createRoot(document.getElementById("app") as HTMLElement);

root.render(
  <>
    <RouterProvider router={router} />
  </>
);
