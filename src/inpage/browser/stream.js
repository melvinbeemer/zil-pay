import { EncryptedStream } from 'extension-streams'
import uuidv4 from 'uuid/v4'
import { MTypesContent, DanglingResolver, Message } from '../../content/messages/messageTypes'
import utils from '../../lib/utils'
import { Loger } from '../../lib/logger'
import Config from '../../config/api'


const log = new Loger(Config.PAY_NAME);

export class Stream {

  constructor() {
    this.stream = new WeakMap();
    this.resolvers = [];
  }

  subscribe() {
    this.stream.listenWith(msg => {
      if (!msg || !msg.hasOwnProperty('type')) {
        return false;
      }      

      for (let i = 0; i < this.resolvers.length; i++) {
        if (this.resolvers[i].id === msg.resolver) {
          if (msg.type === 'error') {
            this.resolvers[i].reject(msg.payload);
          } else {
            this.resolvers[i].resolve(msg.payload);
          }
  
          this.resolvers = this.resolvers.slice(i, 1);
        }
      }
    });
  }

  _send(_type, _payload) {
    return new Promise((resolve, reject) => {
      const id = uuidv4();
      const message = new Message(_type, _payload, id);
      
      this.resolvers.push(new DanglingResolver(id, resolve, reject));
      this.stream.send(message, MTypesContent.CONTENT_INIT);
    });
  }

  onEncryptedStream() {
    /**
     * Injecting an encrypted stream into the web application
     */
    this.stream = new EncryptedStream(MTypesContent.INJECTED, uuidv4());
    this.stream.listenWith(msg => this._listener(msg));
    this.stream.sync(MTypesContent.CONTENT_INIT, this.stream.key);
  }

  _listener(msg) {
    if (!msg) {
      return null;
    }

    msg.domain = utils.strippedHost();

    const nonSyncMessage = Message.fromJson(msg);

    switch (msg.type) {
      case MTypesContent.PAY_OBJECT_INIT:
        this._initZilliqa(nonSyncMessage);
        break;
    }
  }

  _initZilliqa(message) {
    log.warn('INIT');
    let { payload } = message;
    window.ZilPay.enable = true;
    window.ZilPay.setDefaultAccount(payload.address);
    window.ZilPay.setProvider(payload.node);
  }

}