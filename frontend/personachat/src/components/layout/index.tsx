import { ReactNode } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/themes/theme-provider";
import { ProgressPanel } from '@/components/ui/progress-panel';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div>
        {children}
        <Toaster />
        <ProgressPanel />
      </div>
    </ThemeProvider>
  );
};

export default Layout;