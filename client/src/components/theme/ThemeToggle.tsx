import { useDispatch } from 'react-redux';
import { Moon, Sun, Monitor } from 'lucide-react';
import { selectThemeMode, setTheme, ThemeMode } from '../../redux/features/theme';
import { useAppSelector } from '../../redux/store';

type ThemeToggleProps = {
  className?: string;
};

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = '' }) => {
  const dispatch = useDispatch();
  const themeMode = useAppSelector(selectThemeMode);

  const handleToggle = () => {
    // Cycle through modes: light -> dark -> system -> light
    let newMode: ThemeMode;
    
    switch (themeMode) {
      case 'light':
        newMode = 'dark';
        break;
      case 'dark':
        newMode = 'system';
        break;
      case 'system':
      default:
        newMode = 'light';
        break;
    }
    
    dispatch(setTheme(newMode));
  };

  // Determine icon based on current theme
  const renderIcon = () => {
    switch (themeMode) {
      case 'light':
        return <Sun size={20} />;
      case 'dark':
        return <Moon size={20} />;
      case 'system':
        return <Monitor size={20} />;
      default:
        return <Sun size={20} />;
    }
  };

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center justify-center rounded p-2 hover:bg-gray-100 dark:hover:bg-gray-800 ${className}`}
      aria-label="Toggle theme"
      title={`Current theme: ${themeMode}`}
    >
      {renderIcon()}
    </button>
  );
};

export default ThemeToggle;