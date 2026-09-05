import { NextResponse } from 'next/server';
import {
  getSibylStatus,
  listEntities,
  readJournalEvents,
  recallRelevantHistory,
} from '@/lib/memory/sibyl';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || undefined;
    const query = searchParams.get('query');

    const status = await getSibylStatus();
    const entities = await listEntities(category);
    const journalEvents = await readJournalEvents(50);

    let searchHits: any[] = [];
    if (query) {
      const searchRes = await recallRelevantHistory(query);
      searchHits = searchRes.hits;
    }

    return NextResponse.json({
      success: true,
      status,
      entities,
      journalEvents,
      searchHits,
      counts: {
        totalEntities: entities.length,
        journalEvents: journalEvents.length,
      },
    });
  } catch (error: any) {
    console.error('Error querying Sibyl memory:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to query Sibyl memory' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query parameter is required for search' },
        { status: 400 }
      );
    }

    const searchRes = await recallRelevantHistory(query);

    return NextResponse.json({
      success: true,
      query,
      verdict: searchRes.verdict,
      hits: searchRes.hits,
    });
  } catch (error: any) {
    console.error('Error searching Sibyl memory:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to search Sibyl memory' },
      { status: 500 }
    );
  }
}
