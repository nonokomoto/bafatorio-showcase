import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { updateUserAttributeThunk } from '../../Redux/Auth/userSlice';
import { FiChevronDown, FiCheck } from 'react-icons/fi';
import PT from 'country-flag-icons/react/3x2/PT';
import US from 'country-flag-icons/react/3x2/US';
import FR from 'country-flag-icons/react/3x2/FR';

const languages = [
  {
    code: 'pt-PT',
    name: 'Português',
    short: 'PT',
    Flag: PT
  },
  {
    code: 'en-US',
    name: 'English',
    short: 'EN',
    Flag: US
  },
  {
    code: 'fr-FR',
    name: 'Français',
    short: 'FR',
    Flag: FR
  }
];

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(state => state.user.isAuthenticated);

  // Load saved language preference on component mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferredLanguage');
    if (
      savedLanguage &&
      languages.some(lang => lang.code === savedLanguage) &&
      i18n.language !== savedLanguage
    ) {
      i18n.changeLanguage(savedLanguage);
    }
  }, [i18n]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('preferredLanguage', langCode);

    // If user is authenticated, update their language preference in Cognito
    if (isAuthenticated) {
      dispatch(updateUserAttributeThunk({
        attributeKey: 'custom:signup_language',
        value: langCode
      }));
    }

    setIsOpen(false);
  };

  // Find the current language
  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
  const CurrentFlag = currentLanguage.Flag;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center text-foreground text-sm px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
        aria-label="Select language"
        aria-expanded={isOpen}
      >
        <CurrentFlag className="w-5 h-auto rounded-sm shadow-sm mr-1.5" title={currentLanguage.name} />
        <span className="text-xs hidden md:inline">{currentLanguage.short}</span>
        <FiChevronDown className={`w-3 h-3 ml-0.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        // overflow-hidden recorta o hover dos itens aos cantos arredondados
        <div className="absolute right-0 mt-1 w-44 bg-card rounded-lg shadow-dropdown z-50 animate-fade-in border border-border overflow-hidden">
          <ul className="py-1">
            {languages.map((lang) => {
              const LangFlag = lang.Flag;
              return (
                <li key={lang.code}>
                  <button
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`flex items-center justify-between w-full px-3 py-2 text-sm ${
                      i18n.language === lang.code
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center">
                      <LangFlag className="w-5 h-auto rounded-sm shadow-sm mr-2.5" title={lang.name} />
                      <span>{lang.short}</span>
                    </div>
                    {i18n.language === lang.code && <FiCheck className="w-4 h-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
