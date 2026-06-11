import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  DEFAULT_UI_LOCALE,
  I18N_NAMESPACES,
  type I18nNamespace,
  type SupportedUiLocale,
} from "@shared/i18n/locales";
import { getResolvedUiLocale, loadLocalePreference, applyHtmlLang } from "@/lib/localeStorage";
import { bootstrapDocumentLocale } from "@/lib/localeBootstrap";

type LocaleBundle = Record<I18nNamespace, Record<string, unknown>>;

const localeLoaders: Record<SupportedUiLocale, () => Promise<LocaleBundle>> = {
  en: () => importLocale("en"),
  ko: () => importLocale("ko"),
  ja: () => importLocale("ja"),
  zh: () => importLocale("zh"),
  de: () => importLocale("de"),
  fr: () => importLocale("fr"),
  es: () => importLocale("es"),
};

async function importLocale(locale: SupportedUiLocale): Promise<LocaleBundle> {
  const modules = await Promise.all(
    I18N_NAMESPACES.map((ns) => import(`../locales/${locale}/${ns}.json`)),
  );
  const bundle = {} as LocaleBundle;
  I18N_NAMESPACES.forEach((ns, i) => {
    bundle[ns] = modules[i].default as Record<string, unknown>;
  });
  return bundle;
}

let initPromise: Promise<void> | null = null;

export async function initI18n(): Promise<typeof i18n> {
  if (initPromise) {
    await initPromise;
    return i18n;
  }

  initPromise = (async () => {
    bootstrapDocumentLocale();
    const preference = loadLocalePreference().uiLocale;
    const resolved = getResolvedUiLocale(preference);
    const resources: Record<string, Record<string, Record<string, unknown>>> = {
      [resolved]: (await localeLoaders[resolved]()) as unknown as Record<string, Record<string, unknown>>,
    };

    if (resolved !== DEFAULT_UI_LOCALE) {
      resources[DEFAULT_UI_LOCALE] = (await localeLoaders[DEFAULT_UI_LOCALE]()) as unknown as Record<
        string,
        Record<string, unknown>
      >;
    }

    await i18n.use(initReactI18next).init({
      resources,
      lng: resolved,
      fallbackLng: DEFAULT_UI_LOCALE,
      defaultNS: "common",
      ns: [...I18N_NAMESPACES],
      interpolation: { escapeValue: false },
      returnEmptyString: false,
      react: { useSuspense: false, bindI18n: "languageChanged loaded" },
    });

    applyHtmlLang(resolved);
  })();

  await initPromise;
  return i18n;
}

export async function changeUiLanguage(locale: SupportedUiLocale): Promise<void> {
  if (!i18n.hasResourceBundle(locale, "common")) {
    const bundle = await localeLoaders[locale]();
    for (const ns of I18N_NAMESPACES) {
      i18n.addResourceBundle(locale, ns, bundle[ns], true, true);
    }
  }
  await i18n.changeLanguage(locale);
  applyHtmlLang(locale);
}

export { i18n };
