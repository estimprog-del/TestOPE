import js from "@eslint/js";

export default [
  {
    ignores: ["dist/**", "node_modules/**"]
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        // Entorno navegador / service worker
        self: "readonly",
        caches: "readonly",
        location: "readonly",
        navigator: "readonly",
        URL: "readonly",
        fetch: "readonly",
        Request: "readonly",
        Response: "readonly",
        Headers: "readonly",
        console: "readonly",
        process: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        indexedDB: "readonly",
        Blob: "readonly",
        FileReader: "readonly",
        document: "readonly",
        window: "readonly",
        HTMLElement: "readonly",
        HTMLDialogElement: "readonly",
        HTMLButtonElement: "readonly",
        Image: "readonly",
        Audio: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        clearTimeout: "readonly",
        clearInterval: "readonly"
      }
    }
  }
];
