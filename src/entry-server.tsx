import React from 'react';
import { renderToString } from 'react-dom/server';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import { getRouteSeoData, RouteSeoData } from './lib/seoData';

export interface RenderResult {
  appHtml: string;
  seo: RouteSeoData;
}

export function render(url: string = '/'): RenderResult {
  const cleanPath = (url || '/').replace(/^\/|\/$/g, '') || 'home';
  const helmetContext: Record<string, unknown> = {};

  const appHtml = renderToString(
    <HelmetProvider context={helmetContext}>
      <App initialPath={cleanPath} />
    </HelmetProvider>
  );

  const seo = getRouteSeoData(cleanPath);

  return {
    appHtml,
    seo
  };
}
