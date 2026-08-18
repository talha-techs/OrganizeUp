import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileHeader from './MobileHeader';
import MobileDrawer from './MobileDrawer';
import MobileTabBar from './MobileTabBar';
import Footer from './Footer';
import ErrorBoundary from '../ui/ErrorBoundary';

const Layout = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('organizeup-sidebar-collapsed') === 'true';
  });
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const showFooter = location.pathname === '/' || location.pathname === '/explore';

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-primary">
      {/* Desktop Persistent Sidebar */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Mobile Top Header */}
      <MobileHeader onOpenMenu={() => setMobileDrawerOpen(true)} />

      {/* Mobile Slide-Over Drawer */}
      <MobileDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
      />

      {/* Main Content Area with Route-Aware Error Boundary */}
      <main
        className={`flex-1 transition-all duration-300 pb-20 md:pb-8 ${
          isCollapsed ? 'md:pl-20' : 'md:pl-64'
        }`}
      >
        <ErrorBoundary key={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <MobileTabBar />

      {/* Optional Footer */}
      {showFooter && (
        <div className={`transition-all duration-300 ${isCollapsed ? 'md:pl-20' : 'md:pl-64'}`}>
          <Footer />
        </div>
      )}
    </div>
  );
};

export default Layout;
