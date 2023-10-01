import { Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common'
import * as PouchDBFind from 'pouchdb-find'
import PDB, * as PouchDB from 'pouchdb'

import { PouchRepository } from '../interfaces/repository'
import { ISearchResult } from '../interfaces/searchResult'
import { PouchRepositoryConfig } from '../interfaces/repositoryConfig'
import { mkdirSync } from 'node:fs'
PouchDB.plugin(PouchDBFind)

export abstract class BasePouchRepository<T extends {}>
  implements PouchRepository<T>, OnApplicationShutdown, OnModuleInit
{
  protected readonly _db: PouchDB.Database
  protected readonly _log: Logger
  protected readonly _config: PouchRepositoryConfig

  constructor(config: PouchRepositoryConfig, logger: Logger) {
    this._config = config
    this._log = logger
    this._db = this.createDatabase()
  }

  createDatabase(): PouchDB.Database<T> {
    mkdirSync(this._config.prefix, {
      recursive: true,
    })

    return new PDB(this._config.name, {
      prefix: this._config.prefix,
      ...this._config.options,
    })
  }

  async onModuleInit(): Promise<void> {
    await this.createIndices()
    await this.createDesignDocs()
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    try {
      await this._db.close()
    } catch (err) {
      this._log.error(err, 'Error occurred while cleaning up: %s', err)
    }
  }

  public async upsert(id: string, obj: T): Promise<void> {
    await this._db
      .put<T>({
        ...{
          _id: id,
        },
        ...obj,
      })
      .catch(async (err) => {
        if (err.status !== 409) {
          throw err
        }
        // will need to add conflict resolution functions
        const latest = await this._db.get<T>(id)
        return this._db.put<T & PouchDB.Core.IdMeta>(this.merge(latest, obj))
      })
  }

  async get(id: string): Promise<T> {
    try {
      return this.fromDoc(await this._db.get<T>(id))
    } catch (err) {
      return null as any
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const doc = await this._db.get(id)
      await this._db.remove(doc)
    } catch (err) {
      this._log.error(err, 'Error occured while deleting obj: %s', err)
    }
  }

  async search(
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
  ): Promise<ISearchResult<T>> {
    return this._db
      .find({
        selector: this.buildSelector(searchTerms),
        sort,
        fields,
        limit: take,
        skip,
      })
      .then((result) => {
        return {
          results: result.docs.map(this.fromDoc),
          offset: 0,
          totalCount: 0,
        }
      })
  }

  abstract buildSelector(terms: string[]): PouchDB.Find.Selector
  abstract fromDoc(doc: PouchDB.Core.ExistingDocument<unknown & {}>): T
  abstract merge(current: T, next: T): T & PouchDB.Core.IdMeta
  abstract createLogger(): Logger
  abstract createIndices(): Promise<void>
  abstract createDesignDocs(): Promise<void>
}
