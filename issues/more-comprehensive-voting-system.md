# More Comprehensive Voting System

## Context Summary

The current voting system has a hardcoded single question ("Most Drunk Last Night") with localStorage persistence. This issue addresses the evolution to a flexible, multi-session voting system where hosts can dynamically create voting questions and participants can respond across multiple voting sessions (Day 2 and Day 3).

## Core Components

### 1. Host Vote Management
- Hosts need ability to create and configure voting questions
- Replace hardcoded "Most Drunk Last Night" with dynamic questions
- Support for multiple voting sessions (Day 2, Day 3, future scalability)

### 2. Backend Data Persistence
- Move from localStorage to proper database storage
- Support concurrent voting across multiple participants
- Enable vote tracking and management across sessions

## Host Input Requirements

### Required Information from Hosts:
1. **Voting Session** - Session identifier (1, 2, or future sessions)
2. **Question Title** - The voting question text (e.g., "Who was the most entertaining?")

### Host Interface Architecture Decision

**Future Host Interface Restructure**: This issue acknowledges that the host interface will eventually be restructured into three distinct screens:
1. **Host Overview** - View all components and general status
2. **Participant View** - See current state as participants see it
3. **Host Controls** - Administrative functions (vote creation, packing list editing, etc.)

**Current Issue Scope**: This issue will implement the vote creation functionality within the existing HostOverview component structure, as the complete host interface restructure should be addressed in a separate, dedicated issue focused on UX/UI architecture (see [host-interface-restructure.md](./host-interface-restructure.md)).

### Host Interface Location:
- **New Component**: `VoteConfiguration` component
- **Location**: Inside existing Host Control section
- **Access**: Available only to hosts through HostOverview component
- **Timing**: Hosts can configure votes before participants access them

## Database Architecture

### Two-Table Approach Recommended:

#### Table 1: Vote Configurations (`vote_sessions`)
**Purpose**: Store host-configured voting questions and session management

**Columns**:
- `id` (Primary Key, UUID) - Unique identifier for each vote configuration
- `session_number` (Integer, NOT NULL) - Voting session (1=Day 2, 2=Day 3, etc.)
- `title` (Text, NOT NULL) - The voting question/title
- `created_by` (Text, NOT NULL) - Host who created the vote
- `created_at` (Timestamp, NOT NULL) - When vote was configured
- `is_active` (Boolean, DEFAULT true) - Whether voting is currently open
- `session_token` (Text, NOT NULL) - Links to current trip/session

#### Table 2: Participant Votes (`participant_votes`)
**Purpose**: Store individual participant responses to vote configurations

**Columns**:
- `id` (Primary Key, UUID) - Unique identifier for each vote cast
- `vote_session_id` (Foreign Key to vote_sessions.id, NOT NULL) - Links to the vote configuration
- `voter_name` (Text, NOT NULL) - Participant who cast the vote
- `voted_for` (Text, NOT NULL) - Participant who received the vote
- `session_token` (Text, NOT NULL) - Links to current trip/session
- `voted_at` (Timestamp, NOT NULL) - When the vote was cast

### Table Relationships:
- One vote_session can have many participant_votes (1:many)
- Each participant can vote once per vote_session_id
- Foreign key constraint ensures data integrity

## Component Architecture

### New Components Required:

1. **VoteConfiguration Component**
   - Location: `components/VoteConfiguration.tsx`
   - Purpose: Host interface for creating voting questions
   - Features: Form for session selection, question input, preview

2. **Enhanced VotingInterface Component**
   - Modify existing: `components/VotingInterface.tsx`
   - Purpose: Dynamic question display based on session
   - Features: Fetch questions from API, display current session votes

3. **VoteSession Management**
   - Location: `utils/voteSessionManager.ts`
   - Purpose: Handle session logic and question retrieval
   - Features: Session validation, question loading, vote submission

## API Endpoints Required

1. **POST** `/api/vote-sessions` - Create new vote configuration
2. **GET** `/api/vote-sessions?session={number}` - Get votes for session
3. **POST** `/api/participant-votes` - Submit participant vote
4. **GET** `/api/participant-votes?session_id={id}` - Get votes for question

## Database Setup Requirements

**Manual Database Creation**: Tables must be created manually in the Neon project database. The following SQL queries are provided as examples and should be reviewed by the implementing agent before execution.

### Example SQL Table Creation Queries

**⚠️ Important**: These are example queries that should be reviewed and potentially modified based on the actual database schema and requirements.

```sql
-- Create vote_sessions table
CREATE TABLE vote_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    session_token TEXT NOT NULL
);

-- Create participant_votes table
CREATE TABLE participant_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vote_session_id UUID NOT NULL REFERENCES vote_sessions(id) ON DELETE CASCADE,
    voter_name TEXT NOT NULL,
    voted_for TEXT NOT NULL,
    session_token TEXT NOT NULL,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_vote_sessions_session_token ON vote_sessions(session_token);
CREATE INDEX idx_vote_sessions_session_number ON vote_sessions(session_number);
CREATE INDEX idx_participant_votes_session_token ON participant_votes(session_token);
CREATE INDEX idx_participant_votes_vote_session_id ON participant_votes(vote_session_id);

-- Create unique constraint to prevent duplicate votes
CREATE UNIQUE INDEX idx_unique_participant_vote 
ON participant_votes(vote_session_id, voter_name);
```

## Definition of Done

- [ ] Two database tables created with proper relationships
- [ ] VoteConfiguration component integrated into HostOverview
- [ ] Enhanced VotingInterface supports dynamic questions
- [ ] API endpoints functional with proper error handling
- [ ] Host can create questions for Day 2 and Day 3 sessions
- [ ] Participants can vote on host-created questions
- [ ] Existing test suite updated for new functionality
- [ ] Database migration scripts created
- [ ] No breaking changes to existing voting functionality

## Technical Considerations

### Scalability
- Session numbers support future expansion beyond Day 2/3
- UUID primary keys ensure uniqueness across distributed systems
- Foreign key relationships maintain data integrity

### Security
- Session tokens prevent cross-session vote manipulation
- Participant name validation against known participants
- Host authorization for vote creation

### Performance
- Indexed columns for efficient querying (session_token, vote_session_id)
- Separate tables prevent large result sets
- Caching strategy for active vote sessions

## Additional Considerations

### State Management
- Vote sessions should integrate with existing state management system
- Consider how vote availability relates to current day/state progression
- Ensure vote sessions are properly scoped to current trip session

### Error Handling
- Handle cases where participants try to vote before hosts configure questions
- Validate vote submissions against active sessions only
- Graceful degradation if database is temporarily unavailable

### Testing Strategy
- **Component Tests**: VoteConfiguration form validation and submission
- **API Tests**: Vote creation and retrieval endpoints with error scenarios
- **Integration Tests**: End-to-end voting workflow from creation to participant submission
- **Database Tests**: Table relationships and constraint validation