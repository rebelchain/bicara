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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#22272D]">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#94A3B8]">
            Live repository files · /bicara-docs/ · Synced with 2026 SDK audit
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC] [text-wrap:balance]">
            Updated Bicara Documentation Suite
          </h1>
        </div>

        {activeDoc && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#E2E8F0] bg-[#14171A] border border-[#262B30] hover:border-[#3A414A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span className="text-[#22C55E]">Copied Markdown</span>
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
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#052E16] bg-[#22C55E] hover:bg-[#16A34A] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
          className="lg:col-span-4 xl:col-span-3 bg-[#14171A] border border-[#23282E] rounded-xl p-4 space-y-5 lg:sticky lg:top-20"
        >
          <div className="space-y-1.5">
            <div className="px-2 text-xs font-medium text-[#64748B]">bicara-docs/</div>
            <div className="space-y-1">
              {rootDocs.map((doc) => {
                const isSelected = doc.id === activeDoc?.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedId(doc.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#1D2328] text-[#F8FAFC] border border-[#22C55E]/40'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#191D21] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono text-xs font-medium">
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-[#22C55E]' : 'text-[#64748B]'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{doc.filename}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#64748B] line-clamp-2 leading-snug">
                      {doc.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-[#22272D]">
            <div className="px-2 text-xs font-medium text-[#64748B]">bicara-docs/docs/</div>
            <div className="space-y-1">
              {specDocs.map((doc) => {
                const isSelected = doc.id === activeDoc?.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedId(doc.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#1D2328] text-[#F8FAFC] border border-[#22C55E]/40'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#191D21] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono text-xs font-medium">
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-[#22C55E]' : 'text-[#64748B]'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{doc.filename}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#64748B] line-clamp-2 leading-snug">
                      {doc.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Markdown Reader */}
        <article className="lg:col-span-8 xl:col-span-9 bg-[#14171A] border border-[#23282E] rounded-xl p-6 sm:p-8 min-w-0">
          {activeDoc && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-6 border-b border-[#22272D] text-xs text-[#94A3B8]">
                <span className="font-mono text-[#E2E8F0]">{activeDoc.relativePath}</span>
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
