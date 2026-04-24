import { useEffect, useState } from 'react';
import { Demo1SingleGallery } from './demos/Demo1SingleGallery';
import { Demo2FolderGroups } from './demos/Demo2FolderGroups';
import { Demo3HighRes } from './demos/Demo3HighRes';
import { DEMO_LANG_STORAGE_KEY, readInitialLocale, STRINGS, type DemoLocale } from './demos/demoLocale';
import { dividerStyle } from './demos/demoStyles';
import { LangSwitch } from './demos/shared';

export default function App() {
  const [locale, setLocale] = useState<DemoLocale>(readInitialLocale);
  const t = STRINGS[locale];
  const previewLanguage = locale === 'zh' ? 'zh-CN' : 'en';

  useEffect(() => {
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    document.title = locale === 'zh' ? 'right-image-preview 演示' : 'right-image-preview demo';
    try {
      localStorage.setItem(DEMO_LANG_STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
  }, [locale]);

  return (
    <div
      style={{
        position: 'relative',
        minHeight: '100vh',
        background: '#0f1117',
        color: '#e8e8e8',
        fontFamily: '"Inter", "PingFang SC", system-ui, sans-serif',
        padding: '40px 32px',
        maxWidth: 1200,
        margin: '0 auto',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 36,
          right: 32,
          zIndex: 2,
        }}
      >
        <LangSwitch locale={locale} onChange={setLocale} t={t} />
      </div>

      <header style={{ marginBottom: 40, paddingRight: 200 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>{t.title}</h1>
        <p style={{ margin: '8px 0 0', color: '#666', fontSize: 14 }}>{t.subtitle}</p>
      </header>

      {/* Shortcut legend: <kbd> marks keyboard keys (semantic HTML, better for a11y); styled like key caps */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 44 }}>
        {t.shortcuts.map(([key, desc]) => (
          <div
            key={key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              background: '#1a1d27',
              borderRadius: 6,
              padding: '3px 10px',
              fontSize: 12,
            }}
          >
            <kbd
              style={{
                background: '#252836',
                border: '1px solid #3a3d4a',
                borderRadius: 4,
                padding: '1px 6px',
                fontFamily: 'monospace',
                fontSize: 11,
                color: '#c8d0e8',
              }}
            >
              {key}
            </kbd>
            <span style={{ color: '#777' }}>{desc}</span>
          </div>
        ))}
      </div>

      {/* Demo 1: flat `images` list, global index in toolbar; ref API sample */}
      <Demo1SingleGallery t={t} previewLanguage={previewLanguage} />

      <hr style={dividerStyle} />

      {/* Demo 2: `groupedImages` folders, `defaultGroupedSelection` opens a chosen thumb; side arrows, etc. */}
      <Demo2FolderGroups t={t} locale={locale} previewLanguage={previewLanguage} />

      <hr style={dividerStyle} />

      {/* Demo 3: local high-res samples under public/test-images; first paint, zoom, pan */}
      <Demo3HighRes t={t} locale={locale} previewLanguage={previewLanguage} />
    </div>
  );
}
