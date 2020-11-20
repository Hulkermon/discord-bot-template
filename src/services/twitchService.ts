import { environment } from './../../environments/environment.dev';
import { RefreshableAuthProvider, RefreshConfig, StaticAuthProvider } from 'twitch/lib';
import { ChatClient } from 'twitch-chat-client';

const twitchEnv = environment.twitch;
const clientId = twitchEnv.clientId;
const accessToken = twitchEnv.accessToken;

const clientSecret = twitchEnv.clientSecret;
const refreshToken = twitchEnv.refreshToken;
const tokenExpiryTimestamp = twitchEnv.tokenExpiryTimestamp;

const auth = new RefreshableAuthProvider(new StaticAuthProvider(clientId, accessToken),
  {
    clientSecret,
    refreshToken,
    expiry: tokenExpiryTimestamp === null ? null : new Date(tokenExpiryTimestamp),
    onRefresh: ({ accessToken, refreshToken, expiryDate }) => {
      environment.twitch.accessToken = accessToken;
      environment.twitch.refreshToken = refreshToken;
      environment.twitch.tokenExpiryTimestamp = expiryDate === null ? 0 : expiryDate.getTime();
    }
  }
);

const chatClient = new ChatClient(auth, { channels: ['hulkermon'] });

export class TwitchService {
  /**
   * setup
   * Connect the bot to the Twitch API and listen for events.
   */
  public setup() {
    return new Promise(async (resolve, reject) => {
      await chatClient.connect().catch(reject);

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
        chatClient.say(channel, 'hello world');
      }
    })
  }
}