import "@dango/ui/globals.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { I18nextProvider } from "react-i18next";

import App from "./App";
import { QueryProvider } from "./components/query-provider";
import { i18n } from "./i18n/i18n";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryProvider>
        <App />
      </QueryProvider>
    </I18nextProvider>
  </React.StrictMode>,
);
