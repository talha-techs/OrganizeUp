import { NavLink, useLocation } from 'react-router-dom';
import {
  IoGridOutline,
  IoBookOutline,
  IoCompassOutline,
  IoFolderOutline,
  IoBookmarkOutline,
} from 'react-icons/io5';

const MobileTabBar = () => {
  const location = useLocation();

  const tabs = [
    { to: '/dashboard', label: 'Home', icon: IoGridOutline },
    { to: '/books', label: 'Books', icon: IoBookOutline },
    { to: '/explore', label: 'Explore', icon: IoCompassOutline },
    { to: '/sections', label: 'Sections', icon: IoFolderOutline },
    { to: '/saved', label: 'Saved', icon: IoBookmarkOutline },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-surface/90 backdrop-blur-xl border-t border-subtle flex items-center justify-around px-2 pb-safe">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive =
          location.pathname === tab.to ||
          (tab.to !== '/dashboard' && location.pathname.startsWith(tab.to));

        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
              isActive
                ? 'text-accent font-semibold'
                : 'text-muted hover:text-secondary'
            }`}
          >
            <div className="relative">
              <Icon size={20} className={isActive ? 'text-accent' : 'text-muted'} />
              {isActive && (
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent" />
              )}
            </div>
            <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileTabBar;
