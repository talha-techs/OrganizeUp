import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IoRocketOutline,
  IoBookOutline,
  IoLogoYoutube,
  IoFolderOutline,
  IoFlashOutline,
  IoPaperPlaneOutline,
  IoGlobeOutline,
  IoSearchOutline,
  IoCheckmarkOutline,
  IoCopyOutline,
  IoChevronForwardOutline,
  IoChevronBackOutline,
  IoMenuOutline,
  IoCloseOutline,
  IoLogoGithub,
  IoOpenOutline,
  IoShieldCheckmarkOutline,
  IoSparklesOutline,
  IoTimeOutline,
  IoThumbsUpOutline,
  IoThumbsDownOutline,
  IoListOutline,
} from 'react-icons/io5';
import { DOCS_SECTIONS } from './docsData';
import useDocumentTitle from '../../hooks/useDocumentTitle';

// Icon mapping helper
const iconMap = {
  IoRocketOutline: <IoRocketOutline className="w-4 h-4" />,
  IoBookOutline: <IoBookOutline className="w-4 h-4" />,
  IoLogoYoutube: <IoLogoYoutube className="w-4 h-4" />,
  IoFolderOutline: <IoFolderOutline className="w-4 h-4" />,
  IoFlashOutline: <IoFlashOutline className="w-4 h-4" />,
  IoPaperPlaneOutline: <IoPaperPlaneOutline className="w-4 h-4" />,
  IoGlobeOutline: <IoGlobeOutline className="w-4 h-4" />,
};

// Robust inline markdown renderer: bold, code, kbd, links, italic
const renderInlineText = (text) => {
  if (!text) return null;

  // Split by supported inline tokens
  const tokenRegex = /(<kbd>[\s\S]*?<\/kbd>|`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, i) => {
    if (!part) return null;

    // Keyboard shortcut <kbd>
    if (part.startsWith('<kbd>') && part.endsWith('</kbd>')) {
      const kbdText = part.replace('<kbd>', '').replace('</kbd>', '');
      return (
        <kbd
          key={i}
          className="px-2 py-0.5 mx-0.5 text-xs font-mono font-semibold rounded-md bg-[#21262d] text-cyan-300 border border-[#30363d] shadow-[0_2px_0_0_#30363d]"
        >
          {kbdText}
        </kbd>
      );
    }

    // Inline code `code`
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 text-xs font-mono rounded bg-[#161b22] text-cyan-400 border border-[#30363d]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    // Bold **text**
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }

    // Italic *text*
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return (
        <em key={i} className="text-[#c9d1d9] italic">
          {part.slice(1, -1)}
        </em>
      );
    }

    // Markdown link [text](url)
    if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
      if (match) {
        const isExternal = match[2].startsWith('http');
        return (
          <a
            key={i}
            href={match[2]}
            target={isExternal ? '_blank' : '_self'}
            rel={isExternal ? 'noopener noreferrer' : ''}
            className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors font-medium"
          >
            {match[1]}
          </a>
        );
      }
    }

    return part;
  });
};

// Robust Markdown Block Parser
const parseMarkdownBlocks = (rawContent) => {
  if (!rawContent) return [];

  // Protect code blocks from regex alteration
  const codeBlocks = [];
  let processed = rawContent.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // Ensure headings (###, ####) and Steps have blank lines before and after
  processed = processed.replace(/^(#{1,6}\s+[^\n]+)/gm, '\n\n$1\n\n');
  processed = processed.replace(/^(Step\s+\d+:)/gm, '\n\n$1');

  // Restore code blocks
  processed = processed.replace(/__CODE_BLOCK_(\d+)__/g, (_, idx) => {
    return codeBlocks[parseInt(idx, 10)];
  });

  // Split by 2 or more newlines into discrete blocks
  const rawBlocks = processed.split(/\n\s*\n/);
  const parsed = [];

  rawBlocks.forEach((block) => {
    const trimmed = block.trim();
    if (!trimmed) return;

    // Code block
    if (trimmed.startsWith('```')) {
      parsed.push({ type: 'code', raw: trimmed });
      return;
    }

    // Step card
    if (trimmed.startsWith('Step ')) {
      parsed.push({ type: 'step', raw: trimmed });
      return;
    }

    // Heading 3
    if (trimmed.startsWith('### ')) {
      const lines = trimmed.split('\n');
      const title = lines[0].replace('### ', '').trim();
      parsed.push({ type: 'h3', title });
      const rest = lines.slice(1).join('\n').trim();
      if (rest) {
        // Parse the leftover lines
        parseSubBlock(rest, parsed);
      }
      return;
    }

    // Heading 4
    if (trimmed.startsWith('#### ')) {
      const lines = trimmed.split('\n');
      const title = lines[0].replace('#### ', '').trim();
      parsed.push({ type: 'h4', title });
      const rest = lines.slice(1).join('\n').trim();
      if (rest) {
        parseSubBlock(rest, parsed);
      }
      return;
    }

    // Table
    if (trimmed.includes('|') && trimmed.split('\n').length >= 3) {
      parsed.push({ type: 'table', raw: trimmed });
      return;
    }

    parseSubBlock(trimmed, parsed);
  });

  return parsed;
};

// Helper to categorize list vs text
const parseSubBlock = (text, targetArray) => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return;

  const isOrdered = lines.every((l) => /^\d+\.\s/.test(l));
  if (isOrdered) {
    targetArray.push({ type: 'ol', items: lines });
    return;
  }

  const isUnordered = lines.every((l) => /^[-*]\s/.test(l));
  if (isUnordered) {
    targetArray.push({ type: 'ul', items: lines });
    return;
  }

  // Mixed or pure paragraph
  targetArray.push({ type: 'p', raw: text });
};

const DocsPage = () => {
  useDocumentTitle('Documentation & Procedures — OrganizeUp');
  const [searchParams, setSearchParams] = useSearchParams();

  // Find all items flat
  const allItems = useMemo(() => {
    const list = [];
    DOCS_SECTIONS.forEach((sec) => {
      sec.items.forEach((it) => {
        list.push({ ...it, sectionId: sec.id, sectionTitle: sec.title });
      });
    });
    return list;
  }, []);

  // Determine active item from search params or default to first
  const activeItemId = searchParams.get('topic') || allItems[0]?.id || 'intro';

  const activeItem = useMemo(() => {
    return allItems.find((it) => it.id === activeItemId) || allItems[0];
  }, [allItems, activeItemId]);

  const activeSection = useMemo(() => {
    return DOCS_SECTIONS.find((sec) => sec.id === activeItem?.sectionId) || DOCS_SECTIONS[0];
  }, [activeItem]);

  // Sidebar & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [feedbackGiven, setFeedbackGiven] = useState(null);

  // Search input focus ref
  const searchInputRef = useRef(null);

  // Keyboard shortcut (Ctrl+K or / to open search)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      } else if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [isSearchOpen]);

  // Navigation handlers
  const handleSelectTopic = (id) => {
    setSearchParams({ topic: id });
    setMobileMenuOpen(false);
    setIsSearchOpen(false);
    setFeedbackGiven(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Next / Previous navigation
  const currentIndex = allItems.findIndex((it) => it.id === activeItem?.id);
  const prevItem = currentIndex > 0 ? allItems[currentIndex - 1] : null;
  const nextItem = currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;

  // Filter items for search modal
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return allItems.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        it.summary.toLowerCase().includes(q) ||
        it.content.toLowerCase().includes(q) ||
        it.sectionTitle.toLowerCase().includes(q)
    );
  }, [searchQuery, allItems]);

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Parsed blocks for the current article
  const parsedContentBlocks = useMemo(() => {
    return parseMarkdownBlocks(activeItem?.content || '');
  }, [activeItem]);

  // Extract On This Page headings from parsed blocks
  const pageHeadings = useMemo(() => {
    const headings = [];
    parsedContentBlocks.forEach((b) => {
      if (b.type === 'h3') {
        const anchor = b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        headings.push({ title: b.title, anchor, type: 'h3' });
      } else if (b.type === 'step') {
        const lines = b.raw.split('\n');
        const headerLine = lines[0];
        const stepMatch = headerLine.match(/^(Step \d+): (.*)/);
        const title = stepMatch ? `${stepMatch[1]}: ${stepMatch[2]}` : headerLine;
        const anchor = b.raw.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        headings.push({ title, anchor, type: 'step' });
      }
    });
    return headings;
  }, [parsedContentBlocks]);

  const scrollToHeading = (anchor) => {
    const el = document.getElementById(anchor);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Determine App URL (support subdomain or main domain)
  const isSubdomain = typeof window !== 'undefined' && window.location.hostname.startsWith('docs.');
  const isCom = typeof window !== 'undefined' && window.location.hostname.endsWith('organizeup.com');
  const appBaseUrl = isSubdomain 
    ? (isCom ? 'https://organizeup.com' : 'https://organizeup.app') 
    : '/';

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#c9d1d9] selection:bg-cyan-500/30 font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 h-16 border-b border-[#30363d] bg-[#161b22]/90 backdrop-blur-md px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
            aria-label="Open documentation menu"
          >
            <IoMenuOutline size={22} />
          </button>

          <a href={appBaseUrl} className="flex items-center gap-3 group">
            <img
              src="/organizeup-logo.svg"
              alt="OrganizeUp"
              className="w-8 h-8 object-contain drop-shadow-[0_0_12px_rgba(6,182,212,0.35)] group-hover:scale-105 transition-transform"
            />
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white font-display tracking-tight">
                Organize<span className="text-cyan-400">Up</span>
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
                Docs & Procedures
              </span>
            </div>
          </a>
        </div>

        {/* Center Search Trigger */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-[#0d1117] border border-[#30363d] hover:border-cyan-500/50 text-[#8b949e] hover:text-white text-sm transition-all shadow-inner"
          >
            <span className="flex items-center gap-2">
              <IoSearchOutline size={16} />
              <span>Search features, procedures & shortcuts...</span>
            </span>
            <kbd className="px-2 py-0.5 rounded bg-[#21262d] text-xs text-[#8b949e] border border-[#30363d]">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right Action Links */}
        <div className="flex items-center gap-3">
          <a
            href="https://t.me/OrganizeUpBot"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-[#8b949e] hover:text-[#24A1DE] hover:bg-[#21262d] transition-colors"
            title="Telegram Bot (@OrganizeUpBot)"
          >
            <IoPaperPlaneOutline size={18} />
          </a>

          <a
            href="https://github.com/talha-techs/OrganizeUp"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg text-[#8b949e] hover:text-white hover:bg-[#21262d] transition-colors"
            title="GitHub Repository"
          >
            <IoLogoGithub size={18} />
          </a>

          <a
            href={appBaseUrl}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-[#0d1117] font-semibold text-xs transition-all shadow-md shadow-cyan-500/20"
          >
            <span>Open App</span>
            <IoOpenOutline size={14} />
          </a>
        </div>
      </header>

      {/* Main Container with Two/Three-Column Layout */}
      <div className="max-w-[1480px] mx-auto flex">
        {/* Desktop Left Navigation Sidebar */}
        <aside className="hidden md:block w-72 shrink-0 border-r border-[#30363d] p-6 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto custom-scrollbar">
          <div className="space-y-6">
            {DOCS_SECTIONS.map((section) => (
              <div key={section.id} className="space-y-1.5">
                <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
                  <span className="text-cyan-400">{iconMap[section.icon]}</span>
                  <span>{section.title}</span>
                </div>

                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const isActive = item.id === activeItem?.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectTopic(item.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-left group ${
                          isActive
                            ? 'bg-cyan-500/10 text-cyan-300 font-medium border-l-2 border-cyan-400 pl-2.5'
                            : 'text-[#8b949e] hover:text-white hover:bg-[#161b22]'
                        }`}
                      >
                        <span className="truncate">{item.title}</span>
                        {item.badge && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              isActive
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : 'bg-[#21262d] text-[#8b949e] group-hover:text-white'
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 250 }}
                className="fixed inset-y-0 left-0 z-50 w-72 bg-[#161b22] border-r border-[#30363d] p-6 overflow-y-auto md:hidden"
              >
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#30363d]">
                  <div className="flex items-center gap-2">
                    <img src="/organizeup-logo.svg" alt="OrganizeUp" className="w-7 h-7" />
                    <span className="font-bold text-white font-display">Documentation</span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 rounded-lg text-[#8b949e] hover:text-white"
                  >
                    <IoCloseOutline size={22} />
                  </button>
                </div>

                <div className="space-y-6">
                  {DOCS_SECTIONS.map((section) => (
                    <div key={section.id} className="space-y-1">
                      <div className="flex items-center gap-2 px-2 py-1 text-xs font-semibold text-[#8b949e] uppercase tracking-wider">
                        <span className="text-cyan-400">{iconMap[section.icon]}</span>
                        <span>{section.title}</span>
                      </div>
                      {section.items.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectTopic(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                            item.id === activeItem?.id
                              ? 'bg-cyan-500/10 text-cyan-300 font-medium'
                              : 'text-[#8b949e] hover:text-white'
                          }`}
                        >
                          <span className="truncate">{item.title}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Center Content Area */}
        <main className="flex-1 min-w-0 px-6 sm:px-12 py-8 max-w-4xl">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs text-[#8b949e] mb-4">
            <Link to={appBaseUrl} className="hover:text-cyan-400 transition-colors">
              OrganizeUp
            </Link>
            <IoChevronForwardOutline size={12} />
            <span>{activeSection?.title}</span>
            <IoChevronForwardOutline size={12} />
            <span className="text-white font-medium">{activeItem?.title}</span>
          </div>

          {/* Article Header */}
          <div className="border-b border-[#30363d] pb-6 mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                {activeSection?.title}
              </span>
              {activeItem?.badge && (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#21262d] text-[#8b949e]">
                  {activeItem.badge}
                </span>
              )}
              {activeItem?.readTime && (
                <span className="flex items-center gap-1 text-xs text-[#8b949e]">
                  <IoTimeOutline size={14} />
                  {activeItem.readTime}
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-display tracking-tight mb-3">
              {activeItem?.title}
            </h1>
            <p className="text-base text-[#8b949e] leading-relaxed">
              {activeItem?.summary}
            </p>
          </div>

          {/* Callout Notice if available */}
          {activeItem?.callouts?.map((callout, idx) => (
            <div
              key={idx}
              className="p-4 mb-8 rounded-xl bg-cyan-950/40 border border-cyan-800/40 flex items-start gap-3 shadow-lg shadow-cyan-950/20"
            >
              <IoSparklesOutline className="text-cyan-400 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="text-sm font-semibold text-cyan-300">{callout.title}</h4>
                <p className="text-xs sm:text-sm text-cyan-200/80 mt-1 leading-relaxed">
                  {callout.text}
                </p>
              </div>
            </div>
          ))}

          {/* Render Parsed Blocks */}
          <div className="space-y-5 text-[#c9d1d9] leading-relaxed text-sm sm:text-base">
            {parsedContentBlocks.map((block, idx) => {
              // Heading 3
              if (block.type === 'h3') {
                const anchor = block.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                return (
                  <h3
                    key={idx}
                    id={anchor}
                    className="text-xl sm:text-2xl font-bold text-white pt-6 pb-2.5 border-b border-[#21262d] flex items-center gap-2 tracking-tight"
                  >
                    <span>{renderInlineText(block.title)}</span>
                  </h3>
                );
              }

              // Heading 4
              if (block.type === 'h4') {
                return (
                  <h4 key={idx} className="text-lg font-semibold text-cyan-300 pt-3">
                    {renderInlineText(block.title)}
                  </h4>
                );
              }

              // Step Card
              if (block.type === 'step') {
                const lines = block.raw.split('\n');
                const headerLine = lines[0];
                const bodyLines = lines.slice(1);
                const stepMatch = headerLine.match(/^(Step \d+): (.*)/);
                const stepBadge = stepMatch ? stepMatch[1] : 'Step';
                const stepTitle = stepMatch ? stepMatch[2] : headerLine;
                const anchor = block.raw.toLowerCase().replace(/[^a-z0-9]+/g, '-');

                return (
                  <div
                    key={idx}
                    id={anchor}
                    className="p-5 sm:p-6 rounded-2xl bg-[#161b22] border border-[#30363d] hover:border-cyan-500/40 transition-colors my-6 shadow-md"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                        {stepBadge}
                      </span>
                      <h3 className="text-base sm:text-lg font-bold text-white">
                        {renderInlineText(stepTitle)}
                      </h3>
                    </div>

                    <div className="space-y-2 text-[#8b949e] text-sm">
                      {bodyLines.map((bLine, bIdx) => {
                        const bTrimmed = bLine.trim();
                        if (bTrimmed.startsWith('- ') || bTrimmed.startsWith('* ')) {
                          return (
                            <div key={bIdx} className="flex items-start gap-2 pl-2">
                              <span className="text-cyan-400 mt-1">•</span>
                              <span className="text-[#c9d1d9]">{renderInlineText(bTrimmed.replace(/^[-*]\s+/, ''))}</span>
                            </div>
                          );
                        }
                        if (/^\d+\.\s/.test(bTrimmed)) {
                          const num = bTrimmed.match(/^(\d+)\.\s/)[1];
                          return (
                            <div key={bIdx} className="flex items-start gap-2 pl-2">
                              <span className="text-cyan-400 font-mono text-xs mt-0.5">{num}.</span>
                              <span className="text-[#c9d1d9]">{renderInlineText(bTrimmed.replace(/^\d+\.\s+/, ''))}</span>
                            </div>
                          );
                        }
                        return (
                          <p key={bIdx} className="leading-relaxed">
                            {renderInlineText(bLine)}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // Ordered List (ol)
              if (block.type === 'ol') {
                return (
                  <ol key={idx} className="space-y-3 my-4">
                    {block.items.map((item, i) => {
                      const text = item.replace(/^\s*\d+\.\s*/, '');
                      return (
                        <li key={i} className="flex items-start gap-3 pl-1">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/15 text-cyan-400 font-mono text-xs font-bold flex items-center justify-center border border-cyan-500/25 mt-0.5">
                            {i + 1}
                          </span>
                          <div className="text-[#c9d1d9] leading-relaxed flex-1">
                            {renderInlineText(text)}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                );
              }

              // Unordered List (ul)
              if (block.type === 'ul') {
                return (
                  <ul key={idx} className="space-y-2.5 my-3 pl-2">
                    {block.items.map((item, i) => {
                      const text = item.replace(/^\s*[-*]\s*/, '');
                      return (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="text-cyan-400 mt-1.5">•</span>
                          <span className="text-[#c9d1d9] leading-relaxed flex-1">
                            {renderInlineText(text)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                );
              }

              // Code block
              if (block.type === 'code') {
                const lines = block.raw.split('\n');
                const codeLang = lines[0].replace('```', '') || 'bash';
                const codeBody = lines.slice(1, -1).join('\n');
                const codeKey = `code-${idx}`;

                return (
                  <div key={idx} className="relative rounded-xl overflow-hidden border border-[#30363d] bg-[#161b22] my-4 shadow-md">
                    <div className="flex items-center justify-between px-4 py-2 bg-[#21262d] text-xs font-mono text-[#8b949e] border-b border-[#30363d]">
                      <span>{codeLang}</span>
                      <button
                        onClick={() => handleCopy(codeBody, codeKey)}
                        className="flex items-center gap-1 text-cyan-400 hover:text-white transition-colors"
                      >
                        {copiedCode === codeKey ? (
                          <>
                            <IoCheckmarkOutline className="text-green-400" size={14} />
                            <span className="text-green-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <IoCopyOutline size={14} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="p-4 text-xs sm:text-sm font-mono text-[#e6edf3] overflow-x-auto">
                      <code>{codeBody}</code>
                    </pre>
                  </div>
                );
              }

              // Table
              if (block.type === 'table') {
                const lines = block.raw.split('\n');
                const headers = lines[0]
                  .split('|')
                  .filter(Boolean)
                  .map((h) => h.trim());
                const rows = lines
                  .slice(2)
                  .map((r) => r.split('|').filter(Boolean).map((c) => c.trim()));

                return (
                  <div key={idx} className="overflow-x-auto rounded-xl border border-[#30363d] my-4 shadow-sm">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-[#21262d] text-white border-b border-[#30363d]">
                        <tr>
                          {headers.map((h, hIdx) => (
                            <th key={hIdx} className="p-3 font-semibold">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#21262d] bg-[#161b22]">
                        {rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-[#21262d]/50 transition-colors">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-3 text-[#c9d1d9]">
                                {renderInlineText(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              // Standard Paragraph
              return (
                <p key={idx} className="text-[#8b949e] leading-relaxed my-3">
                  {renderInlineText(block.raw)}
                </p>
              );
            })}
          </div>

          {/* Quick Links inside topic if any */}
          {activeItem?.quickLinks && (
            <div className="mt-8 p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                Related Guides
              </h4>
              <div className="flex flex-wrap gap-2">
                {activeItem.quickLinks.map((ql, qlIdx) => (
                  <button
                    key={qlIdx}
                    onClick={() => handleSelectTopic(ql.targetId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-xs font-medium text-cyan-400 transition-colors"
                  >
                    <span>{ql.label}</span>
                    <IoChevronForwardOutline size={12} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Helpful Feedback Widget */}
          <div className="mt-10 p-5 rounded-2xl bg-[#161b22] border border-[#30363d] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-semibold text-white">Was this procedure helpful?</h4>
              <p className="text-xs text-[#8b949e]">Your feedback helps us refine OrganizeUp's documentation.</p>
            </div>
            {feedbackGiven ? (
              <span className="text-xs font-semibold text-green-400 flex items-center gap-1.5 bg-green-950/60 px-3 py-1.5 rounded-xl border border-green-800/60">
                <IoCheckmarkOutline size={16} />
                Thank you for your feedback!
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFeedbackGiven('yes')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#21262d] hover:bg-cyan-500/20 text-xs font-medium text-[#c9d1d9] hover:text-cyan-300 border border-[#30363d] transition-colors cursor-pointer"
                >
                  <IoThumbsUpOutline size={14} />
                  Yes
                </button>
                <button
                  onClick={() => setFeedbackGiven('no')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#21262d] hover:bg-red-500/20 text-xs font-medium text-[#c9d1d9] hover:text-red-300 border border-[#30363d] transition-colors cursor-pointer"
                >
                  <IoThumbsDownOutline size={14} />
                  No
                </button>
              </div>
            )}
          </div>

          {/* Next / Previous Article Pagination */}
          <div className="mt-8 pt-6 border-t border-[#30363d] grid grid-cols-1 sm:grid-cols-2 gap-4">
            {prevItem ? (
              <button
                onClick={() => handleSelectTopic(prevItem.id)}
                className="flex items-center gap-3 p-4 rounded-xl border border-[#30363d] hover:border-cyan-500/40 bg-[#161b22] hover:bg-[#21262d] transition-all text-left group cursor-pointer"
              >
                <IoChevronBackOutline className="text-[#8b949e] group-hover:text-cyan-400 shrink-0" size={20} />
                <div className="overflow-hidden">
                  <span className="text-[11px] uppercase tracking-wider text-[#8b949e] block font-semibold">
                    Previous Guide
                  </span>
                  <span className="text-sm font-medium text-white truncate block">
                    {prevItem.title}
                  </span>
                </div>
              </button>
            ) : <div />}

            {nextItem ? (
              <button
                onClick={() => handleSelectTopic(nextItem.id)}
                className="flex items-center justify-between p-4 rounded-xl border border-[#30363d] hover:border-cyan-500/40 bg-[#161b22] hover:bg-[#21262d] transition-all text-right group cursor-pointer"
              >
                <div className="overflow-hidden">
                  <span className="text-[11px] uppercase tracking-wider text-[#8b949e] block font-semibold">
                    Next Guide
                  </span>
                  <span className="text-sm font-medium text-white truncate block">
                    {nextItem.title}
                  </span>
                </div>
                <IoChevronForwardOutline className="text-[#8b949e] group-hover:text-cyan-400 shrink-0 ml-3" size={20} />
              </button>
            ) : <div />}
          </div>
        </main>

        {/* Desktop Right Sidebar: On This Page Table of Contents */}
        <aside className="hidden xl:block w-64 shrink-0 p-6 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
          {pageHeadings.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
                <IoListOutline className="text-cyan-400" size={16} />
                <span>On This Page</span>
              </div>
              <ul className="space-y-1 text-xs border-l border-[#30363d]">
                {pageHeadings.map((h, hIdx) => (
                  <li key={hIdx}>
                    <button
                      onClick={() => scrollToHeading(h.anchor)}
                      className={`block text-left w-full pl-3 py-1 transition-colors truncate cursor-pointer ${
                        h.type === 'step'
                          ? 'text-[#8b949e] hover:text-cyan-300 font-medium'
                          : 'text-[#c9d1d9] hover:text-white font-semibold'
                      }`}
                    >
                      {h.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {/* Interactive Search Modal (Ctrl+K) */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center px-4 py-3 border-b border-[#30363d] gap-3">
                <IoSearchOutline className="text-[#8b949e]" size={20} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search features, procedures, shortcuts..."
                  className="w-full bg-transparent text-white placeholder-[#8b949e] outline-none text-sm"
                />
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="px-2 py-0.5 text-xs text-[#8b949e] hover:text-white rounded bg-[#21262d] cursor-pointer"
                >
                  ESC
                </button>
              </div>

              <div className="max-h-80 overflow-y-auto p-2 divide-y divide-[#21262d]">
                {searchResults.length > 0 ? (
                  searchResults.map((it) => (
                    <button
                      key={it.id}
                      onClick={() => handleSelectTopic(it.id)}
                      className="w-full text-left p-3 rounded-lg hover:bg-[#21262d] transition-colors group flex items-start justify-between gap-3 cursor-pointer"
                    >
                      <div>
                        <div className="text-xs text-cyan-400 font-medium mb-1">
                          {it.sectionTitle}
                        </div>
                        <h4 className="text-sm font-semibold text-white group-hover:text-cyan-300">
                          {it.title}
                        </h4>
                        <p className="text-xs text-[#8b949e] line-clamp-1 mt-0.5">
                          {it.summary}
                        </p>
                      </div>
                      <IoChevronForwardOutline className="text-[#8b949e] group-hover:text-cyan-400 shrink-0 mt-1" size={16} />
                    </button>
                  ))
                ) : searchQuery.trim() ? (
                  <div className="p-8 text-center text-[#8b949e] text-sm">
                    No matching procedures found for "{searchQuery}".
                  </div>
                ) : (
                  <div className="p-6 text-center text-[#8b949e] text-xs">
                    Type to quickly jump to any feature, procedure, or bot documentation.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DocsPage;
