"use client";

import React, { useState } from "react";
import {
  GripVertical,
  ExternalLink,
  Copy,
  Pencil,
  Trash2,
  Coffee,
  ChevronUp,
  ChevronDown,
  Clock,
  Lock,
  ShieldAlert,
  StickyNote,
} from "lucide-react";
import { renderLinkIcon } from "./IconHelper";

export interface StudioLinkItem {
  id: string;
  title: string;
  url: string;
  type: "LINK" | "HEADER" | "DIVIDER" | "DONATION" | "NOTE";
  isActive: boolean;
  clicks: number;
  badge?: string;
  icon?: string;
  thumbnailUrl?: string | null;
  position: number;
  startsAt?: string | null;
  expiresAt?: string | null;
  isPasswordProtected?: boolean;
  password?: string | null;
  isAgeRestricted?: boolean;
}

interface LinkCardProps {
  item: StudioLinkItem;
  index: number;
  totalItems: number;
  onToggleActive: (id: string) => void;
  onEdit: (item: StudioLinkItem) => void;
  onDelete: (id: string) => void;
  onDuplicate: (item: StudioLinkItem) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

export function LinkCard({
  item,
  index,
  totalItems,
  onToggleActive,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDrop,
}: LinkCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  // If item is a SECTION HEADER
  if (item.type === "HEADER") {
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={(e) => onDragOver(e, index)}
        onDrop={(e) => onDrop(e, index)}
        className="tactile-card group flex items-center justify-between bg-zinc-900/60 border border-dashed border-zinc-700/60 rounded-xl px-4 py-3 my-1 hover:border-zinc-500 transition-all duration-150 select-none"
      >
        <div className="flex items-center space-x-3">
          <div className="cursor-grab active:cursor-grabbing text-zinc-500 group-hover:text-white transition-colors">
            <GripVertical className="w-4 h-4" />
          </div>
          <span className="text-xs font-mono font-bold tracking-wider text-zinc-200 uppercase">
            {item.title}
          </span>
        </div>

        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          <div className="hidden sm:flex items-center space-x-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onMoveUp(index)}
              disabled={index === 0}
              className="p-1 hover:text-white disabled:opacity-20 text-zinc-400 cursor-pointer"
              title="Move up"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onMoveDown(index)}
              disabled={index === totalItems - 1}
              className="p-1 hover:text-white disabled:opacity-20 text-zinc-400 cursor-pointer"
              title="Move down"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => onEdit(item)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            title="Edit Header"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
            title="Delete Header"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // If item is a DIVIDER
  if (item.type === "DIVIDER") {
    return (
      <div
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={(e) => onDragOver(e, index)}
        onDrop={(e) => onDrop(e, index)}
        className="tactile-card group flex items-center justify-between bg-zinc-900/40 border border-zinc-800 rounded-xl px-4 py-2.5 my-1 hover:border-zinc-600 transition-all select-none"
      >
        <div className="flex items-center space-x-3 w-full pr-4">
          <div className="cursor-grab active:cursor-grabbing text-zinc-500 group-hover:text-white transition-colors">
            <GripVertical className="w-4 h-4" />
          </div>
          <div className="h-px bg-zinc-700/80 w-full" />
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => onDelete(item.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
            title="Delete Divider"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Get matching icon based on configured icon or URL
  const getIcon = () => {
    return renderLinkIcon(item.thumbnailUrl, item.url, "w-4 h-4 text-white");
  };

  const formattedClicks = item.clicks >= 1000 ? `${(item.clicks / 1000).toFixed(1)}k` : `${item.clicks}`;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`tactile-card group relative flex flex-col sm:flex-row sm:items-center bg-[#121215] border rounded-xl p-3 sm:p-4 gap-2.5 sm:gap-3 transition-all duration-150 select-none ${
        item.isActive
          ? "border-zinc-800 hover:border-zinc-600"
          : "border-zinc-800/50 bg-[#121215]/60 opacity-60"
      }`}
    >
      {/* TOP ROW (Mobile) / INLINE LEFT (Desktop) */}
      <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto flex-1 min-w-0">
        {/* 6-dot drag handle */}
        <div
          className="cursor-grab active:cursor-grabbing text-zinc-500 group-hover:text-white mr-2.5 sm:mr-3 shrink-0 flex items-center transition-colors"
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Up/Down quick keyboard/accessible sorting (desktop only to preserve mobile touch targets) */}
        <div className={`hidden sm:flex flex-col space-y-0.5 mr-2 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"}`}>
          <button
            onClick={() => onMoveUp(index)}
            disabled={index === 0}
            className="text-zinc-500 hover:text-white disabled:opacity-20 transition-colors p-0.5"
            title="Move up"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={() => onMoveDown(index)}
            disabled={index === totalItems - 1}
            className="text-zinc-500 hover:text-white disabled:opacity-20 transition-colors p-0.5"
            title="Move down"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
        </div>

        {/* Icon housing - clickable to edit and change icon */}
        <button
          type="button"
          onClick={() => onEdit(item)}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center shrink-0 mr-2.5 sm:mr-3.5 transition-transform duration-200 group-hover:scale-105 group-hover:bg-zinc-800 cursor-pointer"
          title="Click to edit or change visual icon"
        >
          {getIcon()}
        </button>

        {/* Details: Title & Badges */}
        <div className="flex-1 min-w-0 pr-2 sm:pr-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3
              className={`text-sm font-semibold truncate max-w-45 xs:max-w-[220px] sm:max-w-none transition-colors ${
                item.isActive ? "text-zinc-100 group-hover:text-white" : "text-zinc-400"
              }`}
            >
              {item.title}
            </h3>
            {!item.isActive && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[9px] font-mono font-medium text-amber-400/90 shrink-0">
                Disabled
              </span>
            )}
            {item.badge && (
              <span className="px-1.5 py-0.5 rounded-full bg-zinc-800 border border-white/10 text-[9px] font-mono font-medium text-zinc-300 shrink-0">
                {item.badge}
              </span>
            )}
            {item.type === "DONATION" && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[9px] font-mono text-amber-300 flex items-center gap-1 shrink-0">
                <Coffee className="w-2.5 h-2.5" /> Tip Block
              </span>
            )}
            {item.type === "NOTE" && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[9px] font-mono text-amber-300 flex items-center gap-1 shrink-0">
                <StickyNote className="w-2.5 h-2.5" /> Note Block
              </span>
            )}
            {(item.startsAt || item.expiresAt) && (
              <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-[9px] font-mono text-blue-300 flex items-center gap-1 shrink-0">
                <Clock className="w-2.5 h-2.5" /> Scheduled
              </span>
            )}
            {item.isPasswordProtected && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-[9px] font-mono text-purple-300 flex items-center gap-1 shrink-0">
                <Lock className="w-2.5 h-2.5" /> PIN Locked
              </span>
            )}
            {item.isAgeRestricted && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[9px] font-mono text-rose-300 flex items-center gap-1 shrink-0">
                <ShieldAlert className="w-2.5 h-2.5" /> 18+
              </span>
            )}
          </div>

          {/* Desktop Subline: URL and Clicks */}
          <div className="hidden sm:flex items-center space-x-3 mt-1">
            <span className="text-xs font-mono text-zinc-500 truncate max-w-50 sm:max-w-65 group-hover:text-zinc-400 transition-colors">
              {item.type === "NOTE" ? `📝 ${item.url}` : item.url.replace(/^https?:\/\//, "")}
            </span>
            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-white/5 text-[11px] font-mono text-zinc-400 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{formattedClicks} clicks</span>
            </span>
          </div>
        </div>

        {/* Mobile Switch (Top Right) */}
        <div className="sm:hidden shrink-0 ml-2">
          <button
            role="switch"
            aria-checked={item.isActive}
            onClick={() => onToggleActive(item.id)}
            className={`relative inline-flex items-center w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-200 focus:outline-none ${
              item.isActive ? "bg-white" : "bg-zinc-700"
            }`}
            title={item.isActive ? "Click to disable link" : "Click to enable link"}
          >
            <span
              className={`switch-knob inline-block w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${
                item.isActive
                  ? "translate-x-4 bg-[#09090b]"
                  : "translate-x-0 bg-zinc-300"
              }`}
            />
          </button>
        </div>
      </div>

      {/* BOTTOM SUB-ROW (Mobile) / INLINE RIGHT (Desktop) */}
      <div className="flex items-center justify-between w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 pl-8 sm:pl-0 shrink-0">
        {/* Mobile URL & Clicks Counter */}
        <div className="flex sm:hidden items-center space-x-2 min-w-0 pr-2">
          <span className="text-[11px] font-mono text-zinc-500 truncate max-w-32.5 xs:max-w-[170px]">
            {item.type === "NOTE" ? `📝 ${item.url}` : item.url.replace(/^https?:\/\//, "")}
          </span>
          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-zinc-900 border border-white/5 text-[10px] font-mono text-zinc-400 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{formattedClicks}</span>
          </span>
        </div>

        {/* Actions & Desktop Switch */}
        <div className="flex items-center space-x-1 sm:space-x-2 shrink-0 ml-auto sm:ml-0">
          <button
            onClick={() => onDuplicate(item)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer"
            title="Open Destination URL"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={() => onEdit(item)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 active:scale-90 transition-all cursor-pointer"
            title="Edit Link"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(item.id)}
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 active:scale-90 transition-all cursor-pointer"
            title="Delete Link"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Desktop Separator & Switch */}
          <div className="hidden sm:block h-4 w-px bg-white/10 mx-1" />

          <button
            role="switch"
            aria-checked={item.isActive}
            onClick={() => onToggleActive(item.id)}
            className={`hidden sm:inline-flex relative items-center w-10 h-5 rounded-full p-0.5 cursor-pointer transition-colors duration-200 focus:outline-none ${
              item.isActive ? "bg-white" : "bg-zinc-700"
            }`}
            title={item.isActive ? "Click to disable link" : "Click to enable link"}
          >
            <span
              className={`switch-knob inline-block w-4 h-4 rounded-full shadow-sm transition-transform duration-200 ${
                item.isActive
                  ? "translate-x-5 bg-[#09090b]"
                  : "translate-x-0 bg-zinc-300"
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}


