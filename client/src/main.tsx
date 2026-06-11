import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import App from "./App";
import "./index.css";
import { initI18n, i18n } from "./i18n";

async function bootstrap() {
  await initI18n();
  createRoot(document.getElementById("root")!).render(
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>,
  );
}

void bootstrap();
