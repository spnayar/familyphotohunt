import Link from 'next/link';
import { HelpGuide } from '@/lib/help-content';

type HelpGuideViewProps = {
  guide: HelpGuide;
  backHref?: string;
  backLabel?: string;
};

export function HelpGuideView({
  guide,
  backHref = '/help',
  backLabel = '← All help guides',
}: HelpGuideViewProps) {
  const otherGuide =
    guide.audience === 'admin'
      ? { href: '/help/participants', label: 'Participant guide' }
      : { href: '/help/admin', label: 'Organizer guide' };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={backHref}
              className="text-blue-600 hover:text-blue-800 text-sm sm:text-base touch-manipulation min-h-[44px] inline-flex items-center"
            >
              {backLabel}
            </Link>
            <Link
              href={otherGuide.href}
              className="text-sm text-gray-600 hover:text-blue-700 touch-manipulation min-h-[44px] inline-flex items-center"
            >
              Switch to {otherGuide.label} →
            </Link>
          </div>

          <header className="mb-8 rounded-xl bg-white shadow-lg border border-gray-200 p-6 sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-600 mb-2">Photo Hunt help</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">{guide.title}</h1>
            <p className="text-base sm:text-lg text-gray-600">{guide.subtitle}</p>
          </header>

          <nav className="mb-8 rounded-lg bg-white/80 border border-gray-200 p-4 sm:p-5">
            <p className="text-sm font-semibold text-gray-900 mb-3">On this page</p>
            <ul className="space-y-2">
              {guide.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-sm text-blue-700 hover:text-blue-900 hover:underline"
                  >
                    {section.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="space-y-6">
            {guide.sections.map((section, index) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-6 rounded-xl bg-white shadow-md border border-gray-200 p-5 sm:p-6"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">
                    {index + 1}
                  </span>
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900">{section.title}</h2>
                    {section.summary && (
                      <p className="mt-1 text-sm font-medium text-blue-800">{section.summary}</p>
                    )}
                  </div>
                </div>

                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="text-sm sm:text-base text-gray-700 leading-relaxed mb-3 last:mb-0">
                    {paragraph}
                  </p>
                ))}

                {section.steps && section.steps.length > 0 && (
                  <ol className="mt-3 space-y-2 list-decimal list-inside text-sm sm:text-base text-gray-700 leading-relaxed">
                    {section.steps.map((step) => (
                      <li key={step} className="pl-1">
                        {step}
                      </li>
                    ))}
                  </ol>
                )}

                {section.tips && section.tips.length > 0 && (
                  <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-2">Tips</p>
                    <ul className="space-y-1.5">
                      {section.tips.map((tip) => (
                        <li key={tip} className="text-sm text-amber-900 leading-relaxed">
                          • {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center min-h-[44px] px-6 text-blue-600 hover:text-blue-800 font-medium touch-manipulation"
            >
              Back to Photo Hunt
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
