import { environment } from './../../environments/environment.dev';
import { RefreshableAuthProvider, RefreshConfig, StaticAuthProvider } from 'twitch/lib';
import { ChatClient } from 'twitch-chat-client';
import { promises as fs } from 'fs';


let chatClient: ChatClient;

export class TwitchService {

  constructor() {
    refreshAuth().then(auth => {
      chatClient = new ChatClient(auth, { channels: ['hulkermon'], requestMembershipEvents: true });
    });
  }
  /**
   * setup
   * Connect the bot to the Twitch API and listen for events.
   */
  public setup() {
    return new Promise(async (resolve, reject) => {
      await chatClient.connect().catch(reject);
      console.log(`Logged into Twitch as ${environment.twitch.username}`);

      this.setupEventHandlers(chatClient);

      resolve();
    })
  }

  /**
   * setupEventHandlers
   * sets up all the event handlers for a Twitch Chat Client.
   * @param client The chat client for which to setup the event handlers.
   */
  public setupEventHandlers(client: ChatClient) {
    chatClient.onMessage((channel, user, message) => {
      if (message === 'hi') {
        chatClient.say(channel, `hello ${user}`);
      }
    });
  }
}

function refreshAuth(): Promise<any> {
  return new Promise(async (resolve, reject) => {
    fs.readFile('./environments/token.json').then(rawTokenData => {
      let twitchEnv = environment.twitch;
      let clientId = twitchEnv.clientId;
      let clientSecret = twitchEnv.clientSecret;

      let tokenData = JSON.parse(rawTokenData.toString());
      let accessToken = tokenData.accessToken;
      let refreshToken = tokenData.refreshToken;
      let expiryTimestamp = tokenData.expiryTimestamp;

      let auth = new RefreshableAuthProvider(new StaticAuthProvider(clientId, accessToken),
        {
          clientSecret,
          refreshToken,
          expiry: expiryTimestamp === null ? null : new Date(expiryTimestamp),
          onRefresh: async ({ accessToken, refreshToken, expiryDate }) => {
            let newTokenData = {
              accessToken: accessToken,
              refreshToken: refreshToken,
              tokenExpiryTimestamp: expiryDate === null ? 0 : expiryDate.getTime()
            };
            await fs.writeFile('./environments/token.json', JSON.stringify(newTokenData, null, 4), 'utf-8');
          }
        }
      );
      resolve(auth);
    }).catch(reject);
  });
}
