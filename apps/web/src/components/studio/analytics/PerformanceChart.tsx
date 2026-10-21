"use client";

import React, { useState, useRef } from "react";

interface TimeSeriesPoint {
  date: string;
  views: number;
  clicks: number;
}

interface PerformanceChartProps {
  data: TimeSeriesPoint[];
}

export function PerformanceChart({ data }: PerformanceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-zinc-500 text-sm">
        No telemetry recorded for this time window.
      </div>
    );
  }

  // Chart dimensions
  const width = 800;
  const height = 260;
  const paddingX = 40;
  const paddingTop = 20;
  const paddingBottom = 40;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.views, d.clicks)),
    10
  );
  // Round up maxVal for pleasant grid ticks
  const chartMax = Math.ceil(maxVal * 1.15);

  const getX = (index: number) => {
    if (data.length <= 1) return paddingX + (width - paddingX * 2) / 2;
    return paddingX + (index / (data.length - 1)) * (width - paddingX * 2);
  };

  const getY = (val: number) => {
    const usableHeight = height - paddingTop - paddingBottom;
    return height - paddingBottom - (val / chartMax) * usableHeight;
  };

  // Generate SVG path strings
  const viewsPoints = data.map((d, i) => `${getX(i)},${getY(d.views)}`);
  const clicksPoints = data.map((d, i) => `${getX(i)},${getY(d.clicks)}`);

  const viewsPath = viewsPoints.reduce((acc, curr, i) => {
    if (i === 0) return `M ${curr}`;
    return `${acc} L ${curr}`;
  }, "");

  const clicksPath = clicksPoints.reduce((acc, curr, i) => {
    if (i === 0) return `M ${curr}`;
    return `${acc} L ${curr}`;
  }, "");

  // Area paths for gradient fills
  const viewsAreaPath = `${viewsPath} L ${getX(data.length - 1)},${height - paddingBottom} L ${getX(0)},${height - paddingBottom} Z`;
  const clicksAreaPath = `${clicksPath} L ${getX(data.length - 1)},${height - paddingBottom} L ${getX(0)},${height - paddingBottom} Z`;

  // Handle pointer tracking
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const svgX = (mouseX / rect.width) * width;

    // Find closest data point
    let closestIndex = 0;
    let minDistance = Infinity;
    data.forEach((_, i) => {
      const distance = Math.abs(getX(i) - svgX);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    });

    setHoverIndex(closestIndex);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const activePoint = hoverIndex !== null ? data[hoverIndex] : null;
  const activeX = hoverIndex !== null ? getX(hoverIndex) : 0;
  const activeViewsY = hoverIndex !== null && activePoint ? getY(activePoint.views) : 0;
  const activeClicksY = hoverIndex !== null && activePoint ? getY(activePoint.clicks) : 0;

  // Format date helper for X-axis labels
  const formatLabel = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  // Select evenly spaced indices for X-axis labels (around 5 labels)
  const step = Math.max(1, Math.floor(data.length / 5));
  const labelIndices = [];
  for (let i = 0; i < data.length; i += step) {
    labelIndices.push(i);
  }
  if (labelIndices[labelIndices.length - 1] !== data.length - 1) {
    labelIndices.push(data.length - 1);
  }

  return (
    <div ref={containerRef} className="relative w-full select-none">
      {/* Chart Legend */}
      <div className="flex items-center justify-end space-x-6 mb-4 text-xs font-medium">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-white shadow-xs shadow-white/50" />
          <span className="text-zinc-300">Total Views</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-xs shadow-emerald-400/50" />
          <span className="text-zinc-300">Link Clicks</span>
        </div>
      </div>

      <div className="relative w-full aspect-800/260 bg-[#0d0d10] rounded-xl border border-white/5 p-2 overflow-hidden shadow-inner">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full cursor-crosshair overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="clicksGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
            const y = height - paddingBottom - pct * (height - paddingTop - paddingBottom);
            return (
              <g key={pct}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="rgba(255,255,255,0.05)"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill="#71717a"
                  fontFamily="system-ui"
                >
                  {Math.round(chartMax * pct)}
                </text>
              </g>
            );
          })}

          {/* Area Fills */}
          <path d={viewsAreaPath} fill="url(#viewsGradient)" />
          <path d={clicksAreaPath} fill="url(#clicksGradient)" />

          {/* Polyline Paths */}
          <path
            d={viewsPath}
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={clicksPath}
            fill="none"
            stroke="#34d399"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* X Axis Labels */}
          {labelIndices.map((idx) => {
            const x = getX(idx);
            return (
              <text
                key={idx}
                x={x}
                y={height - 12}
                textAnchor="middle"
                fontSize="11"
                fill="#71717a"
                fontFamily="system-ui"
              >
                {formatLabel(data[idx].date)}
              </text>
            );
          })}

          {/* Hover Guide & Active Marker Dots */}
          {hoverIndex !== null && activePoint && (
            <g>
              {/* Vertical Guide */}
              <line
                x1={activeX}
                y1={paddingTop}
                x2={activeX}
                y2={height - paddingBottom}
                stroke="rgba(255, 255, 255, 0.25)"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />

              {/* Views Dot */}
              <circle
                cx={activeX}
                cy={activeViewsY}
                r="6"
                fill="#ffffff"
                stroke="#09090b"
                strokeWidth="2"
                className="drop-shadow-md"
              />

              {/* Clicks Dot */}
              <circle
                cx={activeX}
                cy={activeClicksY}
                r="6"
                fill="#34d399"
                stroke="#09090b"
                strokeWidth="2"
                className="drop-shadow-md"
              />
            </g>
          )}
        </svg>

        {/* Floating Tooltip HTML Overlay */}
        {hoverIndex !== null && activePoint && (
          <div
            className="absolute z-20 pointer-events-none transform -translate-x-1/2 bottom-16 bg-[#18181b]/95 backdrop-blur-md border border-white/10 rounded-lg p-3 text-xs shadow-2xl min-w-36 transition-all duration-75"
            style={{
              left: `${(activeX / width) * 100}%`,
            }}
          >
            <div className="font-semibold text-zinc-200 border-b border-white/10 pb-1.5 mb-2">
              {formatLabel(activePoint.date)}
            </div>
            <div className="flex items-center justify-between text-zinc-300 mb-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white" />
                Views:
              </span>
              <span className="font-semibold text-white">
                {activePoint.views.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-zinc-300 mb-1.5">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Clicks:
              </span>
              <span className="font-semibold text-emerald-400">
                {activePoint.clicks.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[11px] text-zinc-400">
              <span>Conversion:</span>
              <span className="font-medium text-zinc-200">
                {activePoint.views > 0
                  ? ((activePoint.clicks / activePoint.views) * 100).toFixed(1)
                  : "0"}
                %
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
