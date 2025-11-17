import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('❌ ErrorBoundary 捕获错误:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center bg-[var(--bg-primary)] p-8">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-red-500 mb-4">出错了 😢</h1>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h2 className="font-semibold mb-2">错误信息：</h2>
              <pre className="text-sm overflow-auto">
                {this.state.error && this.state.error.toString()}
              </pre>
            </div>
            {this.state.errorInfo && (
              <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <summary className="font-semibold cursor-pointer">详细堆栈</summary>
                <pre className="text-xs overflow-auto mt-2">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              重新加载应用
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
