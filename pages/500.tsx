export default function Custom500() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: '32px',
        fontFamily: 'system-ui, sans-serif',
        background: '#f5efe5',
        color: '#2c241d',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: '520px' }}>
        <p style={{ letterSpacing: '0.18em', textTransform: 'uppercase', color: '#8f4b2d', marginBottom: '12px' }}>
          Paperstack
        </p>
        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 3.2rem)', margin: '0 0 12px' }}>
          Archive page unavailable
        </h1>
        <p style={{ margin: 0, lineHeight: 1.6, color: '#6f6558' }}>
          The archive route hit an unexpected problem. Refresh in a moment or try again from the homepage.
        </p>
      </div>
    </main>
  );
}
