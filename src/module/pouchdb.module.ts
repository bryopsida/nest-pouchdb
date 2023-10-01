import { Module } from '@nestjs/common'
import { pouchDbProviders } from './pouchdb.providers'

@Module({
  providers: [...pouchDbProviders],
  exports: [...pouchDbProviders],
})
export class PouchDBModule {}
