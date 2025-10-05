import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DestinationGuess from '../components/DestinationGuess'

// Mock fetch
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('DestinationGuess Component', () => {
  const defaultProps = {
    participantId: 'emilie'
  }

  beforeEach(() => {
    mockFetch.mockClear()
  })

  describe('Initial Render', () => {
    it('renders the component with form elements', () => {
      render(<DestinationGuess {...defaultProps} />)
      
      expect(screen.getByText('Guess the Destination')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your destination guess...')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /submit my guess/i })).toBeInTheDocument()
    })

    it('loads previous guesses on mount', async () => {
      const mockGuesses = [
        { id: 1, participant_id: 'emilie', guess: 'Paris', created_at: '2025-01-05T10:00:00Z' }
      ]
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockGuesses })
      } as Response)

      render(<DestinationGuess {...defaultProps} />)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/destination-guesses/emilie')
      })
    })
  })

  describe('Form Validation', () => {
    it('disables submit button when input is empty', () => {
      render(<DestinationGuess {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /submit my guess/i })
      expect(submitButton).toBeDisabled()
    })

    it('enables submit button when input has text', async () => {
      const user = userEvent.setup()
      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Enter your destination guess...')
      const submitButton = screen.getByRole('button', { name: /submit my guess/i })
      
      await user.type(input, 'Tokyo')
      
      expect(submitButton).toBeEnabled()
    })

    it('prevents submission with only whitespace', async () => {
      const user = userEvent.setup()
      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Enter your destination guess...')
      
      await user.type(input, '   ')
      
      const submitButton = screen.getByRole('button', { name: /submit my guess/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('API Integration', () => {
    it('calls the correct endpoint with correct data on form submission', async () => {
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
            data: { id: 1, participant_id: 'emilie', guess: 'Tokyo', created_at: '2025-01-05T10:00:00Z' }
          })
        } as Response) // Submit
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] })
        } as Response) // Reload after submit

      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Enter your destination guess...')
      const submitButton = screen.getByRole('button', { name: /submit my guess/i })
      
      await user.type(input, 'Tokyo')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/destination-guesses', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            participantId: 'emilie',
            guess: 'Tokyo'
          })
        })
      })
    })

    it('displays loading state during submission', async () => {
      const user = userEvent.setup()
      
      // Mock initial load
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      } as Response)

      // Mock slow submission
      mockFetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, data: {} })
        } as Response), 100))
      )

      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Enter your destination guess...')
      
      await user.type(input, 'Tokyo')
      await user.click(screen.getByRole('button', { name: /submit my guess/i }))

      expect(screen.getByText('Submitting...')).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()
    })

    it('clears form and reloads data on successful submission', async () => {
      const user = userEvent.setup()
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: [] })
        } as Response) // Initial load
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, data: {} })
        } as Response) // Submit
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            data: [{ id: 1, participant_id: 'emilie', guess: 'Tokyo', created_at: '2025-01-05T10:00:00Z' }]
          })
        } as Response) // Reload

      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Enter your destination guess...')
      
      await user.type(input, 'Tokyo')
      await user.click(screen.getByRole('button', { name: /submit my guess/i }))

      await waitFor(() => {
        expect(input).toHaveValue('')
      })

      // Should reload previous guesses (may be called multiple times due to component lifecycle)
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/destination-guesses', expect.any(Object))
      })
      
      // Verify the reload call was made
      expect(mockFetch).toHaveBeenCalledWith('/api/destination-guesses/emilie')
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

      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Enter your destination guess...')
      
      await user.type(input, 'Tokyo')
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

      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Enter your destination guess...')
      
      await user.type(input, 'Tokyo')
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

      render(<DestinationGuess {...defaultProps} />)
      
      const input = screen.getByPlaceholderText('Enter your destination guess...')
      
      await user.type(input, 'Tokyo')
      await user.click(screen.getByRole('button', { name: /submit my guess/i }))

      await waitFor(() => {
        expect(screen.getByText('Database not yet configured. This feature will work after deployment to Vercel.')).toBeInTheDocument()
      })
    })
  })

  describe('Previous Guesses Display', () => {
    it('displays previous guesses when available', async () => {
      const mockGuesses = [
        { id: 1, participant_id: 'emilie', guess: 'Paris', created_at: '2025-01-05T10:00:00Z' },
        { id: 2, participant_id: 'emilie', guess: 'Tokyo', created_at: '2025-01-05T11:00:00Z' }
      ]
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockGuesses })
      } as Response)

      render(<DestinationGuess {...defaultProps} />)

      await waitFor(() => {
        expect(screen.getByText('Your Previous Guesses (2)')).toBeInTheDocument()
        expect(screen.getByText('"Paris"')).toBeInTheDocument()
        expect(screen.getByText('"Tokyo"')).toBeInTheDocument()
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
  })
})