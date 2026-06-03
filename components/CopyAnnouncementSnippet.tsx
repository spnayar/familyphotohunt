'use client';

import { useState } from 'react';

type CopyAnnouncementSnippetProps = {
  title: string;
  description: string;
  message: string;
};

export function CopyAnnouncementSnippet({
  title,
  description,
  message,
}: CopyAnnouncementSnippetProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const handleCopy = async () => {
    setCopyError(false);
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
      return;
    } catch {
      // fall through to legacy copy
    }

    try {
      const textarea = document.createElement('textarea');
      textarea.value = message;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError(true);
    }
  };

  return (
    <div className="mt-4 rounded-lg border-2 border-gray-200 bg-gray-50 p-4 sm:p-5">
      <h3 className="text-base font-semibold text-gray-900 sm:text-lg">{title}</h3>
      <p className="mt-1 text-sm text-gray-600">{description}</p>
      <div className="mt-3 rounded-lg border border-gray-300 bg-white p-3 sm:p-4">
        <p className="whitespace-pre-wrap text-sm sm:text-base text-gray-900 leading-relaxed">{message}</p>
      </div>
      <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="inline-flex items-center justify-center bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 active:bg-blue-800 font-medium text-sm touch-manipulation min-h-[44px]"
        >
          {copied ? 'Copied!' : 'Copy message'}
        </button>
        {copyError && (
          <span className="text-sm text-red-600">Could not copy — select the text above and copy manually.</span>
        )}
      </div>
    </div>
  );
}
