import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }
  return neon(process.env.DATABASE_URL);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> },
) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const { id, participantId } = await params;

  try {
    const sql = getDb();

    // Check if any votes have been cast for this session
    const voteCheck = await sql`
      SELECT COUNT(*) as count FROM participant_votes WHERE vote_session_id = ${id}
    `;
    if (Number(voteCheck[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot remove participants from a session with existing votes' },
        { status: 409 },
      );
    }

    const rows = await sql`
      DELETE FROM vote_session_participants
      WHERE vote_session_id = ${id} AND participant_id = ${participantId}
      RETURNING id
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Participant not found in this session' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing participant from vote session:', error);
    return NextResponse.json({ error: 'Failed to remove participant' }, { status: 500 });
  }
}
