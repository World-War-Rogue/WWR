import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FileText,
  Search,
  Download,
  Copy,
  Check,
  Shield,
  Key,
  BookOpen,
  Filter,
  FileCode,
  Layers,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Database,
  Crosshair,
  Award,
  Users,
  Radio,
  Cpu,
  RefreshCw,
  FolderArchive,
} from 'lucide-react';
import { GAME_DOSSIER_FILES, DossierDocument } from '../data/gameDossier';
import { PlayerProfile, Squad, BaseBuilding } from '../types';
import { generateAntiCheatChecksum } from '../utils/antiCheat';
import { soundFx } from '../utils/audio';
import {
  generateMasterGameBibleMarkdown,
  generateOmniscientProjectArchiveJson,
} from '../utils/masterBibleGenerator';

interface GameDossierFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: PlayerProfile;
  squads: Squad[];
  buildings: BaseBuilding[];
  onImportState: (savedJson: string) => void;
}

export const GameDossierFolderModal: React.FC<GameDossierFolderModalProps> = ({
  isOpen,
  onClose,
  profile,
  squads,
  buildings,
  onImportState,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string>(GAME_DOSSIER_FILES[0].id);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'formatted' | 'raw_markdown' | 'anticheat_save'>('formatted');
  const [copiedDocId, setCopiedDocId] = useState<string | null>(null);
  const [importString, setImportString] = useState<string>('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const selectedDoc = useMemo(() => {
    return GAME_DOSSIER_FILES.find((d) => d.id === selectedDocId) || GAME_DOSSIER_FILES[0];
  }, [selectedDocId]);

  const filteredDocs = useMemo(() => {
    return GAME_DOSSIER_FILES.filter((doc) => {
      const matchesCat = selectedCategory === 'all' || doc.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCat;
      const matchesSearch =
        doc.title.toLowerCase().includes(q) ||
        doc.filename.toLowerCase().includes(q) ||
        doc.summary.toLowerCase().includes(q) ||
        doc.sections.some(
          (s) =>
            s.heading.toLowerCase().includes(q) ||
            s.content.some((c) => c.toLowerCase().includes(q))
        );
      return matchesCat && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const checksum = generateAntiCheatChecksum(profile.callsign, profile.resources, squads);

  const handleCopyMarkdown = (doc: DossierDocument) => {
    soundFx.playRadioChirp();
    const mdContent = `# ${doc.number}. ${doc.title}
File: docs/${doc.filename}
Classification: ${doc.classificationStamp}
Last Updated: ${doc.lastUpdated}

## Summary
${doc.summary}

${doc.sections
  .map(
    (s) => `### ${s.heading}
${s.content.join('\n\n')}
${
  s.table
    ? `\n| ${s.table.headers.join(' | ')} |\n| ${s.table.headers.map(() => '---').join(' | ')} |\n${s.table.rows
        .map((r) => `| ${r.join(' | ')} |`)
        .join('\n')}\n`
    : ''
}${
      s.callout
        ? `\n> **[${s.callout.title}]**  \n> ${s.callout.text}\n`
        : ''
    }`
  )
  .join('\n\n')}
`;

    navigator.clipboard.writeText(mdContent);
    setCopiedDocId(doc.id);
    setTimeout(() => setCopiedDocId(null), 2500);
  };

  const handleDownloadDoc = (doc: DossierDocument) => {
    soundFx.playRadioChirp();
    const mdContent = `# ${doc.number}. ${doc.title}
File: docs/${doc.filename}
Classification: ${doc.classificationStamp}
Last Updated: ${doc.lastUpdated}

## Summary
${doc.summary}

${doc.sections
  .map(
    (s) => `### ${s.heading}
${s.content.join('\n\n')}
${
  s.table
    ? `\n| ${s.table.headers.join(' | ')} |\n| ${s.table.headers.map(() => '---').join(' | ')} |\n${s.table.rows
        .map((r) => `| ${r.join(' | ')} |`)
        .join('\n')}\n`
    : ''
}${
      s.callout
        ? `\n> **[${s.callout.title}]**  \n> ${s.callout.text}\n`
        : ''
    }`
  )
  .join('\n\n')}
`;
    const blob = new Blob([mdContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadMasterBibleMarkdown = () => {
    soundFx.playRadioChirp();
    const markdown = generateMasterGameBibleMarkdown(profile, squads, buildings);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WORLD_WAR_ROGUE_MASTER_GAME_BIBLE_${profile.callsign}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadOmniscientJsonArchive = () => {
    soundFx.playRadioChirp();
    const data = generateOmniscientProjectArchiveJson(profile, squads, buildings);
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WorldWarRogue_Omniscient_Project_Archive_${profile.callsign}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAllDocsBundle = () => {
    handleDownloadOmniscientJsonArchive();
  };

  const handleExportSave = () => {
    soundFx.playRadioChirp();
    const data = {
      profile,
      squads,
      buildings,
      checksum,
      timestamp: new Date().toISOString(),
      version: '1.2.0-MILSPEC',
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WorldWarRogue_Save_${profile.callsign}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSave = () => {
    try {
      onImportState(importString);
      soundFx.playUpgradeSound();
      setImportStatus('SUCCESS: TACTICAL PROGRESS RESTORED AND VERIFIED!');
      setTimeout(() => setImportStatus(null), 3500);
    } catch {
      setImportStatus('ERROR: INVALID SAVE DATA PAYLOAD.');
    }
  };

  const categories = [
    { id: 'all', label: 'ALL DOSSIERS', icon: Folder },
    { id: 'overview', label: 'OVERVIEW & LORE', icon: BookOpen },
    { id: 'combat', label: 'BALLISTICS & PHYSICS', icon: Crosshair },
    { id: 'units', label: '100+ UNITS & DOCTRINE', icon: Shield },
    { id: 'base', label: 'BASE FORTIFICATIONS', icon: Layers },
    { id: 'economy', label: 'SURVIVAL & FAIR ARMORY', icon: Award },
    { id: 'alliances', label: '100-OFFICER HIGH COMMAND', icon: Users },
    { id: 'leaderboard', label: 'RANKINGS & 36 SECTORS', icon: Database },
    { id: 'network', label: 'COMMS & ANTI-CHEAT', icon: Radio },
    { id: 'tech', label: 'TECH STACK & ROADMAP', icon: Cpu },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 font-mono select-none">
      {/* Container simulating a classified military accordion file folder */}
      <div className="bg-gradient-to-b from-[#1c1917] to-[#0c0a09] border-2 border-amber-800/60 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden">
        
        {/* Top Folder Manila Tab Header */}
        <div className="bg-[#292524] border-b-2 border-amber-700/60 p-3 sm:px-5 sm:py-3.5 flex flex-wrap items-center justify-between gap-3 relative">
          {/* Manila folder tab indicator */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-950 border border-amber-600/70 shadow-inner flex items-center justify-center">
              <FolderArchive className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-amber-100 uppercase tracking-wider flex items-center gap-2">
                  <span>WORLD WAR ROGUE // MASTER GAME ARCHIVE &amp; DOSSIER</span>
                </h2>
                <span className="bg-red-950/90 text-red-400 text-[10px] font-black uppercase px-2 py-0.5 rounded border border-red-600/60 tracking-widest shadow-sm">
                  TOP SECRET // CLASSIFIED
                </span>
              </div>
              <p className="text-[11px] text-amber-200/70 mt-0.5">
                Directory: <code className="text-amber-300 font-bold">/docs/</code> • 10 Core Specification Documents • Ballistics, Units, Alliances &amp; Territory
              </p>
            </div>
          </div>

          {/* Quick Actions Header */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadMasterBibleMarkdown}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-amber-900/50 hover:bg-amber-800/80 text-amber-200 border border-amber-500/60 hover:border-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              title="Download consolidated Master Game Bible as a single full Markdown document (.md)"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">EXPORT BIBLE (.MD)</span>
              <span className="sm:hidden text-[10px]">.MD</span>
            </button>

            <button
              onClick={handleDownloadOmniscientJsonArchive}
              className="px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-600/60 hover:border-emerald-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              title="Download Complete Project & Game Database Archive (100+ units, 36 sectors, alliances, save state, all docs) as JSON"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">FULL ARCHIVE (.JSON)</span>
              <span className="sm:hidden text-[10px]">.JSON</span>
            </button>

            <button
              onClick={() => {
                soundFx.playButtonClick();
                setViewMode('anticheat_save');
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                viewMode === 'anticheat_save'
                  ? 'bg-amber-500 text-black border-amber-300 font-black'
                  : 'bg-black/40 hover:bg-black/60 text-amber-300 border-amber-700/60'
              }`}
              title="Access military game save state & anti-cheat kernel"
            >
              <Key className="w-3.5 h-3.5" />
              <span>SAVE &amp; ANTI-CHEAT</span>
            </button>

            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900 text-red-200 border border-red-700/60 text-xs font-black transition-colors cursor-pointer"
            >
              ✕ CLOSE
            </button>
          </div>
        </div>

        {/* Category Filters Ribbon */}
        <div className="bg-[#1c1917] border-b border-amber-900/40 px-3 py-2 flex items-center gap-1.5 overflow-x-auto text-[11px] scrollbar-thin">
          <span className="text-amber-500/80 font-bold uppercase flex items-center gap-1 pr-2 border-r border-amber-900/60">
            <Filter className="w-3 h-3 text-amber-400" />
            <span>CATEGORIES:</span>
          </span>
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id && viewMode !== 'anticheat_save';
            return (
              <button
                key={cat.id}
                onClick={() => {
                  soundFx.playButtonClick();
                  setSelectedCategory(cat.id);
                  if (viewMode === 'anticheat_save') setViewMode('formatted');
                }}
                className={`px-2.5 py-1 rounded-md whitespace-nowrap font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-black font-black shadow-md border border-amber-300'
                    : 'text-amber-200/70 hover:text-amber-100 hover:bg-amber-950/60 border border-transparent'
                }`}
              >
                <Icon className={`w-3 h-3 ${isSelected ? 'text-black' : 'text-amber-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Main Body Split: File Tree / List vs. Document Viewer */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden bg-[#0c0a09]">
          
          {/* Left Column: File Folder Explorer Tree & Search */}
          <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-amber-900/40 flex flex-col bg-[#141210]">
            {/* Search Box */}
            <div className="p-3 border-b border-amber-900/40 bg-[#171513]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search intelligence files..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-black/60 border border-amber-800/50 text-amber-100 placeholder-amber-600 text-xs focus:outline-none focus:border-amber-400 font-mono"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-amber-500 hover:text-amber-200 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="flex items-center justify-between text-[10px] text-amber-400/70 mt-1.5 px-0.5">
                <span>FOLDER /DOCS/ INDEX</span>
                <span>{filteredDocs.length} of {GAME_DOSSIER_FILES.length} FILES</span>
              </div>
            </div>

            {/* Document List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 divide-y divide-amber-950/40">
              {filteredDocs.length === 0 ? (
                <div className="text-center py-8 text-amber-600/70 text-xs italic">
                  No classified files matched criteria.
                </div>
              ) : (
                filteredDocs.map((doc) => {
                  const isSelected = selectedDocId === doc.id && viewMode !== 'anticheat_save';
                  return (
                    <div
                      key={doc.id}
                      onClick={() => {
                        soundFx.playButtonClick();
                        setSelectedDocId(doc.id);
                        if (viewMode === 'anticheat_save') setViewMode('formatted');
                      }}
                      className={`p-2.5 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-amber-950/80 border-amber-500/80 shadow-md shadow-amber-950/60'
                          : 'bg-[#1a1715] hover:bg-[#231f1c] border-amber-900/30 text-amber-200/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <FileText
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isSelected ? 'text-amber-400' : 'text-amber-600'
                            }`}
                          />
                          <span
                            className={`text-xs font-bold truncate ${
                              isSelected ? 'text-amber-100 font-black' : 'text-amber-300'
                            }`}
                          >
                            {doc.number}. {doc.title}
                          </span>
                        </div>
                        <span className="text-[9px] px-1 rounded bg-black/50 text-amber-400 border border-amber-800/40 shrink-0">
                          {doc.number}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center justify-between text-[10px] text-amber-500/70">
                        <code className="text-amber-400/90 text-[10px] truncate max-w-[170px]">
                          {doc.filename}
                        </code>
                        <span className="text-emerald-400/80 uppercase text-[9px]">
                          {doc.category}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Folder Footer Status */}
            <div className="p-2.5 bg-[#171513] border-t border-amber-900/40 text-[10px] text-amber-400/70 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span>HMAC ANTI-CHEAT READY</span>
              </span>
              <span className="text-amber-500 font-bold">MIL-SPEC 1.2.0</span>
            </div>
          </div>

          {/* Right Column: Selected Document Reader or Anti-Cheat Save View */}
          <div className="flex-1 flex flex-col min-w-0 bg-[#0c0a09] overflow-hidden">
            {viewMode === 'anticheat_save' ? (
              /* Anti-Cheat & Save Export/Import View */
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                <div className="bg-gradient-to-r from-amber-950/60 to-black p-4 rounded-xl border border-amber-600/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-900/50 rounded-xl border border-amber-500">
                      <Key className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-black text-amber-100">
                        TACTICAL SAVE ARCHIVE &amp; SERVER CHECKSUM KERNEL
                      </h3>
                      <p className="text-xs text-amber-300/70 mt-0.5">
                        Save state is cryptographically signed to prevent memory injection and stat spoofing.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Export Card */}
                  <div className="bg-[#141210] p-4 rounded-xl border border-amber-800/40 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-amber-300 uppercase flex items-center gap-2">
                        <Download className="w-4 h-4 text-emerald-400" />
                        <span>Export Certified Save File</span>
                      </h4>
                      <p className="text-[11px] text-amber-400/70 mt-1 leading-relaxed">
                        Exports your current tactical headquarters level, resource reserves, 5-squad compositions, and active alliance holdings into an anti-tamper JSON payload.
                      </p>
                      <div className="mt-3 p-2 bg-black/60 rounded border border-amber-900/60 text-[10px] text-amber-200 font-mono">
                        <span className="text-amber-500 block font-bold">STATE HASH CHECKSUM:</span>
                        <code className="text-emerald-400 break-all">{checksum}</code>
                      </div>
                    </div>
                    <button
                      onClick={handleExportSave}
                      className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Save Payload (.json)</span>
                    </button>
                  </div>

                  {/* Import Card */}
                  <div className="bg-[#141210] p-4 rounded-xl border border-amber-800/40 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs font-black text-amber-300 uppercase flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 text-amber-400" />
                        <span>Import &amp; Restore Progress</span>
                      </h4>
                      <p className="text-[11px] text-amber-400/70 mt-1">
                        Paste a previously certified JSON backup to restore your profile on another client or machine.
                      </p>
                      <textarea
                        value={importString}
                        onChange={(e) => setImportString(e.target.value)}
                        placeholder="Paste signed JSON save payload here..."
                        className="mt-2.5 w-full h-24 p-2 bg-black/60 rounded border border-amber-900/60 text-[10px] text-amber-200 font-mono focus:outline-none focus:border-amber-400 resize-none"
                      />
                      {importStatus && (
                        <div
                          className={`mt-2 p-2 rounded text-[10px] font-bold ${
                            importStatus.startsWith('SUCCESS')
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                              : 'bg-red-950 text-red-300 border border-red-600'
                          }`}
                        >
                          {importStatus}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleImportSave}
                      disabled={!importString.trim()}
                      className="mt-4 w-full py-2.5 bg-amber-600 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-600 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Verify &amp; Restore Profile</span>
                    </button>
                  </div>
                </div>

                {/* Omniscient Master Bible & Complete Project Archive Hub */}
                <div className="bg-[#141210] p-4 sm:p-5 rounded-xl border border-amber-500/40">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-900/40 pb-3">
                    <div>
                      <h4 className="text-sm font-black text-amber-200 uppercase flex items-center gap-2">
                        <FolderArchive className="w-4 h-4 text-amber-400" />
                        <span>Master Game Bible &amp; Omniscient Project Export</span>
                      </h4>
                      <p className="text-xs text-amber-400/70 mt-0.5">
                        Exports literally everything we have designed, specified, and coded across the entire game engine.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-amber-600 text-amber-300 font-bold self-start sm:self-auto">
                      ALL-IN-ONE EXPORTS
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {/* Master Bible .MD Card */}
                    <div className="bg-black/50 p-3.5 rounded-lg border border-amber-900/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-amber-400" />
                            <span>Master Game Bible (.MD)</span>
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-mono">
                            MARKDOWN
                          </span>
                        </div>
                        <ul className="mt-2.5 text-[11px] text-amber-200/80 space-y-1 font-mono">
                          <li className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>All 10 Design Chapters (Lore, Theaters, Systems)</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Exact Ballistic Formulas &amp; Ricochet Laws</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>100+ Unit Roster Tables (Stats, Counters, Advantages)</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>All 36 Contested Sectors &amp; Yields Table</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Active Commander Profile &amp; 5 Squad Formations</span>
                          </li>
                        </ul>
                      </div>
                      <button
                        onClick={handleDownloadMasterBibleMarkdown}
                        className="mt-3.5 w-full py-2 bg-amber-900/60 hover:bg-amber-800 text-amber-100 border border-amber-500/60 text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-400" />
                        <span>Download Master Bible (.md)</span>
                      </button>
                    </div>

                    {/* Omniscient JSON Archive Card */}
                    <div className="bg-black/50 p-3.5 rounded-lg border border-emerald-900/60 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                            <Database className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Omniscient Project Archive (.JSON)</span>
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                            FULL DATABASE
                          </span>
                        </div>
                        <ul className="mt-2.5 text-[11px] text-emerald-200/80 space-y-1 font-mono">
                          <li className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Full Raw Units Database (100+ platforms array)</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Full 36 Theater Sectors &amp; Alliance Battlegroups</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>All Server Infrastructure &amp; DEFCON States</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>All 10 Documentation Files &amp; Compiled Markdown</span>
                          </li>
                          <li className="flex items-center gap-1.5">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Active FOB Grid, Squad Allocations &amp; HMAC Hash</span>
                          </li>
                        </ul>
                      </div>
                      <button
                        onClick={handleDownloadOmniscientJsonArchive}
                        className="mt-3.5 w-full py-2 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-100 border border-emerald-500/60 text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
                      >
                        <Database className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Download Omniscient Archive (.json)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Regular Document Reader View */
              <>
                {/* Document Top Bar */}
                <div className="p-3.5 bg-[#171513] border-b border-amber-900/40 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="bg-amber-950 text-amber-300 px-2 py-0.5 rounded text-[10px] font-black border border-amber-700/60">
                        DOC {selectedDoc.number}
                      </span>
                      <h3 className="text-sm sm:text-base font-black text-amber-100 truncate">
                        {selectedDoc.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[11px] text-amber-400/70">
                      <span className="text-amber-300 font-mono">docs/{selectedDoc.filename}</span>
                      <span>•</span>
                      <span className="text-red-400 font-bold uppercase">{selectedDoc.classificationStamp}</span>
                      <span>•</span>
                      <span>Updated: {selectedDoc.lastUpdated}</span>
                    </div>
                  </div>

                  {/* Document View Mode & Export Actions */}
                  <div className="flex items-center gap-2">
                    <div className="bg-black/60 rounded-lg p-0.5 border border-amber-900/60 flex items-center text-xs">
                      <button
                        onClick={() => setViewMode('formatted')}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                          viewMode === 'formatted'
                            ? 'bg-amber-500 text-black font-black'
                            : 'text-amber-300 hover:text-white'
                        }`}
                      >
                        TACTICAL VIEW
                      </button>
                      <button
                        onClick={() => setViewMode('raw_markdown')}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-colors ${
                          viewMode === 'raw_markdown'
                            ? 'bg-amber-500 text-black font-black'
                            : 'text-amber-300 hover:text-white'
                        }`}
                      >
                        RAW .MD
                      </button>
                    </div>

                    <button
                      onClick={() => handleCopyMarkdown(selectedDoc)}
                      className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                      title="Copy raw Markdown to clipboard"
                    >
                      {copiedDocId === selectedDoc.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">COPIED!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>COPY .MD</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleDownloadDoc(selectedDoc)}
                      className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-700/60 text-amber-300 hover:text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                      title="Download this markdown document to your device"
                    >
                      <Download className="w-3.5 h-3.5 text-amber-400" />
                      <span>DOWNLOAD</span>
                    </button>
                  </div>
                </div>

                {/* Document Content Scrollable Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs text-amber-100/90 leading-relaxed">
                  {viewMode === 'raw_markdown' ? (
                    /* Raw Markdown Display */
                    <pre className="p-4 bg-black/80 rounded-xl border border-amber-900/60 text-[11px] text-amber-300 font-mono overflow-x-auto whitespace-pre-wrap selection:bg-amber-700 selection:text-white">
{`# ${selectedDoc.number}. ${selectedDoc.title}
File: docs/${selectedDoc.filename}
Classification: ${selectedDoc.classificationStamp}
Last Updated: ${selectedDoc.lastUpdated}

## Summary
${selectedDoc.summary}

${selectedDoc.sections
  .map(
    (s) => `### ${s.heading}
${s.content.join('\n\n')}
${
  s.table
    ? `\n| ${s.table.headers.join(' | ')} |\n| ${s.table.headers.map(() => '---').join(' | ')} |\n${s.table.rows
        .map((r) => `| ${r.join(' | ')} |`)
        .join('\n')}\n`
    : ''
}${
      s.callout
        ? `\n> **[${s.callout.title}]**  \n> ${s.callout.text}\n`
        : ''
    }`
  )
  .join('\n\n')}`}
                    </pre>
                  ) : (
                    /* Formatted Document View */
                    <>
                      {/* Classification Header Stamp */}
                      <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/40 flex items-start gap-3">
                        <div className="p-2 bg-red-950/80 border border-red-600/70 rounded text-red-400 font-black text-[11px] tracking-widest uppercase">
                          CLASSIFIED
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider">
                            EXECUTIVE DOSSIER BRIEFING
                          </h4>
                          <p className="text-xs text-amber-300/80 mt-1">
                            {selectedDoc.summary}
                          </p>
                        </div>
                      </div>

                      {/* Sections */}
                      {selectedDoc.sections.map((sec, idx) => (
                        <div
                          key={idx}
                          className="bg-[#141210] p-4 sm:p-5 rounded-xl border border-amber-900/40 space-y-3.5 shadow-sm"
                        >
                          <h4 className="text-xs sm:text-sm font-black text-amber-300 uppercase tracking-wide flex items-center gap-2 border-b border-amber-900/40 pb-2">
                            <ChevronRight className="w-4 h-4 text-amber-500" />
                            <span>{sec.heading}</span>
                          </h4>

                          <div className="space-y-2 text-amber-100/90 leading-relaxed">
                            {sec.content.map((p, pIdx) => (
                              <p key={pIdx}>{p}</p>
                            ))}
                          </div>

                          {/* Optional Callout Block */}
                          {sec.callout && (
                            <div
                              className={`p-3 rounded-lg border text-xs ${
                                sec.callout.type === 'formula'
                                  ? 'bg-blue-950/50 border-blue-600/60 text-blue-200'
                                  : sec.callout.type === 'warning'
                                  ? 'bg-red-950/50 border-red-600/60 text-red-200'
                                  : sec.callout.type === 'protocol'
                                  ? 'bg-emerald-950/50 border-emerald-600/60 text-emerald-200'
                                  : 'bg-amber-950/50 border-amber-600/60 text-amber-200'
                              }`}
                            >
                              <span className="font-black tracking-wider uppercase block text-[10px] mb-1">
                                {sec.callout.title}
                              </span>
                              <p className="font-mono text-[11px]">{sec.callout.text}</p>
                            </div>
                          )}

                          {/* Optional Table */}
                          {sec.table && (
                            <div className="overflow-x-auto rounded-lg border border-amber-900/60">
                              <table className="w-full text-left text-[11px]">
                                <thead className="bg-[#1e1b18] text-amber-300 font-bold border-b border-amber-900/60">
                                  <tr>
                                    {sec.table.headers.map((h, hIdx) => (
                                      <th key={hIdx} className="p-2.5 whitespace-nowrap">
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-amber-950/40 text-amber-100/80">
                                  {sec.table.rows.map((row, rIdx) => (
                                    <tr key={rIdx} className="hover:bg-amber-950/20">
                                      {row.map((cell, cIdx) => (
                                        <td key={cIdx} className="p-2.5 font-mono">
                                          {cell}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
