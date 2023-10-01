export interface ISearchResult<T> {
  results: T[]
  offset: number
  totalCount: number
}
