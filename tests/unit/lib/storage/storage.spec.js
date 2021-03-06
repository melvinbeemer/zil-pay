/*
 * Project: ZilPay-wallet
 * Author: Rinat(lich666dead)
 * -----
 * Modified By: the developer formerly known as Rinat(lich666dead) at <lich666black@gmail.com>
 * -----
 * Copyright (c) 2019 ZilPay
 */
import 'tests/extension-sinnon'

import extension from 'extensionizer'

import {
  BrowserStorage,
  BuildObject
} from 'lib/storage'

describe('lib:storage:BrowserStorage', () => {
  const storage = new BrowserStorage()
  const payload = { test: 1 }
  const key = 'testKey'

  it('should be BrowserStorage', () => {
    expect(storage).toBeTruthy()
  })

  it('should have subscribe static method in BrowserStorage', () => {
    expect(BrowserStorage.subscribe).toBeTruthy()
  })

  it('should return unsubscribe method when call subscribe', () => {
    expect(BrowserStorage.subscribe(() => null).unsubscribe).toBeTruthy()
  })

  it('should have EXT_ID prop', () => {
    expect(storage.EXT_ID).toEqual(extension.runtime.id)
  })

  it('try set value', async() => {
    const someValue = new BuildObject(key, payload)

    await storage.set(someValue)
  })

  it('try get previous value', async() => {
    const recievePaylod = await storage.get(key)

    expect(recievePaylod).toEqual(payload)
  })

  it('try get all values', async() => {
    const recievePaylod = await storage.getAll(key)

    expect(recievePaylod).toEqual({
      [key]: payload,
    })
  })

  it('try clear all values', async() => {
    await storage.clear()

    const recievePaylod = await storage.getAll()

    expect(recievePaylod).toEqual({})
  })

  it('try set more params value', async() => {
    const someValue = new BuildObject('test1', {
      key: '0',
    })
    const someValue1 = new BuildObject('test2', {
      key1: '1',
    })
    const someValue2 = new BuildObject('test3', {
      key2: '2',
    })

    await storage.set([
      someValue,
      someValue1,
      someValue2,
    ])
  })

  it('test on get all params wrote above', async() => {
    const recievePaylodWithMoreParams = await storage.getAll()

    expect(recievePaylodWithMoreParams).toEqual({
      test1: { key: '0' },
      test2: { key1: '1'},
      test3: { key2: '2' },
    })
  })

  it('try remove one item', async() => {
    await storage.rm('test2')

    const recievePaylod = await storage.getAll()
    expect(recievePaylod).toEqual({
      test1: { key: '0' },
      test3: { key2: '2' },
    })
  })

})
