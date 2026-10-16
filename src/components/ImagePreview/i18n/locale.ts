export type { LocaleStrings } from './localeTypes';

import type { LocaleStrings } from './localeTypes';
import { enStrings } from './locales/en';
import { zhStrings } from './locales/zh';
import { zhTWStrings } from './locales/zh-TW';

/** Built-in locale map. Extend or override via the `language` prop. */
const LOCALES: Record<string, LocaleStrings> = {
  en: enStrings,
  zh: zhStrings,
};

/**
 * Resolve a {@link LocaleStrings} object from a BCP 47 language tag.
 *
 * Chinese script/region subtags select Simplified or Traditional Chinese; other
 * languages match the primary subtag (`en-US` → `en`).
 * Falls back to English for any unrecognised locale.
 *
 * @param language – e.g. `"en"`, `"en-US"`, `"zh"`, `"zh-CN"`
 */
export function resolveStrings(language?: string): LocaleStrings {
  if (!language) return enStrings;
  const parts = language.trim().toLowerCase().split(/[-_]/);
  const primary = parts[0];
  if (primary === 'zh' && !parts.includes('hans') &&
    parts.some((part) => ['hant', 'tw', 'hk', 'mo'].includes(part))) return zhTWStrings;
  return LOCALES[primary] ?? enStrings;
}

/**
 * Merge caller-supplied overrides on top of the base locale resolved from `language`.
 *
 * Any field present in `overrides` replaces the corresponding built-in string;
 * omitted fields fall back to the base locale. Returns the base locale object
 * unchanged when `overrides` is `undefined` or empty.
 */
export function mergeStrings(
  base: LocaleStrings,
  overrides?: Partial<LocaleStrings>,
): LocaleStrings {
  if (!overrides) return base;
  return { ...base, ...overrides };
}
