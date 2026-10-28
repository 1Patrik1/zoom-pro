import { Component } from 'react';

/**
 * Zachytí neošetřené chyby při renderu podřízených komponent a zobrazí
 * bezpečnou obrazovku s možností obnovení, místo aby spadla celá PWA.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Volitelný log do konzole; produkčně se sem může napojit telemetrie.
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            gap: '12px',
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif'
          }}
        >
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>Něco se pokazilo</h1>
          <p style={{ maxWidth: '480px', color: '#64748b' }}>
            Aplikace narazila na neočekávanou chybu. Zkuste to znovu, nebo obnovte stránku.
          </p>
          <pre
            style={{
              maxWidth: '640px',
              overflow: 'auto',
              fontSize: '12px',
              padding: '12px',
              background: '#f1f5f9',
              borderRadius: '8px',
              whiteSpace: 'pre-wrap'
            }}
          >
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={this.handleRetry}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              Zkusit znovu
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: '#0ea5e9',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              Obnovit stránku
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
