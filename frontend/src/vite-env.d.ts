/// <reference types="vite/client" />

interface ImportMeta {
  hot: {
    accept: () => void;
    dispose: (callback: () => void) => void;
  };
} 