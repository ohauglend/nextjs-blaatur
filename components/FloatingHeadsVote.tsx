'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import useSWR from 'swr';
import { PARTICIPANTS } from '@/data/participants';

// Legacy voting questions (inlined — votingQuestions.ts removed; this component will be rewritten in Issue #3)
interface VotingQuestion {
  key: string;
  title: string;
  emoji: string;
  leftLabel: string;
  rightLabel: string;
}
const VOTING_QUESTIONS: VotingQuestion[] = [
  { key: 'most_drunk',           title: 'Most Drunk Last Night',              emoji: '🍻', leftLabel: 'Sober',    rightLabel: 'Wasted' },
  { key: 'closest_destination',  title: 'Closest on the destination guess',   emoji: '🗺️', leftLabel: 'Far off',  rightLabel: 'Nailed it' },
];

interface FloatingHeadsVoteProps {
  participantId: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const TOTAL_VOTERS = Object.keys(PARTICIPANTS).length;

const POINTS_PER_VOTE: Record<string, number> = {
  most_drunk: 5,
  closest_destination: 10,
};

interface ScoreRow {
  target_id: string;
  score: number;
}
interface ResultRow {
  target_id: string;
  avg_score: number;
  voter_count: number;
}

interface QuestionResults {
  question: VotingQuestion;
  results: ResultRow[];
  voterCount: number;
}

export default function FloatingHeadsVote({ participantId }: FloatingHeadsVoteProps) {
  const q0 = VOTING_QUESTIONS[0];
  const q1 = VOTING_QUESTIONS[1];

  const r0 = useSWR<{ results: ResultRow[] }>(
    `/api/voting-scores/results?question_key=${q0.key}`,
    fetcher,
    { refreshInterval: 5_000 },
  );
  const r1 = useSWR<{ results: ResultRow[] }>(
    `/api/voting-scores/results?question_key=${q1.key}`,
    fetcher,
    { refreshInterval: 5_000 },
  );

  const perQuestion: QuestionResults[] = [
    {
      question: q0,
      results: r0.data?.results ?? [],
      voterCount: (r0.data?.results ?? []).reduce((m, r) => Math.max(m, r.voter_count), 0),
    },
    {
      question: q1,
      results: r1.data?.results ?? [],
      voterCount: (r1.data?.results ?? []).reduce((m, r) => Math.max(m, r.voter_count), 0),
    },
  ];

  const allVoted = perQuestion.every((p) => p.voterCount >= TOTAL_VOTERS);
  if (allVoted) return <Leaderboard perQuestion={perQuestion} />;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-4 text-center text-sm text-gray-600">
        Once everyone has voted on both questions, the leaderboard reveals.
        <div className="mt-2 flex justify-center gap-4">
          {perQuestion.map((p) => (
            <span key={p.question.key} className="font-mono">
              {p.question.emoji} {p.voterCount}/{TOTAL_VOTERS}
            </span>
          ))}
        </div>
      </div>
      {VOTING_QUESTIONS.map((q) => (
        <QuestionCard key={q.key} question={q} voterId={participantId} />
      ))}
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Voting card (single-pick)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function QuestionCard({ question, voterId }: { question: VotingQuestion; voterId: string }) {
  const allParticipants = useMemo(() => Object.values(PARTICIPANTS), []);
  const myUrl = `/api/voting-scores?voter_id=${voterId}&question_key=${question.key}`;
  const { data: myData, mutate: mutateMy } = useSWR<{ scores: ScoreRow[] }>(myUrl, fetcher);

  const [selected, setSelected] = useState<string | null>(null);
  const [submittedFor, setSubmittedFor] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!myData) return;
    const winner = myData.scores.find((s) => s.score >= 50)?.target_id ?? null;
    if (winner) {
      setSubmittedFor(winner);
      setSelected(winner);
    }
  }, [myData]);

  const handleSubmit = useCallback(async () => {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    try {
      const scores = allParticipants.map((p) => ({
        target_id: p.id,
        score: p.id === selected ? 100 : 0,
      }));
      const res = await fetch('/api/voting-scores', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voter_id: voterId, question_key: question.key, scores }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Failed to save vote');
        return;
      }
      setSubmittedFor(selected);
      mutateMy();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [allParticipants, selected, voterId, question.key, mutateMy]);

  const hasVoted = submittedFor !== null;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-1 flex items-center">
        <span className="mr-2 text-3xl">{question.emoji}</span>
        {question.title}
      </h2>
      <p className="text-gray-500 text-sm mb-4">
        {hasVoted ? 'You can change your vote at any time.' : 'Tap one head to vote.'}
      </p>

      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {allParticipants.map((p) => {
          const isSelected = selected === p.id;
          const isSubmitted = submittedFor === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p.id)}
              className={`flex flex-col items-center gap-2 p-2 rounded-2xl border-2 transition-all
                ${isSubmitted ? 'border-green-500 bg-green-50' :
                  isSelected ? 'border-blue-500 bg-blue-50 scale-105' :
                  'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <ParticipantHead id={p.id} name={p.name} size={64} />
              <span className="text-xs font-medium text-gray-700 truncate w-full text-center">
                {p.name}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        <button
          onClick={handleSubmit}
          disabled={submitting || !selected || selected === submittedFor}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
        >
          {submitting
            ? 'Savingâ€¦'
            : !selected
              ? 'Pick someone'
              : selected === submittedFor
                ? 'âœ“ Vote saved'
                : hasVoted
                  ? `Change vote to ${PARTICIPANTS[selected]?.name}`
                  : `Submit vote for ${PARTICIPANTS[selected]?.name}`}
        </button>
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Leaderboard reveal
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface LeaderboardEntry {
  id: string;
  name: string;
  totalPoints: number;
  perQuestion: { key: string; emoji: string; votes: number; points: number }[];
}

function Leaderboard({ perQuestion }: { perQuestion: QuestionResults[] }) {
  const entries: LeaderboardEntry[] = useMemo(() => {
    const allIds = Object.keys(PARTICIPANTS);
    const map = new Map<string, LeaderboardEntry>();
    for (const id of allIds) {
      map.set(id, {
        id,
        name: PARTICIPANTS[id]?.name ?? id,
        totalPoints: 0,
        perQuestion: [],
      });
    }
    for (const pq of perQuestion) {
      const pts = POINTS_PER_VOTE[pq.question.key] ?? 1;
      for (const r of pq.results) {
        const votes = Math.round((r.avg_score / 100) * r.voter_count);
        const entry = map.get(r.target_id);
        if (!entry) continue;
        const points = votes * pts;
        entry.totalPoints += points;
        entry.perQuestion.push({
          key: pq.question.key,
          emoji: pq.question.emoji,
          votes,
          points,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.totalPoints - a.totalPoints);
  }, [perQuestion]);

  const [revealedCount, setRevealedCount] = useState(0);
  useEffect(() => {
    if (revealedCount >= entries.length) return;
    const t = setTimeout(() => setRevealedCount((c) => c + 1), 350);
    return () => clearTimeout(t);
  }, [revealedCount, entries.length]);

  const maxPoints = Math.max(1, ...entries.map((e) => e.totalPoints));

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 flex items-center justify-center gap-2">
          ðŸ† Morning Leaderboard
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          {VOTING_QUESTIONS.map((q) => `${q.emoji} ${POINTS_PER_VOTE[q.key]}pt/vote`).join(' Â· ')}
        </p>
      </div>

      <div className="space-y-3">
        {entries.map((e, idx) => {
          const revealed = idx < revealedCount;
          const widthPct = (e.totalPoints / maxPoints) * 100;
          const rankColors = [
            'bg-yellow-100 border-yellow-400',
            'bg-gray-100 border-gray-400',
            'bg-amber-100 border-amber-500',
          ];
          const rankColor = rankColors[idx] ?? 'bg-white border-gray-200';
          const medal = ['ðŸ¥‡', 'ðŸ¥ˆ', 'ðŸ¥‰'][idx] ?? `#${idx + 1}`;
          return (
            <div
              key={e.id}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-500 ease-out ${rankColor}`}
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? 'translateY(0)' : 'translateY(-20px)',
              }}
            >
              <div className="text-2xl w-10 text-center font-bold">{medal}</div>
              <ParticipantHead id={e.id} name={e.name} size={56} />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline">
                  <span className="font-bold text-gray-800 truncate">{e.name}</span>
                  <span className="font-mono text-lg font-bold text-gray-900">{e.totalPoints} pts</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden mt-1">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${idx === 0 ? 'bg-yellow-400' : 'bg-blue-400'}`}
                    style={{ width: revealed ? `${widthPct}%` : '0%' }}
                  />
                </div>
                <div className="flex gap-3 text-xs text-gray-500 mt-1">
                  {e.perQuestion.map((q) => (
                    <span key={q.key}>
                      {q.emoji} {q.votes} vote{q.votes === 1 ? '' : 's'} Â· {q.points}pt
                    </span>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Random-photo head
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function ParticipantHead({ id, name, size }: { id: string; name: string; size: number }) {
  const { data } = useSWR<{ photos: string[] }>(`/api/participant-photos/${id}`, fetcher);

  const src = useMemo(() => {
    const photos = data?.photos ?? [];
    if (photos.length === 0) return `/data/participants/${id}/photo.svg`;
    const pick = photos[Math.floor(Math.random() * photos.length)];
    return `/api/participant-photos/${id}/${encodeURIComponent(pick)}`;
  }, [data, id]);

  return (
    <div
      className="rounded-full overflow-hidden bg-white border-2 border-white shadow-md ring-1 ring-gray-200 flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={name}
        width={size}
        height={size}
        className="object-cover w-full h-full"
        draggable={false}
        unoptimized
      />
    </div>
  );
}
