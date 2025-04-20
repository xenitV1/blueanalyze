import React, { forwardRef, useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  className?: string;
  inputClassName?: string;
  isBlueskyUsername?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    label, 
    error, 
    helperText, 
    fullWidth = true, 
    className = '', 
    inputClassName = '',
    isBlueskyUsername = false,
    ...props 
  }, ref) => {
    const { language } = useLanguage();
    const [showAtWarning, setShowAtWarning] = useState(false);
    const [visualValue, setVisualValue] = useState('');
    const [actualValue, setActualValue] = useState('');
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const [selectionStart, setSelectionStart] = useState<number | null>(null);
    
    useEffect(() => {
      if (isBlueskyUsername && props.value) {
        const val = props.value as string;
        setActualValue(val);
        
        if (val.includes('.bsky.social')) {
          const username = val.split('.bsky.social')[0];
          setVisualValue(username);
        } else {
          setVisualValue(val);
        }
      }
    }, [props.value, isBlueskyUsername]);
    
    const handleBlueskyUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const cursorPosition = e.target.selectionStart;
      let newValue = e.target.value;
      
      if (newValue.startsWith('@')) {
        newValue = newValue.substring(1);
        setShowAtWarning(true);
      } else {
        setShowAtWarning(false);
      }
      
      setVisualValue(newValue);
      
      const fullHandle = newValue ? `${newValue}.bsky.social` : newValue;
      setActualValue(fullHandle);
      
      setSelectionStart(cursorPosition);
      
      if (props.onChange) {
        const syntheticEvent = {
          ...e,
          target: {
            ...e.target,
            value: fullHandle
          }
        } as React.ChangeEvent<HTMLInputElement>;
        
        props.onChange(syntheticEvent);
      }
    };
    
    useEffect(() => {
      if (selectionStart !== null && inputRef.current) {
        inputRef.current.selectionStart = selectionStart;
        inputRef.current.selectionEnd = selectionStart;
        setSelectionStart(null);
      }
    }, [selectionStart, visualValue]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (isBlueskyUsername) {
        handleBlueskyUsernameChange(e);
        return;
      }
      
      if (e.target.value.includes('@')) {
        setShowAtWarning(true);
      } else {
        setShowAtWarning(false);
      }
      
      if (props.onChange) {
        props.onChange(e);
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (isBlueskyUsername && visualValue && !visualValue.includes('.')) {
        const fullHandle = `${visualValue}.bsky.social`;
        setActualValue(fullHandle);
        
        if (props.onChange) {
          const syntheticEvent = {
            ...e,
            target: {
              ...e.target,
              value: fullHandle
            }
          } as unknown as React.ChangeEvent<HTMLInputElement>;
          
          props.onChange(syntheticEvent);
        }
      }
      
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    const inputClasses = `w-full px-4 py-2 rounded-lg border-2 
      ${error 
        ? 'border-red-500 focus:border-red-500' 
        : 'border-gray-300 focus:border-primary dark:border-gray-600 dark:bg-gray-800 dark:text-white'} 
      focus:outline-none transition-colors ${inputClassName}`;
    
    const containerClasses = `${fullWidth ? 'w-full' : ''} ${className}`;
    
    const renderBlueskyDomainHelper = () => {
      if (!isBlueskyUsername) return null;
      
      return (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {language === 'TR' 
            ? '@ işareti kullanmayın. .bsky.social otomatik eklenecektir.' 
            : 'No need to use @ or type .bsky.social - it will be added automatically.'}
        </div>
      );
    };
    
    return (
      <div className={containerClasses}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {label}
          </label>
        )}
        <input
          ref={(node) => {
            if (typeof ref === 'function') {
              ref(node);
            } else if (ref) {
              ref.current = node;
            }
            inputRef.current = node;
          }}
          className={inputClasses}
          {...props}
          value={isBlueskyUsername ? visualValue : props.value}
          onChange={handleChange}
          onBlur={handleBlur}
        />
        {renderBlueskyDomainHelper()}
        {showAtWarning && !isBlueskyUsername && (
          <div className="mt-1 text-sm text-amber-600 dark:text-amber-400">
            {language === 'TR' 
              ? '@\' işareti kullanmayınız. Kullanıcı adını direkt yazabilirsiniz.' 
              : 'Do not use the \'@\' symbol. You can enter the username directly.'}
          </div>
        )}
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
        {helperText && !error && !isBlueskyUsername && (
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input; 