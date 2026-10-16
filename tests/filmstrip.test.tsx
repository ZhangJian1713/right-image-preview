import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ImagePreview } from '../src/components/ImagePreview';
import { ThumbnailsStrip } from '../src/components/ImagePreview/controls/ThumbnailsStrip';

const images = [{ id: 'a', src: 'original:a', thumbnailSrc: null }, { id: 'b', src: 'original:b', thumbnailSrc: 'thumb:200' }];

describe('host-controlled filmstrip', () => {
  it('toggles independently, reports hidden demand and retains the main DOM image', () => {
    const demand = vi.fn();
    function Host() {
      const [visible, setVisible] = useState(false);
      return <ImagePreview visible images={images} language="en" preloadRadius={0} preloadDisplaySlots={0}
        progressiveMain={false} showThumbnailToggle showThumbnails={visible}
        onThumbnailsVisibleChange={setVisible} onThumbnailVisibleIndexesChange={demand} />;
    }
    const { container } = render(<Host />);
    const main = container.querySelector('img[src="original:a"]');
    fireEvent.click(screen.getByRole('button', { name: 'Show filmstrip' }));
    expect(screen.getByRole('button', { name: 'Hide filmstrip' })).toHaveAttribute('aria-pressed', 'true');
    expect(demand).toHaveBeenLastCalledWith([0, 1]);
    expect(container.querySelector('[data-rip-media-viewport]')).not.toHaveStyle({ inset: '0 0 0px 0' });
    expect(container.querySelector('img[src="original:a"]')).toBe(main);
    fireEvent.click(screen.getByRole('button', { name: 'Hide filmstrip' }));
    expect(demand).toHaveBeenLastCalledWith([]);
    expect(container.querySelector('img[src="original:a"]')).toBe(main);
  });

  it('never uses originals for explicit placeholders or failed thumbnails', () => {
    const select = vi.fn();
    const { container, rerender } = render(<ThumbnailsStrip entries={images.map((item, flatIndex) => ({ item, flatIndex }))}
      activeFlatIndex={0} ariaLabel="strip" thumbAria={(i) => String(i)} onSelect={select} errorLabel="unavailable" />);
    expect(container.querySelectorAll('img')).toHaveLength(1);
    const thumb = container.querySelector('img')!;
    expect(thumb).toHaveAttribute('src', 'thumb:200');
    fireEvent.error(thumb);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByTitle('unavailable')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '1' }));
    expect(select).toHaveBeenCalledWith(0);
    rerender(<ThumbnailsStrip entries={images.map((item, flatIndex) => ({ item: { ...item, thumbnailSrc: 'fresh:200' }, flatIndex }))}
      activeFlatIndex={0} ariaLabel="strip" thumbAria={(i) => String(i)} onSelect={select} />);
    expect(container.querySelectorAll('img[src="fresh:200"]')).toHaveLength(2);
  });

  it('bounds initial mounting for large folders and does not recenter when small URLs arrive', () => {
    const scrollTo = vi.fn();
    const original = HTMLElement.prototype.scrollTo;
    HTMLElement.prototype.scrollTo = scrollTo;
    try {
      const entries = Array.from({ length: 10000 }, (_, flatIndex) => ({ flatIndex, item: { src: `original:${flatIndex}`, thumbnailSrc: null } }));
      const demand = vi.fn();
      const props = { activeFlatIndex: 5000, ariaLabel: 'strip', thumbAria: (i: number) => String(i), onSelect: vi.fn(), onVisibleIndexesChange: demand };
      const { container, rerender } = render(<ThumbnailsStrip entries={entries} {...props} />);
      expect(container.querySelectorAll('button').length).toBeLessThan(40);
      expect(demand.mock.calls.every(([indexes]) => indexes.length < 40)).toBe(true);
      expect(demand.mock.calls[0][0]).toContain(5000);
      const calls = scrollTo.mock.calls.length;
      rerender(<ThumbnailsStrip entries={entries.map((entry) => ({ ...entry, item: { ...entry.item, thumbnailSrc: 'thumb:200' } }))} {...props} />);
      expect(scrollTo).toHaveBeenCalledTimes(calls);
    } finally { HTMLElement.prototype.scrollTo = original; }
  });
});
