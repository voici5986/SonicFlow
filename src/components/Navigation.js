import React from 'react';
import useNavigationState from '../hooks/useNavigationState';
import DesktopNavbar from './DesktopNavbar';
import MobileBottomNav from './MobileBottomNav';
import '../styles/NavigationFix.css';

const Navigation = ({ activeTab, onTabChange, onAuthClick }) => {
  const {
    expanded,
    setExpanded,
    scrolled,
    currentUser,
    handleNavItemClick,
    userInitial,
    navItems
  } = useNavigationState({ activeTab, onTabChange });

  return (
    <>
      <DesktopNavbar
        activeTab={activeTab}
        expanded={expanded}
        setExpanded={setExpanded}
        scrolled={scrolled}
        currentUser={currentUser}
        handleNavItemClick={handleNavItemClick}
        userInitial={userInitial}
        navItems={navItems}
      />
      <MobileBottomNav
        activeTab={activeTab}
        handleNavItemClick={handleNavItemClick}
        navItems={navItems}
      />
    </>
  );
};

export default Navigation;
