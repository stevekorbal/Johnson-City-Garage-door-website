import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbsProps {
  paths: { label: string; route?: string }[];
  onNavigate: (route: string) => void;
}

export default function Breadcrumbs({ paths, onNavigate }: BreadcrumbsProps) {
  return (
    <nav className="flex items-center py-3 px-4 bg-slate-50 border-y border-slate-200 text-xs text-slate-500 font-sans">
      <div className="max-w-7xl mx-auto w-full flex flex-wrap items-center gap-1.5 md:gap-2">
        <a
          href="/"
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
              e.preventDefault();
              onNavigate('home');
            }
          }}
          className="flex items-center gap-1 hover:text-blue-900 transition-colors cursor-pointer"
        >
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </a>

        {paths.map((path, idx) => (
          <React.Fragment key={idx}>
            <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
            {path.route ? (
              <a
                href={path.route === 'home' ? '/' : `/${path.route.replace(/^\//, '')}`}
                onClick={(e) => {
                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
                    e.preventDefault();
                    onNavigate(path.route!);
                  }
                }}
                className="hover:text-blue-900 transition-colors font-medium cursor-pointer"
              >
                {path.label}
              </a>
            ) : (
              <span className="text-slate-800 font-semibold truncate max-w-[200px] sm:max-w-none">
                {path.label}
              </span>
            )}
          </React.Fragment>
        ))}
      </div>
    </nav>
  );
}
