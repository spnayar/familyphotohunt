export const SITE_CONTACT_EMAIL = 'spnayar@gmail.com';

export function getSiteContactMailtoUrl(subject = 'Photo Hunt inquiry'): string {
  return `mailto:${SITE_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;
}
