import React from 'react'
import Svg, { Path, Line } from 'react-native-svg'

interface DirhamSymbolProps {
  size?: number
  color?: string
}

/**
 * UAE Dirham symbol — capital D with two horizontal bars
 * Drawn as an SVG path for crisp rendering at any size.
 */
export function DirhamSymbol({ size = 14, color = '#FFFFFF' }: DirhamSymbolProps) {
  const w = size
  const h = size * 1.15

  return (
    <Svg width={w} height={h} viewBox="0 0 20 23">
      {/* Vertical stroke (left side of D) */}
      <Path
        d="M4 2 L4 21"
        stroke={color}
        strokeWidth={2.8}
        strokeLinecap="round"
      />
      {/* D curve (right side) */}
      <Path
        d="M4 2 C4 2 18 2 18 11.5 C18 21 4 21 4 21"
        stroke={color}
        strokeWidth={2.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Upper horizontal bar */}
      <Line
        x1="0"
        y1="7"
        x2="20"
        y2="7"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
      {/* Lower horizontal bar */}
      <Line
        x1="0"
        y1="11"
        x2="20"
        y2="11"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  )
}
