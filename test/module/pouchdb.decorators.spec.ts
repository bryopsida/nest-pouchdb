import { ServerScope } from 'nano'
import { plainToClass } from 'class-transformer'
import { Injectable, INestApplication, INestMicroservice } from '@nestjs/common'
import { Test } from '@nestjs/testing'

import { CouchDbConnectionFactory, Repository } from '../../src/couchdb'
import {
  CouchDbModule,
  InjectConnection,
  InjectRepository,
} from '../../src/module'
import { getConfig, Cat } from '../__stubs__'
import { deleteDb } from '../helpers'
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { GenericContainer, StartedTestContainer } from 'testcontainers'

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
  describe('#CouchDb inject decorators', () => {
    const dbName = 'cats'
    let connection: ServerScope
    let app: INestMicroservice
    let service: TestService
    let insertedId: string

    @Injectable()
    class TestService {
      constructor(
        @InjectRepository(Cat) public repo: Repository<Cat>,
        @InjectConnection() public connection: ServerScope
      ) {}

      async test() {
        return this.repo.info()
      }
    }

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
        providers: [TestService],
      }).compile()

      app = fixture.createNestMicroservice({})
      await app.init()
      service = app.get<TestService>(TestService)
    })

    afterAll(async () => {
      await deleteDb(connection, dbName)
      app.close()
    })

    describe('#InjectRepository', () => {
      it('should inject repository', () => {
        expect(service.repo).toBeDefined()
      })
      it('should return database info', async () => {
        const info = await service.test()
        expect(info).toBeDefined()
        expect(info.db_name).toBe(dbName)
      })
    })

    describe('#InjectConnection', () => {
      it('should inject connection', () => {
        expect(service.connection).toBeDefined()
        expect(service.connection).toHaveProperty('config')
        expect(service.connection).toHaveProperty('db')
      })
    })

    describe('#repository', () => {
      it('should save document', async () => {
        const cat = plainToClass<Cat, Cat>(Cat, {
          name: 'cat',
          action: 'meow',
          isActive: true,
        })
        const inserted = await service.repo.insert(cat)
        expect(inserted.ok).toBe(true)
        expect(typeof inserted.id).toBe('string')
        expect(typeof inserted.rev).toBe('string')
        insertedId = inserted.id
      })

      it('should get document', async () => {
        const cat = await service.repo.get(insertedId)
        expect(cat._id).toBe(insertedId)

        const list = await service.repo.list()
        console.log(list)
      })
    })
  })
})
