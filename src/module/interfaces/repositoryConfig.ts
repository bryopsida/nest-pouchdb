import * as PouchDB from 'pouchdb'

export interface PouchRepositoryConfig {
  name: string
  prefix: string
  options: PouchDB.Configuration.DatabaseConfiguration
}
