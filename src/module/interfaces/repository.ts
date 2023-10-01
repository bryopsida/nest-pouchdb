import { ISearchResult } from './searchResult'

export interface PouchRepository<T extends {}> {
  upsert(id: string, thing: T): Promise<void>
  get(id: string): Promise<T>
  delete(id: string): Promise<void>
  search(
    take: number,
    skip: number,
    searchTerms: string[],
    sort: (
      | string
      | {
          [propName: string]: 'asc' | 'desc'
        }
    )[],
    fields: string[]
  ): Promise<ISearchResult<T>>
}
