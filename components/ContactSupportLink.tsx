import { getSiteContactMailtoUrl, SITE_CONTACT_EMAIL } from '@/lib/site-contact';

type ContactSupportLinkProps = {
  className?: string;
  subject?: string;
  children?: React.ReactNode;
};

export function ContactSupportLink({
  className = 'text-blue-700 hover:text-blue-900 underline underline-offset-2 touch-manipulation',
  subject,
  children = 'Email us',
}: ContactSupportLinkProps) {
  return (
    <a href={getSiteContactMailtoUrl(subject)} className={className}>
      {children}
    </a>
  );
}

type ContactSupportBlockProps = {
  className?: string;
};

export function ContactSupportBlock({ className = '' }: ContactSupportBlockProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white/90 p-4 sm:p-5 text-center text-sm text-gray-600 ${className}`}
    >
      <p className="font-medium text-gray-900 mb-1">Questions about Photo Hunt?</p>
      <p>
        Send us an email at{' '}
        <ContactSupportLink>{SITE_CONTACT_EMAIL}</ContactSupportLink>
        {' '}— we&apos;ll get back to you as soon as we can.
      </p>
    </div>
  );
}
