import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Home from "../components/ranking-page.tsx";
import { loadRanking } from "../lib/feed.ts";
import bundled from "../data/youtube.json";
import "../app/globals.css";

const loadFeed = () => loadRanking(bundled);
createRoot(document.getElementById("root")!).render(
  <StrictMode><Home loadFeed={loadFeed} /></StrictMode>,
);
