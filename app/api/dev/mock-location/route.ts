import { NextResponse } from 'next/server';

// Module-level singleton — resets on cold start, which is fine for dev use.
let mockLocationActive = false;

export async function GET() {
  return NextResponse.json({ active: mockLocationActive });
}

export async function POST() {
  mockLocationActive = !mockLocationActive;
  return NextResponse.json({ active: mockLocationActive });
}
