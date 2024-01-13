import 'reflect-metadata'
import { PouchDbConnectionFactory } from '../../src/pouchdb/pouchdb.connection.factory'
import { getConfig } from '../__stubs__'
import { beforeAll, afterAll, describe, it, expect } from '@jest/globals'
import { StartedTestContainer, GenericContainer } from 'testcontainers'

describe('#couchdb', () => {
  let container: StartedTestContainer
  let config: any
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
    config = getConfig(`http://localhost:${container.getFirstMappedPort()}`)
  })
  afterAll(async () => {
    await container.stop()
  })
  describe('#PouchDbConnectionFactory', () => {
    describe('#create', () => {
      it('should be defined', () => {
        expect(typeof PouchDbConnectionFactory.create).toBe('function')
      })
      it('should throw an error if no config', async () => {
        expect(
          PouchDbConnectionFactory.create(undefined as any)
        ).rejects.toThrow()
      })
      it('should throw an error if wrong config, 1', async () => {
        expect(PouchDbConnectionFactory.create({} as any)).rejects.toThrow()
      })
      it('should throw an error if wrong config, 2', async () => {
        expect(
          PouchDbConnectionFactory.create({ url: config.url } as any)
        ).rejects.toThrow()
      })
      it('should throw an error if wrong config, 3', async () => {
        expect(
          PouchDbConnectionFactory.create({
            url: config.url,
            username: config.username,
          } as any)
        ).rejects.toThrow()
      })
      it('should throw an error if wrong config, 4', async () => {
        expect(
          PouchDbConnectionFactory.create({
            url: config.url,
            username: config.username,
            userpass: 'invalid',
          } as any)
        ).rejects.toThrow()
      })
      it('should resolve a connection', async () => {
        const test = async () => {
          return await PouchDbConnectionFactory.create(config)
        }
        const connection = await test()
        expect(connection).toHaveProperty('config')
        expect(connection).toHaveProperty('db')
      })
    })
  })
})
