import { LocalStream } from 'extension-streams'
import { Wallet } from '@zilliqa-js/account'
import {
  InternalMessage,
  MTypesContent,
  MTypesAuth,
  MTypesInternal
} from '../content/messages/messageTypes'
import { Loger } from '../lib/logger'
import { Auth } from './auth/main'
import { BlockChainControll } from './zilliqa'
import fields from '../config/fields'
import zilConfig from '../config/zil'

const log = new Loger('Background');

export class Background  {

  constructor() {
    this.auth = new Auth();
    this._watchInternalMessaging();
  }

  _watchInternalMessaging() {
    LocalStream.watch((request, response) => {
      const message = InternalMessage.fromJson(request);
      this._dispenseMessage(response, message);
    });
  }

  async _dispenseMessage (sendResponse, message) {

    switch (message.type) {

      case MTypesInternal.SET_NET:
        this.updateNode(message.payload);
        break;
      case MTypesInternal.GET_NETWORK:
        this.getProvider(sendResponse);
        break;

      case MTypesInternal.GET_ADDRESS:
        this.getAddress(sendResponse);
        break;

      case MTypesInternal.SET_SEED_AND_PWD:
        this.createNewWallet(sendResponse, message.payload);
        break;

      case MTypesInternal.GET_DECRYPT_SEED:
        sendResponse({ resolve: this.auth.mnemonic.getRandomSeed });
        break;

      case MTypesInternal.INIT:
        this.initPopup(sendResponse);
        break;

      case MTypesAuth.SET_PASSWORD:
        this.walletUnlock(sendResponse, message.payload);
        break;
    }

  }

  async initPopup(sendResponse) {
    let isLcok;
    let selectednet = Object.keys(zilConfig)[0];
    let config = zilConfig;
    const allData = await this.auth.getAllData();
    const countKeys = Object.keys(fields).length - 1;
    const countKeysData = Object.keys(allData);
    const test = !allData.hasOwnProperty(fields.VAULT) || countKeysData < countKeys;

    if (!allData || test) {
      await this.updateConfig(config, selectednet);

      sendResponse({
        reject: {
          isEnable: this.auth.isEnable,
          isReady: this.auth.isReady,
          config, selectednet
        }
      });
    } else {
      this.auth.isReady = true;

      try {
        this.auth.guard.encryptedSeed = allData.vault;
        isLcok = this.auth.guard.decryptSeed;

        if (!isLcok || isLcok.length < 11) {
          this.auth.isEnable = false;
        } else {
          this.auth.isEnable = true;
        }
      } catch(err) {
        this.auth.isEnable = false;
      }

      sendResponse({
        resolve: {
          data: allData,
          isEnable: this.auth.isEnable,
          isReady: this.auth.isReady
        }
      });
    }
  }

  async createNewWallet(sendResponse, payload) {
    let balance;
    const { selectednet } = await this.auth.getNet();
    const { config } = await this.auth.getConfig();
    const { PROVIDER } = config[selectednet];
    const blockChain = new BlockChainControll(PROVIDER);
    const { seed, password } = payload;
    const wallet = new Wallet();
    const index = 0;

    this.auth = new Auth(password);
    wallet.addByMnemonic(seed, index);
    balance = await blockChain.getBalance(wallet.defaultAccount.address);

    const account = {
      selectedAddress: index,
      identities: [{
        balance: balance.result,
        address: wallet.defaultAccount.address,
        publicKey: wallet.defaultAccount.publicKey,
        index: index
      }]
    };

    sendResponse(account);

    await this.auth.setWallet(account);
    await this.auth.createVault(seed);

    this.auth.isEnable = true;
    this.auth.isReady = true;
  }

  async updateConfig(config, net) {
    this.auth.setConfig(config);
    this.auth.setNet(net);
  }

  async updateNode(payload) {
    if (!payload || Object.keys(payload).length < 1) {
      return null;
    }   
    const { config } = await this.auth.getConfig();
    const { selectedNet } = payload;
    const { PROVIDER } = config[selectedNet];
    this.auth.setNet(selectedNet);
    InternalMessage.widthPayload(
      MTypesContent.SET_NODE,
      { PROVIDER }
    ).send();
  }

  async getAddress(sendResponse) {
    const { wallet } = await this.auth.getWallet();
    if (!wallet || !wallet.identities || isNaN(wallet.selectedAddress)) {
      sendResponse(null);
    } else {
      sendResponse(
        wallet.identities[
          wallet.selectedAddress
        ]['address']
      );
    }
  }

  async getProvider(sendResponse) {
    const { config } = await this.auth.getConfig();
    const { selectednet } = await this.auth.getNet();
    const { PROVIDER } = config[selectednet];
    sendResponse(PROVIDER);
    return PROVIDER;
  }

  async walletUnlock(sendResponse, payload) {
    const { password } = payload;
    const status = await this.auth.verificationPassword(password);

    this.auth.isEnable = status;

    if (status) {
      this.auth = new Auth(password);
    }

    sendResponse(status);
  } 

}

export default new Background();
