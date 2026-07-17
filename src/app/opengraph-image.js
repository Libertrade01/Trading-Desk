import { ImageResponse } from 'next/og';

export const alt = 'Libertrade LOOP: Check in. Trade your plan. Close the LOOP.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'stretch',
          background: '#030912',
          color: '#f4f7fb',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'Arial, sans-serif',
          height: '100%',
          justifyContent: 'space-between',
          overflow: 'hidden',
          padding: '58px 70px 50px',
          position: 'relative',
          width: '100%',
        }}
      >
        <div
          style={{
            background: 'radial-gradient(circle, rgba(15, 111, 255, 0.26) 0%, rgba(3, 9, 18, 0) 68%)',
            display: 'flex',
            height: 760,
            position: 'absolute',
            right: -190,
            top: -180,
            width: 760,
          }}
        />
        <div
          style={{
            border: '2px solid rgba(55, 139, 255, 0.17)',
            borderRadius: '50%',
            display: 'flex',
            height: 510,
            position: 'absolute',
            right: -45,
            top: 58,
            width: 510,
          }}
        />
        <div
          style={{
            border: '1px solid rgba(55, 139, 255, 0.12)',
            borderRadius: '50%',
            display: 'flex',
            height: 390,
            position: 'absolute',
            right: 15,
            top: 118,
            width: 390,
          }}
        />

        <div style={{ alignItems: 'center', display: 'flex', fontSize: 29, fontWeight: 700, letterSpacing: '-0.8px' }}>
          <span>Libertrade</span>
          <span style={{ color: '#1474ff', marginLeft: 10 }}>LOOP</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 790, position: 'relative' }}>
          <div style={{ color: '#62adff', display: 'flex', fontSize: 15, fontWeight: 700, letterSpacing: '4px', marginBottom: 24, textTransform: 'uppercase' }}>
            A process-first trading journal
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', fontSize: 68, fontWeight: 700, letterSpacing: '-3px', lineHeight: 1.03 }}>
            <span>Check in.</span>
            <span>Trade your plan.</span>
            <span style={{ display: 'flex' }}>
              <span>Close the</span>
              <span style={{ color: '#1474ff', marginLeft: 16 }}>LOOP.</span>
            </span>
          </div>
        </div>

        <div style={{ alignItems: 'center', borderTop: '1px solid rgba(103, 151, 209, 0.22)', color: '#8fa4bd', display: 'flex', fontSize: 18, justifyContent: 'space-between', paddingTop: 25 }}>
          <span>Prepare. Protect your risk. Review the decisions.</span>
          <span style={{ color: '#dce9f7', fontWeight: 700 }}>libertrade.app</span>
        </div>
      </div>
    ),
    size,
  );
}
