import { ServerScope } from 'nano'
import { Test } from '@nestjs/testing'
import { INestApplication, INestMicroservice } from '@nestjs/common'

import { CouchDbConnectionFactory } from '../../src/couchdb'
import {
  CouchDbModule,
  getConnectionToken,
  getRepositoryToken,
} from '../../src/module'
import { getConfig, Cat } from '../__stubs__'
import { deleteDb } from '../helpers'
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { StartedTestContainer, GenericContainer } from 'testcontainers'

describe('#module', () => {
  let container: StartedTestContainer

  beforeAll(async () => {
    container = await new GenericContainer('couchdb')
      .withEnvironment({
        COUCHDB_PASSWORD:
          '-pbkdf2-847043acc65626c8eb98da6d78682fbc493a1787,f7b1a3e4b624f4f0bbfe87e96841eda0,10',
        COUCHDB_SECRET: '0123456789abcdef0123456789abcdef',
        COUCHDB_USER: 'couchdb',
        NODENAME: 'couchdb-0.docker.com',
      })
      .withNetworkAliases('couchdb-0.docker.com')
      .withExposedPorts(5984)
      .start()
  })
  afterAll(async () => {
    await container.stop()
  })
  describe('#CouchDbModule', () => {
    const dbName = 'cats'
    let connection: ServerScope
    let app: INestMicroservice

    beforeAll(async () => {
      const config = getConfig(
        `http://localhost:${container.getFirstMappedPort()}`
      )
      connection = await CouchDbConnectionFactory.create(config)
      await deleteDb(connection, dbName)

      const fixture = await Test.createTestingModule({
        imports: [
          CouchDbModule.forRoot({ ...config, sync: true }),
          CouchDbModule.forFeature([Cat]),
        ],
      }).compile()

      app = fixture.createNestMicroservice({})
      await app.init()
    })

    afterAll(async () => {
      await deleteDb(connection, dbName)
      app.close()
    })

    it('should get connection by token', () => {
      const connection = app.get(getConnectionToken())
      expect(connection).toBeDefined()
      expect(connection).toHaveProperty('config')
      expect(connection).toHaveProperty('db')
    })

    it('should get repository by token', () => {
      const repo = app.get(getRepositoryToken(Cat))
      expect(repo).toBeDefined()
      expect(repo).toHaveProperty('entity')
    })
  })
})
