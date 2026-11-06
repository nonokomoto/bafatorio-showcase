import { getNotionClient } from '../shared/notionClient';

function normalizeUserId(id: string | undefined): string {
  if (!id) throw new Error('Missing userId');
  return id.split('::')[0];
}

function extractTitle(page: any): string {
  const props = page.properties || {};
  for (const prop of Object.values(props) as any[]) {
    if (prop.type === 'title') {
      return prop.title?.map((t: any) => t.plain_text).join('') || 'Untitled';
    }
  }
  return 'Untitled';
}

function extractIcon(page: any): string | null {
  if (page.icon?.type === 'emoji') return page.icon.emoji;
  return null;
}

export const handler = async (event: any) => {
  try {
    const userId = normalizeUserId(event.identity?.sub);
    const { query, cursor } = event.arguments;

    const result = await getNotionClient(userId);
    if (!result) {
      return { pages: [], hasMore: false, error: 'not_connected' };
    }

    const { client } = result;

    const response = await client.search({
      query: query || undefined,
      start_cursor: cursor || undefined,
      page_size: 20,
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
      filter: { value: 'page', property: 'object' },
    });

    const pages = response.results.map((item: any) => ({
      id: item.id,
      title: extractTitle(item),
      icon: extractIcon(item),
      lastEditedAt: item.last_edited_time || null,
      url: item.url || null,
      type: 'page',
    }));

    return {
      pages,
      nextCursor: response.next_cursor || null,
      hasMore: response.has_more,
    };
  } catch (error: any) {
    console.error('List pages error:', error.message);
    return { pages: [], hasMore: false, error: 'Failed to list pages' };
  }
};
