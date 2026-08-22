import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Evita la pantalla en blanco ante errores de render: muestra un mensaje de
 * recuperación en lugar de dejar caer todo el árbol de la aplicación.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error de render capturado por ErrorBoundary', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.assign('/');
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-bold text-slate-800">
          Algo salió mal
        </h1>
        <p className="max-w-sm text-sm text-slate-500">
          Ocurrió un error inesperado al cargar esta sección. Vuelve a intentarlo.
        </p>
        <button
          type="button"
          onClick={this.handleReload}
          className="rounded-xl bg-brand-red px-4 py-2 text-sm font-medium text-white hover:bg-[#c80024] transition-colors"
        >
          Recargar la aplicación
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
