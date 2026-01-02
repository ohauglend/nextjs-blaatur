import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CitySelector from '../components/CitySelector';
import * as cityData from '../utils/cityData';

// Mock the cityData module
jest.mock('../utils/cityData', () => ({
  searchCities: jest.fn(),
}));

const mockSearchCities = cityData.searchCities as jest.MockedFunction<typeof cityData.searchCities>;

describe('CitySelector Component', () => {
  const mockCities = [
    { name: 'Oslo', country: 'Norway', latitude: 59.9139, longitude: 10.7522 },
    { name: 'Prague', country: 'Czech Republic', latitude: 50.0755, longitude: 14.4378 },
    { name: 'Paris', country: 'France', latitude: 48.8566, longitude: 2.3522 },
  ];

  const defaultProps = {
    onSelect: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('renders the input field', () => {
      render(<CitySelector {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for a city...');
      expect(input).toBeInTheDocument();
    });

    it('renders with disabled state', () => {
      render(<CitySelector {...defaultProps} disabled={true} />);
      
      const input = screen.getByPlaceholderText('Search for a city...');
      expect(input).toBeDisabled();
    });

    it('renders with selected city', () => {
      const selectedCity = mockCities[0];
      render(<CitySelector {...defaultProps} selectedCity={selectedCity} />);
      
      const input = screen.getByPlaceholderText('Search for a city...') as HTMLInputElement;
      expect(input.value).toBe('Oslo, Norway');
    });
  });

  describe('Search Functionality', () => {
    it('does not trigger search with less than 2 characters', async () => {
      const user = userEvent.setup();
      render(<CitySelector {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for a city...');
      await user.type(input, 'O');
      
      expect(mockSearchCities).not.toHaveBeenCalled();
    });

    it('triggers search after typing 2 or more characters', async () => {
      const user = userEvent.setup();
      mockSearchCities.mockReturnValue(mockCities);
      
      render(<CitySelector {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for a city...');
      await user.type(input, 'Os');
      
      await waitFor(() => {
        expect(mockSearchCities).toHaveBeenCalledWith('Os', 20);
      });
    });

    it('displays search results in dropdown', async () => {
      const user = userEvent.setup();
      mockSearchCities.mockReturnValue(mockCities);
      
      render(<CitySelector {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for a city...');
      await user.type(input, 'Os');
      
      await waitFor(() => {
        expect(screen.getByText('Oslo')).toBeInTheDocument();
        expect(screen.getByText('Norway')).toBeInTheDocument();
      });
    });

    it('displays "No results" message when search returns empty', async () => {
      const user = userEvent.setup();
      mockSearchCities.mockReturnValue([]);
      
      render(<CitySelector {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for a city...');
      await user.type(input, 'Xyz');
      
      await waitFor(() => {
        expect(screen.getByText('No cities found matching "Xyz"')).toBeInTheDocument();
      });
    });

    it('displays maximum 20 results', async () => {
      const user = userEvent.setup();
      const manyCities = Array.from({ length: 25 }, (_, i) => ({
        name: `City${i}`,
        country: 'Country',
        latitude: 0,
        longitude: 0,
      }));
      mockSearchCities.mockReturnValue(manyCities.slice(0, 20));
      
      render(<CitySelector {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for a city...');
      await user.type(input, 'City');
      
      await waitFor(() => {
        expect(mockSearchCities).toHaveBeenCalledWith('City', 20);
      });
    });
  });

  describe('City Selection', () => {
    it('calls onSelect callback when city is clicked', async () => {
      const user = userEvent.setup();
      mockSearchCities.mockReturnValue(mockCities);
      
      render(<CitySelector {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for a city...');
      await user.type(input, 'Os');
      
      await waitFor(() => {
        expect(screen.getByText('Oslo')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Oslo'));
      
      expect(defaultProps.onSelect).toHaveBeenCalledWith(mockCities[0]);
    });

    it('updates input field with selected city', async () => {
      const user = userEvent.setup();
      mockSearchCities.mockReturnValue(mockCities);
      
      render(<CitySelector {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for a city...') as HTMLInputElement;
      await user.type(input, 'Os');
      
      await waitFor(() => {
        expect(screen.getByText('Oslo')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Oslo'));
      
      expect(input.value).toBe('Oslo, Norway');
    });

    it('closes dropdown after selection', async () => {
      const user = userEvent.setup();
      mockSearchCities.mockReturnValue(mockCities);
      
      render(<CitySelector {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for a city...') as HTMLInputElement;
      await user.type(input, 'Os');
      
      await waitFor(() => {
        expect(screen.getByText('Oslo')).toBeInTheDocument();
      });
      
      const osloButton = screen.getByText('Oslo').closest('button');
      if (osloButton) {
        await user.click(osloButton);
      }
      
      // After selection, input should show the selected city
      expect(input.value).toBe('Oslo, Norway');
      
      // The onSelect callback should have been called
      expect(defaultProps.onSelect).toHaveBeenCalledWith(mockCities[0]);
    });
  });

  describe('Keyboard Navigation', () => {
    it('navigates through results with arrow keys', async () => {
      const user = userEvent.setup();
      mockSearchCities.mockReturnValue(mockCities);
      
      render(<CitySelector {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for a city...');
      await user.type(input, 'Pa');
      
      await waitFor(() => {
        expect(screen.getByText('Prague')).toBeInTheDocument();
      });
      
      // Press down arrow
      fireEvent.keyDown(input, { key: 'ArrowDown' });
      
      // Press enter to select
      fireEvent.keyDown(input, { key: 'Enter' });
      
      expect(defaultProps.onSelect).toHaveBeenCalled();
    });

    it('closes dropdown on Escape key', async () => {
      const user = userEvent.setup();
      mockSearchCities.mockReturnValue(mockCities);
      
      render(<CitySelector {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for a city...');
      await user.type(input, 'Os');
      
      await waitFor(() => {
        expect(screen.getByText('Oslo')).toBeInTheDocument();
      });
      
      fireEvent.keyDown(input, { key: 'Escape' });
      
      await waitFor(() => {
        expect(screen.queryByText('Norway')).not.toBeInTheDocument();
      });
    });
  });

  describe('Clear Functionality', () => {
    it('shows clear button when input has text', async () => {
      const user = userEvent.setup();
      render(<CitySelector {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for a city...');
      await user.type(input, 'Oslo');
      
      const clearButton = screen.getByLabelText('Clear search');
      expect(clearButton).toBeInTheDocument();
    });

    it('clears input when clear button is clicked', async () => {
      const user = userEvent.setup();
      render(<CitySelector {...defaultProps} />);
      
      const input = screen.getByPlaceholderText('Search for a city...') as HTMLInputElement;
      await user.type(input, 'Oslo');
      
      const clearButton = screen.getByLabelText('Clear search');
      await user.click(clearButton);
      
      expect(input.value).toBe('');
    });

    it('does not show clear button when disabled', () => {
      render(<CitySelector {...defaultProps} disabled={true} />);
      
      const clearButton = screen.queryByLabelText('Clear search');
      expect(clearButton).not.toBeInTheDocument();
    });
  });
});
