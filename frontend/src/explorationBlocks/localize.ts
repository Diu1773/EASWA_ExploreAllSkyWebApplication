import type { Lang } from '../i18n';
import type { LocalizedText } from './types';

export function localize(value: LocalizedText, lang: Lang): string {
  if (typeof value === 'string') return value;
  return value[lang] ?? value.ko ?? value.en ?? '';
}

export function localizeList(values: LocalizedText[], lang: Lang): string[] {
  return values.map((value) => localize(value, lang));
}
