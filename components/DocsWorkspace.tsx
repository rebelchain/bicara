'use client';

import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy, Download, FileText } from 'lucide-react';
import type { BicaraDocFile } from '@/lib/docs-loader';

interface DocsWorkspaceProps {
  docs: BicaraDocFile[];
}

export default function DocsWorkspace({ docs }: DocsWorkspaceProps) {
  const [selectedId, setSelectedId] = useState<string>(docs[0]?.id ?? 'claude');
  const [copied, setCopied] = useState(false);

  const activeDoc = docs.find((d) => d.id === selectedId) ?? docs[0];

  const handleCopy = async () => {
    if (!activeDoc) return;
    try {
      await navigator.clipboard.writeText(activeDoc.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures in restricted frames
    }
  };

  const handleDownload = () => {
    if (!activeDoc) return;
    const blob = new Blob([activeDoc.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeDoc.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const rootDocs = docs.filter((d) => d.category === 'Root');
  const specDocs = docs.filter((d) => d.category === 'Specs');

  return (
    <section aria-label="Updated Bicara Documentation Repository" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E2E6DC]">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-[#457249]">
            Live repository files · /bicara-docs/ · Synced with 2026 SDK audit
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-black tracking-tight text-[#1E3124] [text-wrap:balance]">
            Updated Bicara Documentation Suite
          </h2>
        </div>

        {activeDoc && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-[#1E3124] bg-white border border-[#D4DDD0] hover:border-[#356341] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#2E6B40]" />
                  <span className="text-[#2E6B40]">Copied Markdown</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Markdown</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#356341] hover:bg-[#2A5135] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {activeDoc.filename}</span>
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sidebar Document Selector */}
        <aside
          aria-label="Documentation files"
          className="lg:col-span-4 xl:col-span-3 bg-white border border-[#E2E6DC] rounded-2xl p-4 space-y-5 lg:sticky lg:top-24 shadow-[0_6px_20px_rgba(30,49,36,0.04)]"
        >
          <div className="space-y-1.5">
            <div className="px-2 text-xs font-semibold text-[#788A7D]">bicara-docs/</div>
            <div className="space-y-1">
              {rootDocs.map((doc) => {
                const isSelected = doc.id === activeDoc?.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedId(doc.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#EEF5EA] text-[#1E3124] border border-[#C6DBC2]'
                        : 'text-[#526658] hover:text-[#1E3124] hover:bg-[#FAF9F5] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-[#2E6B40]' : 'text-[#8C9C91]'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{doc.filename}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#687A6D] line-clamp-2 leading-snug">
                      {doc.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-[#E9EDE3]">
            <div className="px-2 text-xs font-semibold text-[#788A7D]">bicara-docs/docs/</div>
            <div className="space-y-1">
              {specDocs.map((doc) => {
                const isSelected = doc.id === activeDoc?.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedId(doc.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#EEF5EA] text-[#1E3124] border border-[#C6DBC2]'
                        : 'text-[#526658] hover:text-[#1E3124] hover:bg-[#FAF9F5] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono text-xs font-semibold">
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-[#2E6B40]' : 'text-[#8C9C91]'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{doc.filename}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#687A6D] line-clamp-2 leading-snug">
                      {doc.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Markdown Reader */}
        <article className="lg:col-span-8 xl:col-span-9 bg-white border border-[#E2E6DC] rounded-2xl p-6 sm:p-8 min-w-0 shadow-[0_6px_20px_rgba(30,49,36,0.04)]">
          {activeDoc && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-6 border-b border-[#E9EDE3] text-xs text-[#526658]">
                <span className="font-mono font-semibold text-[#1E3124]">
                  {activeDoc.relativePath}
                </span>
                <span>Updated for Dev3pack Hackathon · Nov 2026</span>
              </div>
              <div className="bicara-markdown">
                <Markdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h2 className="md-doc-title">{children}</h2>,
                    h2: ({ children }) => <h3 className="md-doc-section">{children}</h3>,
                  }}
                >
                  {activeDoc.content}
                </Markdown>
              </div>
            </>
          )}
        </article>
      </div>
    </section>
  );
}
