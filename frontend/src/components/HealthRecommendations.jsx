import React, { useState, useEffect } from 'react';
import PeopleIcon from '@mui/icons-material/People';
import ElderlyIcon from '@mui/icons-material/Elderly';
import StethoscopeIcon from '@mui/icons-material/MedicalServices';
import FavoriteIcon from '@mui/icons-material/Favorite';
import DirectionsRunIcon from '@mui/icons-material/DirectionsRun';
import PregnantWomanIcon from '@mui/icons-material/PregnantWoman';
import ChildCareIcon from '@mui/icons-material/ChildCare';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import '../styles/HealthRecommendations.css';

// All available population groups mapping
const allTabs = [
  { id: 'generalPopulation', icon: PeopleIcon, label: 'General Population' },
  { id: 'elderly', icon: ElderlyIcon, label: 'Elderly' },
  { id: 'lungDiseasePopulation', icon: StethoscopeIcon, label: 'Lung Disease' },
  { id: 'heartDiseasePopulation', icon: FavoriteIcon, label: 'Heart Disease' },
  { id: 'athletes', icon: DirectionsRunIcon, label: 'Athletes' },
  { id: 'pregnantWomen', icon: PregnantWomanIcon, label: 'Pregnant Women' },
  { id: 'children', icon: ChildCareIcon, label: 'Children' },
  { id: 'primary', icon: PeopleIcon, label: 'Personalized' },
  { id: 'secondary', icon: PeopleIcon, label: 'Additional' }
];

export default function HealthRecommendations({ recommendations }) {
  const [activeTab, setActiveTab] = useState(null);
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Filter tabs to only show those with recommendations
  const availableTabs = allTabs.filter(tab => recommendations && recommendations[tab.id]);

  useEffect(() => {
    // Set the first available tab as active on mount or when recommendations change
    if (availableTabs.length > 0 && !activeTab) {
      setActiveTab(availableTabs[0].id);
    }
  }, [recommendations, availableTabs, activeTab]);

  const getVisibleTabsAndLayout = () => {
    if (availableTabs.length === 0) {
      return {
        hasLeftChevron: false,
        hasRightChevron: false,
        tabs: []
      };
    }

    if (visibleStartIndex === 0) {
      // Initial state: icons 0,1,2,3 + > (if more tabs exist)
      return {
        hasLeftChevron: false,
        hasRightChevron: availableTabs.length > 4,
        tabs: availableTabs.slice(0, 4)
      };
    } else {
      // After first click and beyond
      const startIndex = visibleStartIndex + 1;
      const maxEndIndex = Math.min(startIndex + 3, availableTabs.length);

      if (maxEndIndex === availableTabs.length && availableTabs.length - startIndex < 4) {
        // End case: show last 4 tabs
        return {
          hasLeftChevron: true,
          hasRightChevron: false,
          tabs: availableTabs.slice(availableTabs.length - 4, availableTabs.length)
        };
      } else if (maxEndIndex < availableTabs.length) {
        // Middle case: < + 3 icons + >
        return {
          hasLeftChevron: true,
          hasRightChevron: true,
          tabs: availableTabs.slice(startIndex, maxEndIndex)
        };
      } else {
        // Edge case: < + remaining icons
        return {
          hasLeftChevron: true,
          hasRightChevron: false,
          tabs: availableTabs.slice(startIndex, availableTabs.length)
        };
      }
    }
  };

  useEffect(() => {
    const layout = getVisibleTabsAndLayout();
    setCanScrollLeft(layout.hasLeftChevron);
    setCanScrollRight(layout.hasRightChevron);
    // eslint-disable-next-line
  }, [visibleStartIndex, availableTabs]);

  const scrollLeft = () => {
    if (canScrollLeft) {
      setVisibleStartIndex(prev => Math.max(0, prev - 1));
    }
  };

  const scrollRight = () => {
    if (canScrollRight) {
      setVisibleStartIndex(prev => Math.min(availableTabs.length - 3, prev + 1));
    }
  };

  const layout = getVisibleTabsAndLayout();

  const getTabTitle = (tabId) => {
    const tab = allTabs.find(t => t.id === tabId);
    return tab ? tab.label : '';
  };

  if (availableTabs.length === 0 || !activeTab) {
    return (
      <div className="health-recommendations-container">
        <h2 className="health-recommendations-title">
          Health Recommendations
        </h2>
        <p className="health-recommendations-content-text">
          No personalized recommendations available at this time.
        </p>
      </div>
    );
  }

  return (
    <div className="health-recommendations-container">
      <h2 className="health-recommendations-title">
        Health Recommendations
      </h2>
      {availableTabs.length > 1 && (
        <div className="health-recommendations-tab-bar">
          {layout.hasLeftChevron && (
            <button
              onClick={scrollLeft}
              className="health-recommendations-tab-button chevron"
              aria-label="Scroll left"
              type="button"
            >
              <ChevronLeftIcon fontSize="medium" />
            </button>
          )}

          {layout.tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`health-recommendations-tab-button${isActive ? ' active' : ''}`}
                type="button"
                aria-label={tab.label}
              >
                <IconComponent fontSize="medium" className={isActive ? 'active-icon' : ''} />
              </button>
            );
          })}

          {layout.hasRightChevron && (
            <button
              onClick={scrollRight}
              className="health-recommendations-tab-button chevron"
              aria-label="Scroll right"
              type="button"
            >
              <ChevronRightIcon fontSize="medium" />
            </button>
          )}
        </div>
      )}
      <div className="health-recommendations-content">
        <h3 className="health-recommendations-content-title">
          {getTabTitle(activeTab)}
        </h3>
        <p className="health-recommendations-content-text">
          {recommendations[activeTab]}
        </p>
      </div>
    </div>
  );
}