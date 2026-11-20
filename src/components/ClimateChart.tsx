import { useState } from 'react';
import type { DailyForecast, Language } from '../lib/types';

interface ClimateChartProps {
  daily: DailyForecast[];
  language: Language;
  rainLegend: string;
  et0Legend: string;
}

function shortDayLabel(isoDate: string, language: Language): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate.slice(5);
  return date.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-US', {
    weekday: 'short',
    day: 'numeric',
  });
}

export function ClimateChart({ daily, language, rainLegend, et0Legend }: ClimateChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!daily.length) {
    return null;
  }

  const width = 680;
  const height = 248;
  const padLeft = 42;
  const padRight = 40;
  const padTop = 22;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Dual-axis scaling: left axis for Rainfall (mm), right axis for ET0 (mm/day)
  // Prevents heavy monsoon rainfall peaks from flattening the daily ET0 curve.
  const rawMaxRain = Math.max(12, ...daily.map((d) => d.rainMm));
  const maxRain = Math.ceil(rawMaxRain / 10) * 10;

  const rawMaxEt0 = Math.max(4, ...daily.map((d) => d.et0Mm));
  const maxEt0 = Math.ceil(rawMaxEt0 / 2) * 2;

  const slotW = plotW / daily.length;
  const barW = Math.min(34, slotW * 0.42);

  const yForRain = (val: number) => padTop + plotH - (Math.min(maxRain, val) / maxRain) * plotH;
  const yForEt0 = (val: number) => padTop + plotH - (Math.min(maxEt0, val) / maxEt0) * plotH;
  const xCenter = (idx: number) => padLeft + slotW * idx + slotW / 2;

  const et0Points = daily
    .map((d, i) => `${xCenter(i).toFixed(1)},${yForEt0(d.et0Mm).toFixed(1)}`)
    .join(' ');

  const gridTicks = [0, 0.25, 0.5, 0.75, 1];
  const activeDay = hoveredIdx !== null ? daily[hoveredIdx] : daily[0];

  return (
    <div className="w-full">
      {/* Legend & interactive hovered readout */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 text-xs">
        <div className="flex items-center gap-5 text-[#4A5B50]">
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-[2px] bg-[#15803D]/80" aria-hidden="true" />
            <span>{rainLegend}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-3.5 h-[2px] bg-[#B45309]" aria-hidden="true" />
            <span>{et0Legend}</span>
          </span>
        </div>

        <div className="font-mono-tabular text-xs text-[#142119] bg-[#F3F5F2] px-2.5 py-1 rounded border border-[#E2E7E0]">
          {shortDayLabel(activeDay.date, language)} · Rain {activeDay.rainMm.toFixed(1)} mm · ET₀{' '}
          {activeDay.et0Mm.toFixed(1)} mm · {activeDay.tempMax.toFixed(0)}°/{activeDay.tempMin.toFixed(0)}°C · RH{' '}
          {activeDay.humidityPct}%
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="7-day dual-axis rainfall and reference evapotranspiration chart"
          className="w-full min-w-[460px] h-auto select-none"
        >
          {/* Horizontal gridlines + Dual Y-Axis labels */}
          {gridTicks.map((t) => {
            const rainVal = Math.round(maxRain * t);
            const et0Val = (maxEt0 * t).toFixed(1);
            const y = yForRain(rainVal);
            return (
              <g key={t}>
                <line
                  x1={padLeft}
                  x2={width - padRight}
                  y1={y}
                  y2={y}
                  stroke="#E2E7E0"
                  strokeWidth="1"
                  strokeDasharray={t === 0 ? undefined : '3 3'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#4A5B50] text-[10px] font-mono-tabular"
                >
                  {rainVal}
                </text>
                <text
                  x={width - padRight + 8}
                  y={y + 4}
                  textAnchor="start"
                  className="fill-[#B45309] text-[10px] font-mono-tabular"
                >
                  {et0Val}
                </text>
              </g>
            );
          })}

          {/* Rainfall bars (left axis) */}
          {daily.map((d, i) => {
            const cx = xCenter(i);
            const barTop = yForRain(d.rainMm);
            const barH = Math.max(2, padTop + plotH - barTop);
            const isHovered = hoveredIdx === i;

            return (
              <g
                key={d.date}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="cursor-crosshair"
              >
                <rect
                  x={padLeft + slotW * i}
                  y={padTop}
                  width={slotW}
                  height={plotH + padBottom}
                  fill={isHovered ? 'rgba(21, 128, 61, 0.04)' : 'transparent'}
                />
                <rect
                  x={cx - barW / 2}
                  y={barTop}
                  width={barW}
                  height={barH}
                  rx="2"
                  fill={isHovered ? '#15803D' : 'rgba(21, 128, 61, 0.72)'}
                />
                <text
                  x={cx}
                  y={height - 14}
                  textAnchor="middle"
                  className={`text-[11px] ${isHovered ? 'fill-[#142119] font-semibold' : 'fill-[#4A5B50]'}`}
                >
                  {shortDayLabel(d.date, language)}
                </text>
              </g>
            );
          })}

          {/* ET0 Curve (right axis) */}
          <polyline
            fill="none"
            stroke="#B45309"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={et0Points}
          />
          {daily.map((d, i) => (
            <circle
              key={`et-${d.date}`}
              cx={xCenter(i)}
              cy={yForEt0(d.et0Mm)}
              r={hoveredIdx === i ? 4.5 : 3.2}
              fill="#FFFFFF"
              stroke="#B45309"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
