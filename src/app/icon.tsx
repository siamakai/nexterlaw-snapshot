import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#1a3a6b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid #B8902A',
          outline: '1px solid #B8902A',
          outlineOffset: '-4px',
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.5px',
          }}
        >
          NL
        </span>
      </div>
    ),
    { ...size },
  );
}
