import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DestinationGuess from '../components/DestinationGuess'
import * as cityData from '../utils/cityData'

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

// Mock cityData module
jest.mock('../utils/cityData', () => ({
  searchCities: jest.fn(),
}));

const mockSearchCities = cityData.searchCities as jest.MockedFunction<typeof cityData.searchCities>;

describe('DestinationGuess Component', () => {
  const defaultProps = {
    participantId: 'emilie'
  }

  const mockCities = [
    { name: 'Oslo', country: 'Norway', latitude: 59.9139, longitude: 10.7522 },
    { name: 'Prague', country: 'Czech Republic', latitude: 50.0755, longitude: 14.4378 },
  ];

  const mockGuess = {
    id: 1,
    participant_id: 'emilie',
    guess: null,
    city_name: 'Prague',
    country: 'Czech Republic',
    latitude: 50.0755,
    longitude: 14.4378,
    is_active: true,
    distance_km: null,
    is_correct_destination: false,
    created_at: '2025-01-05T10:00:00Z'
  };

  beforeEach(() => {
    mockFetch.mockClear()
    mockSearchCities.mockClear()
  })

  describe('Initial Render', () => {
    it('renders the component with form elements', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      } as Response)

      render(<DestinationGuess {...defaultProps} />)
      
      expect(screen.getByText('Guess the Destination')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Search for a city...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /submit my guess/i })).toBeInTheDocument()
    })

    it('loads previous guesses on mount', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [mockGuess] })
      } as Response)

      render(<DestinationGuess {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/destination-guesses/emilie')
      })
    })

    it('displays active guess when available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [mockGuess] })
      } as Response)

      render(<DestinationGuess {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Currently guessing:')).toBeInTheDocument()
        // Use getAllByText since city appears in both "Currently guessing" and previous guesses
        const cityElements = screen.getAllByText('Prague, Czech Republic')
        expect(cityElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Form Validation', () => {
    it('disables submit button when no city is selected', () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      } as Response)

      render(<DestinationGuess {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /submit my guess/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('City Selection and Submission', () => {
    it('enables submit button after city selection', async () => {
      const user = userEvent.setup()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      } as Response)
      
      mockSearchCities.mockReturnValue(mockCities)

      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search for a city...')
      await user.type(input, 'Os')
      
      await waitFor(() => {
        expect(screen.getByText('Oslo')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Oslo'))
      
      const submitButton = screen.getByRole('button', { name: /submit my guess/i })
      expect(submitButton).toBeEnabled()
    })

    it('calls the correct endpoint with city data on form submission', async () => {
      const user = userEvent.setup()
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] })
        } as Response) // Initial load
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            guess: mockGuess
          })
        } as Response) // Submit
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [mockGuess] })
        } as Response) // Reload after submit

      mockSearchCities.mockReturnValue(mockCities)

      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search for a city...')
      await user.type(input, 'Os')
      
      await waitFor(() => {
        expect(screen.getByText('Oslo')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Oslo'))
      await user.click(screen.getByRole('button', { name: /submit my guess/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/destination-guesses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participantId: 'emilie',
            cityName: 'Oslo',
            country: 'Norway',
            latitude: 59.9139,
            longitude: 10.7522
          })
        })
      })
    })

    it('displays success message after submission', async () => {
      const user = userEvent.setup()
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] })
        } as Response) // Initial load
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, guess: mockGuess })
        } as Response) // Submit
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [mockGuess] })
        } as Response) // Reload

      mockSearchCities.mockReturnValue(mockCities)

      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search for a city...')
      await user.type(input, 'Os')
      
      await waitFor(() => {
        expect(screen.getByText('Oslo')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Oslo'))
      await user.click(screen.getByRole('button', { name: /submit my guess/i }))

      await waitFor(() => {
        expect(screen.getByText('Guess updated to Oslo')).toBeInTheDocument()
      })
    })

    it('displays loading state during submission', async () => {
      const user = userEvent.setup()
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      } as Response)

      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, guess: mockGuess })
        } as Response), 100))
      )

      mockSearchCities.mockReturnValue(mockCities)

      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search for a city...')
      await user.type(input, 'Os')
      
      await waitFor(() => {
        expect(screen.getByText('Oslo')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Oslo'))
      await user.click(screen.getByRole('button', { name: /submit my guess/i }))

      expect(screen.getByText('Submitting...')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('reloads guesses after successful submission', async () => {
      const user = userEvent.setup()
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] })
        } as Response) // Initial load
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, guess: mockGuess })
        } as Response) // Submit
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            data: [mockGuess]
          })
        } as Response) // Reload

      mockSearchCities.mockReturnValue(mockCities)

      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search for a city...')
      await user.type(input, 'Os')
      
      await waitFor(() => {
        expect(screen.getByText('Oslo')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Oslo'))
      await user.click(screen.getByRole('button', { name: /submit my guess/i }))

      await waitFor(() => {
        expect(mockFetch).toHaveBeenLastCalledWith('/api/destination-guesses/emilie')
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      const user = userEvent.setup()
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] })
        } as Response) // Initial load
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Invalid participant ID' })
        } as Response) // Submit failure

      mockSearchCities.mockReturnValue(mockCities)

      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search for a city...')
      await user.type(input, 'Os')
      
      await waitFor(() => {
        expect(screen.getByText('Oslo')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Oslo'))
      await user.click(screen.getByRole('button', { name: /submit my guess/i }))

      await waitFor(() => {
        expect(screen.getByText('Invalid participant ID')).toBeInTheDocument()
      })
    })

    it('displays network error message when fetch fails', async () => {
      const user = userEvent.setup()
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] })
        } as Response) // Initial load
        .mockRejectedValueOnce(new Error('Network error')) // Submit network failure

      mockSearchCities.mockReturnValue(mockCities)

      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search for a city...')
      await user.type(input, 'Os')
      
      await waitFor(() => {
        expect(screen.getByText('Oslo')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Oslo'))
      await user.click(screen.getByRole('button', { name: /submit my guess/i }))

      await waitFor(() => {
        expect(screen.getByText('Network error. Please try again.')).toBeInTheDocument()
      })
    })

    it('handles database not configured error gracefully', async () => {
      const user = userEvent.setup()
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] })
        } as Response) // Initial load
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          json: async () => ({ error: 'Database not yet configured. This feature will work after deployment to Vercel.' })
        } as Response) // Submit with DB error

      mockSearchCities.mockReturnValue(mockCities)

      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Search for a city...')
      await user.type(input, 'Os')
      
      await waitFor(() => {
        expect(screen.getByText('Oslo')).toBeInTheDocument()
      })

      await user.click(screen.getByText('Oslo'))
      await user.click(screen.getByRole('button', { name: /submit my guess/i }))

      await waitFor(() => {
        expect(screen.getByText('Database not yet configured. This feature will work after deployment to Vercel.')).toBeInTheDocument()
      })
    })
  })

  describe('Previous Guesses Display', () => {
    it('displays previous guesses with city names', async () => {
      const mockGuesses = [
        {
          id: 1,
          participant_id: 'emilie',
          guess: null,
          city_name: 'Paris',
          country: 'France',
          latitude: 48.8566,
          longitude: 2.3522,
          is_active: false,
          distance_km: null,
          is_correct_destination: false,
          created_at: '2025-01-05T10:00:00Z'
        },
        {
          id: 2,
          participant_id: 'emilie',
          guess: null,
          city_name: 'Tokyo',
          country: 'Japan',
          latitude: 35.6762,
          longitude: 139.6503,
          is_active: true,
          distance_km: null,
          is_correct_destination: false,
          created_at: '2025-01-05T11:00:00Z'
        }
      ]
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockGuesses })
      } as Response)

      render(<DestinationGuess {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Your Previous Guesses (2)')).toBeInTheDocument()
        // Use getAllByText since active guess appears both in "Currently guessing" and list
        expect(screen.getAllByText('Paris, France').length).toBeGreaterThan(0)
        expect(screen.getAllByText('Tokyo, Japan').length).toBeGreaterThan(0)
      })
    })

    it('marks active guess with badge', async () => {
      const mockGuesses = [
        {
          ...mockGuess,
          is_active: false,
          id: 1,
          city_name: 'Paris',
          country: 'France',
          created_at: '2025-01-05T10:00:00Z'
        },
        {
          ...mockGuess,
          is_active: true,
          id: 2,
          created_at: '2025-01-05T11:00:00Z'
        }
      ]
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockGuesses })
      } as Response)

      render(<DestinationGuess {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Current Guess')).toBeInTheDocument()
      })
    })

    it('hides previous guesses section when no guesses exist', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      } as Response)

      render(<DestinationGuess {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalled()
      })

      expect(screen.queryByText(/Your Previous Guesses/)).not.toBeInTheDocument()
    })

    it('displays old free-text guesses for backward compatibility', async () => {
      const oldGuess = {
        id: 1,
        participant_id: 'emilie',
        guess: 'Some old city name',
        city_name: null,
        country: null,
        latitude: null,
        longitude: null,
        is_active: false,
        distance_km: null,
        is_correct_destination: false,
        created_at: '2025-01-05T10:00:00Z'
      }
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [oldGuess] })
      } as Response)

      render(<DestinationGuess {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('"Some old city name"')).toBeInTheDocument()
      })
    })
  })
})
