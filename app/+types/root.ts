export namespace Route {
  export interface LinksFunction {
    (): {
      rel: string;
      href: string;
      crossOrigin?: string;
    }[];
  }
  export interface ErrorBoundaryProps {
    error: unknown;
  }
} 