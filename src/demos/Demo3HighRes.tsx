import { useMemo, useState } from 'react';
import { ImagePreview } from '../components/ImagePreview';
import type { ImageItem } from '../components/ImagePreview';
import { gridStyle, sectionDescStyle, sectionHeadStyle } from './demoStyles';
import type { DemoLocale, DemoStrings } from './demoLocale';
import { ThumbCard } from './shared';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

function largeGallery(locale: DemoLocale): ImageItem[] {
  const mbZh = '（18.6 MB）';
  const mbEn = ' (18.6 MB)';
  const mb2Zh = '（13.6 MB）';
  const mb2En = ' (13.6 MB)';
  const z = locale === 'zh';
  return [
    {
      src: `${BASE}/test-images/seagull-nebula.jpg`,
      alt: 'Seagull Nebula',
      name: `seagull-nebula.jpg${z ? mbZh : mbEn}`,
    },
    {
      src: `${BASE}/test-images/eagle-nebula.jpg`,
      alt: 'Eagle Nebula',
      name: `eagle-nebula.jpg${z ? mb2Zh : mb2En}`,
    },
  ];
}

export function Demo3HighRes({ t, locale, previewLanguage }: { t: DemoStrings; locale: DemoLocale; previewLanguage: string }) {
  const items = useMemo(() => largeGallery(locale), [locale]);
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);

  return (
    <>
      <section>
        <h2 style={sectionHeadStyle}>{t.demo3Title}</h2>
        <p style={sectionDescStyle}>{t.demo3Desc}</p>
        <div style={gridStyle}>
          {items.map((img, idx) => (
            <ThumbCard
              key={img.src}
              src={img.src}
              alt={img.alt ?? ''}
              label={img.name ?? img.alt ?? ''}
              ariaLabel={t.thumbAria(img.name ?? img.alt ?? '')}
              clickHint={t.thumbClickHint}
              onClick={() => {
                setIndex(idx);
                setVisible(true);
              }}
            />
          ))}
        </div>
      </section>

      <ImagePreview
        images={items}
        visible={visible}
        defaultIndex={index}
        initialMode="fit"
        firstZoomInStrategy="above-fit"
        zoomOutBelowMinBehaviour="noop"
        arrows="both"
        closeOnMaskClick
        wheelEnabled
        doubleClickEnabled
        switchImageResetTransform
        language={previewLanguage}
        onClose={() => setVisible(false)}
      />
    </>
  );
}
