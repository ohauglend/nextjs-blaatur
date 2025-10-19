import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VotingInterface from '../components/VotingInterface'

// Mock localStorage for testing
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
})

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, width, height, className }: any) {
    return <img src={src} alt={alt} width={width} height={height} className={className} />
  }
})

describe('VotingInterface Component', () => {
  const defaultProps = {
    participantId: 'emilie'
  }

  beforeEach(() => {
    mockLocalStorage.getItem.mockClear()
    mockLocalStorage.setItem.mockClear()
  })

  describe('Initial Render', () => {
    it('renders the voting interface with hardcoded question', () => {
      render(<VotingInterface {...defaultProps} />)
      
      expect(screen.getByText('Most Drunk Last Night')).toBeInTheDocument()
      expect(screen.getByText('Who had the most fun with drinks yesterday?')).toBeInTheDocument()
      expect(screen.getByText('Tap on a participant to select them:')).toBeInTheDocument()
    })

    it('displays all participants including the voter', () => {
      render(<VotingInterface {...defaultProps} />)
      
      // Should show ALL participants including the voter themselves via alt text
      expect(screen.getByAltText("Oskar's photo")).toBeInTheDocument()
      expect(screen.getByAltText("Odd's photo")).toBeInTheDocument()
      expect(screen.getByAltText("Aasmund's photo")).toBeInTheDocument()
      expect(screen.getByAltText("Mathias's photo")).toBeInTheDocument()
      expect(screen.getByAltText("Brage's photo")).toBeInTheDocument()
      expect(screen.getByAltText("Sara's photo")).toBeInTheDocument()
      expect(screen.getByAltText("Johanna's photo")).toBeInTheDocument()
      expect(screen.getByAltText("Emilie's photo")).toBeInTheDocument() // Now includes self
    })

    it('displays participant photos in single column layout', () => {
      render(<VotingInterface {...defaultProps} />)
      
      // Check that participant photos are loaded
      expect(screen.getByAltText("Oskar's photo")).toBeInTheDocument()
      expect(screen.getByAltText("Emilie's photo")).toBeInTheDocument()
      expect(screen.getByAltText("Mathias's photo")).toBeInTheDocument()
    })

    it('does not show host indicators', () => {
      render(<VotingInterface {...defaultProps} />)
      
      // Should NOT show "Host" indicators
      expect(screen.queryByText('Host')).not.toBeInTheDocument()
    })
  })

  describe('Voting Process', () => {
    it('allows selecting a participant to vote for', async () => {
      const user = userEvent.setup()
      render(<VotingInterface {...defaultProps} />)
      
      // Select participant using photo
      const participantButton = screen.getByAltText("Mathias's photo").closest('button')
      await user.click(participantButton!)
      
      // Submit button should appear
      expect(screen.getByText('Submit Vote for Mathias 🗳️')).toBeInTheDocument()
    })

    it('allows voting for self', async () => {
      const user = userEvent.setup()
      render(<VotingInterface {...defaultProps} />)
      
      // Select self (emilie) using photo
      const selfButton = screen.getByAltText("Emilie's photo").closest('button')
      await user.click(selfButton!)
      
      // Submit button should appear for self
      expect(screen.getByText('Submit Vote for Emilie 🗳️')).toBeInTheDocument()
    })

    it('submits vote and shows completion message', async () => {
      const user = userEvent.setup()
      render(<VotingInterface {...defaultProps} />)
      
      // Select participant using photo
      const participantButton = screen.getByAltText("Oskar's photo").closest('button')
      await user.click(participantButton!)
      
      // Get submit button (should be only one now)
      const submitButton = screen.getByText('Submit Vote for Oskar 🗳️')
      await user.click(submitButton)
      
      // Should show loading state
      expect(screen.getByText('Submitting Vote...')).toBeInTheDocument()
      
      // Wait for completion message
      await waitFor(() => {
        expect(screen.getByText('You voted for:')).toBeInTheDocument()
      })
      
      // Should save to localStorage
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'vote_most_drunk_emilie',
        'oskar'
      )
    })

    it('shows green border after vote is submitted', async () => {
      const user = userEvent.setup()
      render(<VotingInterface {...defaultProps} />)
      
      // Select and submit vote
      const participantButton = screen.getByAltText("Sara's photo").closest('button')
      await user.click(participantButton!)
      
      // Get submit button (should be only one now)
      const submitButton = screen.getByText('Submit Vote for Sara 🗳️')
      await user.click(submitButton)
      
      // Wait for vote to be processed and green styling to appear
      await waitFor(() => {
        const saraButton = screen.getByAltText("Sara's photo").closest('button')
        expect(saraButton).toHaveClass('border-green-500', 'bg-green-50')
      }, { timeout: 3000 })
    })
  })

  describe('After Voting', () => {
    it('disables voting after submission', async () => {
      const user = userEvent.setup()
      // Clear any existing votes for this test
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<VotingInterface {...defaultProps} />)
      
      // Submit a vote using alt text to avoid duplicate text issue
      const participantButton = screen.getByAltText("Mathias's photo").closest('button')
      await user.click(participantButton!)
      
      const submitButton = screen.getByText('Submit Vote for Mathias 🗳️')
      await user.click(submitButton)
      
      // Wait for completion message to appear
      await waitFor(() => {
        expect(screen.getByText('You voted for:')).toBeInTheDocument()
      }, { timeout: 3000 })
      
      // All participant buttons should be disabled after voting using alt text selectors
      const mathiasButton = screen.getByAltText("Mathias's photo").closest('button')
      expect(mathiasButton).toBeDisabled()
      
      const brageButton = screen.getByAltText("Brage's photo").closest('button')
      expect(brageButton).toBeDisabled()
    })

    it('shows submitted vote confirmation', async () => {
      // Mock existing vote
      mockLocalStorage.getItem.mockReturnValue('johanna')
      
      render(<VotingInterface {...defaultProps} />)
      
      expect(screen.getByText('You voted for:')).toBeInTheDocument()
      
      // Check that Johanna appears in the confirmation section
      const confirmationSection = screen.getByText('You voted for:').closest('div')
      expect(confirmationSection).toHaveTextContent('Johanna')
    })
  })

  describe('Visual Feedback', () => {
    it('shows blue selection indicator when participant is selected', async () => {
      const user = userEvent.setup()
      // Clear any existing votes for this test
      mockLocalStorage.getItem.mockReturnValue(null)
      
      render(<VotingInterface {...defaultProps} />)
      
      const participantButton = screen.getByAltText("Odd's photo").closest('button')
      await user.click(participantButton!)
      
      // Should have blue selection styling
      expect(participantButton).toHaveClass('border-blue-500', 'bg-blue-50', 'scale-102')
    })
  })

  describe('Loading Previous Vote', () => {
    it('loads existing vote on component mount', () => {
      mockLocalStorage.getItem.mockReturnValue('sara')
      
      render(<VotingInterface {...defaultProps} />)
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('vote_most_drunk_emilie')
    })

    it('shows completed state when previous vote exists', () => {
      mockLocalStorage.getItem.mockReturnValue('mathias')
      
      render(<VotingInterface {...defaultProps} />)
      
      // Should show completion state
      expect(screen.getByText('You voted for:')).toBeInTheDocument()
      expect(screen.queryByText('Tap on a participant')).not.toBeInTheDocument()
    })
  })
})