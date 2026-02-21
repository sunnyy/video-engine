import React from "react";
import "./App.css"
import { useProjectStore } from "./store/useProjectStore";

import AIGenerator from "./pages/AIGenerator";
import Editor from "./pages/Editor";

export default function App() {
  const project = useProjectStore((s) => s.project);

  if (!project) {
    return <AIGenerator />;
  }

  return <Editor />;
}