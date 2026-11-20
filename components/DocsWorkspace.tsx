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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-white/10">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-[#CCFF00]">
            Live repository files · /bicara-docs/ · Synced with 2026 SDK audit
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#F4F4F5] [text-wrap:balance]">
            Updated Bicara Documentation Suite
          </h2>
        </div>

        {activeDoc && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#F4F4F5] bg-[#1A1A1A] border border-white/15 hover:border-[#CCFF00]/50 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#CCFF00]" />
                  <span className="text-[#CCFF00]">Copied Markdown</span>
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
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-[#0F0F0F] bg-[#CCFF00] hover:bg-[#B3E600] rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
          className="lg:col-span-4 xl:col-span-3 bg-[#1A1A1A] border border-white/10 rounded-2xl p-4 space-y-5 lg:sticky lg:top-24"
        >
          <div className="space-y-1.5">
            <div className="px-2 text-xs font-medium text-[#71717A]">bicara-docs/</div>
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
                        ? 'bg-[#CCFF00]/10 text-[#F4F4F5] border border-[#CCFF00]/40'
                        : 'text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono text-xs font-medium">
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-[#CCFF00]' : 'text-[#71717A]'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{doc.filename}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#71717A] line-clamp-2 leading-snug">
                      {doc.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5 pt-3 border-t border-white/10">
            <div className="px-2 text-xs font-medium text-[#71717A]">bicara-docs/docs/</div>
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
                        ? 'bg-[#CCFF00]/10 text-[#F4F4F5] border border-[#CCFF00]/40'
                        : 'text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-mono text-xs font-medium">
                      <FileText
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isSelected ? 'text-[#CCFF00]' : 'text-[#71717A]'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="truncate">{doc.filename}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#71717A] line-clamp-2 leading-snug">
                      {doc.summary}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        {/* Markdown Reader */}
        <article className="lg:col-span-8 xl:col-span-9 bg-[#1A1A1A] border border-white/10 rounded-2xl p-6 sm:p-8 min-w-0">
          {activeDoc && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-6 border-b border-white/10 text-xs text-[#A1A1AA]">
                <span className="font-mono text-[#F4F4F5]">{activeDoc.relativePath}</span>
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
