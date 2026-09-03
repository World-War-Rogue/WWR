import React, { useState } from 'react';
import {
  Radio,
  Send,
  Languages,
  Globe2,
  Server,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { ServerInfo, ChatMessage } from '../types';
import { soundFx } from '../utils/audio';

interface CommsCenterViewProps {
  activeServer: ServerInfo;
  servers: ServerInfo[];
  onSelectServer: (id: string) => void;
  chatMessages: ChatMessage[];
  onSendMessage: (text: string, serverId: string) => void;
}

export const CommsCenterView: React.FC<CommsCenterViewProps> = ({
  activeServer,
  servers,
  onSelectServer,
  chatMessages,
  onSendMessage,
}) => {
  const [inputText, setInputText] = useState<string>('');
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState<boolean>(true);
  const [showOriginalMap, setShowOriginalMap] = useState<Record<string, boolean>>({});

  const toggleShowOriginal = (msgId: string) => {
    setShowOriginalMap((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
    soundFx.playRadioChirp();
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim(), activeServer.id);
    setInputText('');
    soundFx.playRadioChirp();
  };

  // Filter messages for the current server or global channels
  const currentMessages = chatMessages.filter(
    (m) => m.serverId === activeServer.id || m.serverId === 'global_war_room'
  );

  return (
    <div className="flex-1 p-3 sm:p-5 flex flex-col gap-4 max-w-7xl mx-auto w-full font-mono">
      {/* Top Comms Header & Auto-Translate Switcher */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-600/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-md">
            <Radio className="w-6 h-6 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white uppercase tracking-wide">
                CROSS-SERVER SECURE TACTICAL COMMUNICATIONS
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-black/40 text-orange-400 border border-orange-500/30 font-bold uppercase">
                FREQUENCY ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live multi-server chat with instant neural translation across 11 nations.
            </p>
          </div>
        </div>

        {/* Neural Auto-Translation Master Switch */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setAutoTranslateEnabled(!autoTranslateEnabled);
              soundFx.playRadioChirp();
            }}
            className={`px-3.5 py-2 rounded-lg border text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${
              autoTranslateEnabled
                ? 'bg-orange-600/20 border-orange-500/60 text-orange-300 ring-2 ring-orange-500/40 shadow-md'
                : 'bg-black/40 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Automatically translates all foreign commander transmissions into English"
          >
            <Languages className="w-4 h-4 text-orange-400" />
            <span>NEURAL AUTO-TRANSLATE: {autoTranslateEnabled ? 'ONLINE' : 'OFFLINE'}</span>
          </button>
        </div>
      </div>

      {/* Main Comms Layout: Server Channel List + Chat Log */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1">
        {/* Left Column: Server Channels */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col gap-2.5 shadow-2xl">
          <div className="text-[10px] text-orange-500 uppercase tracking-widest px-2 py-1 flex items-center gap-1.5 font-black">
            <Server className="w-3.5 h-3.5 text-orange-400" />
            <span>ACTIVE FREQUENCIES (SERVERS)</span>
          </div>

          <div className="space-y-1.5">
            {servers.map((srv) => {
              const isSelected = srv.id === activeServer.id;
              return (
                <button
                  key={srv.id}
                  onClick={() => {
                    onSelectServer(srv.id);
                    soundFx.playRadioChirp();
                  }}
                  className={`w-full p-2.5 rounded-xl border text-left transition-all flex items-center justify-between text-xs ${
                    isSelected
                      ? 'bg-white/15 border-orange-500 text-white shadow-lg ring-1 ring-orange-500/30'
                      : 'bg-black/40 border-white/10 text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{srv.flag}</span>
                      <span className="uppercase">{srv.name}</span>
                    </div>
                    <div className="text-[10px] text-slate-400">{srv.region}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-orange-400 font-bold">{srv.pingMs}ms</span>
                    <div className="text-[9px] text-slate-400">{srv.activeCommanders} active</div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-auto p-3 rounded-xl bg-black/40 border border-white/10 text-[11px] text-slate-300 space-y-1 backdrop-blur-sm">
            <div className="text-orange-400 font-bold flex items-center gap-1 uppercase tracking-wider text-[10px]">
              <Globe2 className="w-3.5 h-3.5" />
              <span>Multi-Nation Coalition</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Commanders speak in their native languages. The system normalizes ballistic callouts and tactical ping coordinates.
            </p>
          </div>
        </div>

        {/* Right 3 Cols: Real-Time Chat Stream & Transmitter */}
        <div className="lg:col-span-3 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col shadow-2xl min-h-[460px]">
          {/* Channel Info Banner */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-lg">{activeServer.flag}</span>
              <span className="font-bold text-white uppercase">{activeServer.name} Channel</span>
              <span className="text-[10px] text-slate-400">[{activeServer.region}]</span>
            </div>
            <span className="text-orange-400 text-[10px] font-bold uppercase tracking-wider">
              ENCRYPTION: 4096-BIT RSA MIL-SPEC
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
            {currentMessages.map((msg) => {
              const showOriginal = showOriginalMap[msg.id];
              const isForeign = msg.originalLanguage !== 'en' && msg.originalLanguage !== 'English';
              const textToDisplay =
                autoTranslateEnabled && !showOriginal && msg.translatedText
                  ? msg.translatedText
                  : msg.originalText;

              return (
                <div
                  key={msg.id}
                  className="bg-black/40 border border-white/10 p-3.5 rounded-xl text-xs leading-relaxed transition-all backdrop-blur-sm"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-white">{msg.sender}</span>
                      <span className="text-orange-400 font-bold">[{msg.senderRank}]</span>
                      <span className="text-slate-500 text-[10px]">{msg.timestamp}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-300 uppercase">
                        {msg.serverName}
                      </span>
                      {isForeign && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-orange-600/20 border border-orange-500/40 text-orange-300 font-bold uppercase">
                          {msg.originalLanguage}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Message Body */}
                  <div className="text-slate-200 pl-1">{textToDisplay}</div>

                  {/* Translation details & toggle if foreign */}
                  {isForeign && (
                    <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-orange-400" />
                        <span>
                          {autoTranslateEnabled && !showOriginal
                            ? `Neural translated from ${msg.originalLanguage}`
                            : `Original ${msg.originalLanguage} text`}
                        </span>
                      </span>

                      <button
                        onClick={() => toggleShowOriginal(msg.id)}
                        className="text-orange-400 hover:text-orange-300 underline font-bold uppercase tracking-wider"
                      >
                        {showOriginal ? 'View Translated' : 'View Original'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Chat Composer Form */}
          <form onSubmit={handleSend} className="pt-3 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              placeholder={`Transmit message to ${activeServer.name}...`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500 font-mono"
            />

            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 disabled:bg-white/5 disabled:text-slate-600 text-white font-black text-xs uppercase tracking-widest flex items-center gap-1.5 transition-all shadow-md shadow-orange-950/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>TRANSMIT</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
