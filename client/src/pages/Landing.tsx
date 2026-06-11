import { APP_VERSION_LABEL } from "@shared/version";
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Microscope, Zap, Layers, Cpu } from 'lucide-react';
import { useLocation } from 'wouter';

/**
 * Biolabs Landing Page
 * 
 * Introduction to the platform with entry points
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

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-accent flex items-center justify-center">
              <Microscope size={16} className="text-accent" />
            </div>
            <h1 className="text-lg font-medium tracking-tight">{tc('appName')}</h1>
          </div>
          <button
            onClick={() => setLocation('/workspace')}
            className="btn-compact flex items-center gap-2"
          >
            {tc('actions.launch')}
            <ArrowRight size={12} />
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-24">
        <div className="max-w-3xl text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-5xl font-bold tracking-tight">
              {t('hero.title')}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t('hero.subtitle')}
            </p>
          </div>

          <button
            onClick={() => setLocation('/workspace')}
            className="inline-flex items-center gap-2 px-6 py-3 border border-accent text-accent hover:bg-accent hover:text-background transition-colors"
          >
            {t('hero.enterWorkspace')}
            <ArrowRight size={16} />
          </button>

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

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-6 text-xs text-muted-foreground flex justify-between">
          <span>{APP_VERSION_LABEL}</span>
          <span>{t('footer.tagline')}</span>
        </div>
      </footer>
    </div>
  );
}
