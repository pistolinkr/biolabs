import { APP_VERSION_LABEL } from "@shared/version";
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Microscope, Zap, Layers, Cpu } from 'lucide-react';
import { useLocation } from 'wouter';
import PhaeleonLogo from '@/components/phaeleon/PhaeleonLogo';
import { HELIX_PATH, PHAELEON_PATH } from '@/lib/routes';

/**
 * Biolabs landing — platform hub with tool entry points.
 */
export default function Landing() {
  const { t } = useTranslation('landing');
  const { t: tc } = useTranslation('common');
  const [, setLocation] = useLocation();

  const features = [
    { icon: Microscope, key: 'visualization' as const },
    { icon: Zap, key: 'simulation' as const },
    { icon: Layers, key: 'layers' as const },
    { icon: Cpu, key: 'hud' as const },
  ];

  const openHelix = () => setLocation(HELIX_PATH);
  const openPhaeleon = () => setLocation(PHAELEON_PATH);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden overscroll-y-contain bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-accent flex items-center justify-center">
              <Microscope size={16} className="text-accent" />
            </div>
            <h1 className="text-lg font-medium tracking-tight">{tc('appName')}</h1>
          </div>
          <button
            onClick={openHelix}
            className="btn-compact flex items-center gap-2"
          >
            {t('tools.helix.action')}
            <ArrowRight size={12} />
          </button>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-4 py-24">
        <div className="max-w-3xl w-full text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold tracking-tight">
              {t('hero.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('hero.subtitle')}
            </p>
          </div>

          <div className="text-left space-y-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {t('tools.title')}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={openHelix}
                className="group w-full border border-border bg-card p-4 text-left transition-colors hover:border-accent"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Microscope size={18} className="text-accent" />
                      <h3 className="text-sm font-medium text-foreground">{t('tools.helix.name')}</h3>
                      <span className="border border-accent px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent">
                        LIVE
                      </span>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
                      {t('tools.helix.tagline')}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('tools.helix.description')}
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="mt-1 shrink-0 text-muted-foreground transition-colors group-hover:text-accent"
                  />
                </div>
              </button>

              <button
                type="button"
                onClick={openPhaeleon}
                className="group w-full border border-border bg-card p-4 text-left transition-colors hover:border-accent"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <PhaeleonLogo size={22} />
                      <h3 className="text-sm font-medium text-foreground">{t('tools.phaeleon.name')}</h3>
                    </div>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-accent">
                      {t('tools.phaeleon.tagline')}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {t('tools.phaeleon.description')}
                    </p>
                  </div>
                  <ArrowRight
                    size={16}
                    className="mt-1 shrink-0 text-muted-foreground transition-colors group-hover:text-accent"
                  />
                </div>
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              onClick={openHelix}
              className="inline-flex items-center gap-2 px-6 py-3 border border-accent text-accent hover:bg-accent hover:text-background transition-colors"
            >
              {t('hero.enterHelix')}
              <ArrowRight size={16} />
            </button>
            <button
              type="button"
              onClick={openPhaeleon}
              className="inline-flex items-center gap-2 px-6 py-3 border border-border bg-card text-foreground transition-colors hover:border-accent hover:text-accent"
            >
              <PhaeleonLogo size={22} />
              {t('tools.phaeleon.action')}
              <ArrowRight size={16} />
            </button>
          </div>

          <div className="pt-8 border-t border-border">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-8">
              {t('capabilities')}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.key} className="border border-border p-4 text-left">
                    <Icon size={20} className="text-accent mb-3" />
                    <h3 className="text-sm font-medium mb-1">{t(`features.${feature.key}.title`)}</h3>
                    <p className="text-xs text-muted-foreground">{t(`features.${feature.key}.description`)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 text-xs text-muted-foreground flex justify-between">
          <span>{APP_VERSION_LABEL}</span>
          <span>{t('footer.tagline')}</span>
        </div>
      </footer>
    </div>
  );
}
