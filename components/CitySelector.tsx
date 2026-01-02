'use client';

import { useState, useEffect, useRef } from 'react';
import { City, searchCities } from '@/utils/cityData';

interface CitySelectorProps {
  onSelect: (city: City) => void;
  disabled?: boolean;
  selectedCity?: City | null;
}

export default function CitySelector({ onSelect, disabled = false, selectedCity = null }: CitySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<City[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isManualSelection, setIsManualSelection] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update input field when selectedCity changes
  useEffect(() => {
    if (selectedCity) {
      setSearchQuery(`${selectedCity.name}, ${selectedCity.country}`);
      setIsDropdownOpen(false);
      setSearchResults([]);
      setIsManualSelection(true);
    }
  }, [selectedCity]);

  // Handle search input changes
  useEffect(() => {
    // Don't search if this is a manual selection (formatted city name)
    if (isManualSelection) {
      setIsManualSelection(false);
      return;
    }
    
    if (searchQuery.length >= 2) {
      const results = searchCities(searchQuery, 20);
      setSearchResults(results || []);
      setIsDropdownOpen((results && results.length > 0) || false);
      setHighlightedIndex(-1);
    } else {
      setSearchResults([]);
      setIsDropdownOpen(false);
    }
  }, [searchQuery, isManualSelection]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCitySelect = (city: City) => {
    const formattedCity = `${city.name}, ${city.country}`;
    setIsManualSelection(true);
    setSearchQuery(formattedCity);
    setIsDropdownOpen(false);
    setSearchResults([]);
    setHighlightedIndex(-1);
    onSelect(city);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isDropdownOpen || searchResults.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < searchResults.length) {
          handleCitySelect(searchResults[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsDropdownOpen(false);
        break;
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Search for a city..."
          className="w-full p-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          disabled={disabled}
          autoComplete="off"
        />
        {searchQuery && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown with search results */}
      {isDropdownOpen && searchResults.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-[400px] overflow-y-auto">
          {searchResults.map((city, index) => (
            <button
              key={`${city.name}-${city.country}-${index}`}
              type="button"
              onClick={() => handleCitySelect(city)}
              className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors ${
                index === highlightedIndex ? 'bg-blue-100' : ''
              }`}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="font-medium text-gray-900">{city.name}</div>
              <div className="text-sm text-gray-500">{city.country}</div>
            </button>
          ))}
        </div>
      )}

      {/* No results message */}
      {searchQuery.length >= 2 && searchResults.length === 0 && !disabled && !selectedCity && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
          <p className="text-sm text-gray-500">No cities found matching "{searchQuery}"</p>
        </div>
      )}
    </div>
  );
}
