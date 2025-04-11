import React, { forwardRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  className?: string;
  inputClassName?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    helperText, 
    fullWidth = true, 
    className = '', 
    inputClassName = '',
    ...props 
  }, ref) => {
    const { language } = useLanguage();
    const [showAtWarning, setShowAtWarning] = useState(false);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value.includes('@')) {
        setShowAtWarning(true);
      } else {
        setShowAtWarning(false);
      }
      
      if (props.onChange) {
        props.onChange(e);
      }
    };

    const inputClasses = `w-full px-4 py-2 rounded-lg border-2 
      ${error 
        ? 'border-red-500 focus:border-red-500' 
        : 'border-gray-300 focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white'} 
      focus:outline-none transition-colors ${inputClassName}`;
    
    const containerClasses = `${fullWidth ? 'w-full' : ''} ${className}`;
    
    return (
      <div className={containerClasses}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={inputClasses}
          {...props}
          onChange={handleChange}
        />
        {showAtWarning && (
          <div className="mt-1 text-sm text-amber-600 dark:text-amber-400">
            {language === 'TR' 
              ? '@\' işareti kullanmayınız. Kullanıcı adını direkt yazabilirsiniz.' 
              : 'Do not use the \'@\' symbol. You can enter the username directly.'}
          </div>
        )}
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
        {helperText && !error && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input; 