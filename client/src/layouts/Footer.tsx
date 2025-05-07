import { useEffect, useState } from 'react';

const Footer = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, []);

  return (
    <footer className="border-t border-gray-200 bg-white px-4 py-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div>© 2025 MACSYS Systems. All rights reserved.</div>
        <div className="flex items-center space-x-3">
          <div>
            {currentTime.toLocaleDateString()} {currentTime.toLocaleTimeString()}
          </div>
          <div className="flex items-center">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500"></span>
            System Status: Online
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
