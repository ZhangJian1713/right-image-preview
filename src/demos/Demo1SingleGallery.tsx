import { useRef, useState } from 'react';
import { ImagePreview } from '../components/ImagePreview';
import type { ImageItem, ImagePreviewRef } from '../components/ImagePreview';
import { gridStyle, sectionDescStyle, sectionHeadStyle } from './demoStyles';
import type { DemoStrings } from './demoLocale';
import { RefControls, ThumbCard } from './shared';

const SINGLE_GALLERY: ImageItem[] = [
  { src: 'https://picsum.photos/seed/sg-mtn/1920/1280', alt: '山间云雾', name: 'mountain-mist.jpg' },
  {
    src: 'https://picsum.photos/seed/sg-fst/1280/1920',
    alt: '竖幅树林',
    name: 'forest-portrait-this-is-a-very-very-long-long-file-name-so-that-it-can-be-tested-with-a-very-long-file-name.jpg',
  },
  { src: 'https://picsum.photos/seed/sg-cst/2400/1600', alt: '海岸线', name: 'coastline.jpg' },
  { src: 'https://picsum.photos/seed/sg-town/1600/1200', alt: '古镇街道', name: 'old-town.jpg' },
  { src: 'https://picsum.photos/seed/sg-sun/3000/2000', alt: '草原日落', name: 'grassland-sunset.jpg' },
];

export function Demo1SingleGallery({ t, previewLanguage }: { t: DemoStrings; previewLanguage: string }) {
  const [visible, setVisible] = useState(false);
  const [index, setIndex] = useState(0);
  const previewRef = useRef<ImagePreviewRef>(null);

  const open = (i: number) => {
    setIndex(i);
    setVisible(true);
  };

  return (
    <>
      <section>
        <h2 style={sectionHeadStyle}>{t.demo1Title}</h2>
        <p style={sectionDescStyle}>{t.demo1Desc}</p>
        <div style={gridStyle}>
          {SINGLE_GALLERY.map((img, i) => (
            <ThumbCard
              key={img.src}
              src={img.src}
              alt={img.alt ?? ''}
              label={img.name ?? img.alt ?? ''}
              ariaLabel={t.thumbAria(img.name ?? img.alt ?? '')}
              onClick={() => open(i)}
            />
          ))}
        </div>
        <RefControls previewRef={previewRef} t={t} />
      </section>

      <ImagePreview
        ref={previewRef}
        images={SINGLE_GALLERY}
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
