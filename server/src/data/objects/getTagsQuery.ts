import { antaresApi } from '../../services/antaresApi.js';

export async function getTagsQuery(): Promise<string[]> {
  return antaresApi.getAvailableTags();
}
