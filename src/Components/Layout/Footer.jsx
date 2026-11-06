import React from 'react';
import ThemeToggle from "../Theme/ThemeToggle";
import { Text } from "../UI";
import { useTranslation } from "react-i18next";

const Footer = () => {
  const { t } = useTranslation('layout');
  const currentYear = new Date().getFullYear();

  return (
    <footer
      className="shrink-0 bg-card border-t border-border shadow-sm relative"
      aria-label="Footer"
      role="contentinfo"
    >
      <div className="w-full max-w-screen-2xl mx-auto px-4 py-3 sm:py-4 md:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          {/* Copyright and branding */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Text variant="body2" color="primary" className="font-display font-semibold">
              Bafatorio
            </Text>
            <Text variant="body2" color="muted" className="text-center sm:text-left">
              &copy;{t('footer.copyright', { currentYear })}
            </Text>
          </div>
          
          {/* Theme switcher and potentially other controls */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default React.memo(Footer);