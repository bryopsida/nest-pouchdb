import { Entity, CouchDbEntity } from '../../../src/pouchdb'

@Entity('cats')
export class Cat extends CouchDbEntity {
  name?: string
  action?: string
  isActive?: boolean
}
