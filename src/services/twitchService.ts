import { TwitchCommands } from './../commands/twitchCommands';
import { DiscordService } from './discordService';
import { SqliteService, GuildSettings } from './sqliteService';
import { environment } from '../../environments/environment.dev';
import { RefreshableAuthProvider, StaticAuthProvider } from 'twitch-auth';
import { ChatClient } from 'twitch-chat-client';
import { promises as fs } from 'fs';

let chatClient: ChatClient;
let db = new SqliteService();

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

      this.setupEventHandlers(chatClient);

      console.log(`Logged into Twitch as ${environment.twitch.username}`);
      resolve();
    })
  }

  /**
   * setupEventHandlers
   * sets up all the event handlers for a Twitch Chat Client.
   * @param client The chat client for which to setup the event handlers.
   */
  public setupEventHandlers(client: ChatClient) {
    client.onMessage((channel, user, message) => {
      this.handleMessage(channel, user, message);
    });
  }

  /**
   * handleMessage
   * Handles the message.
   * @param msg The message to be handled.
   */
  private async handleMessage(channel: string, user: string, message: string) {
    let channelName = channel[0] === '#' ? channel.slice(1) : channel;

    try {
      let prefix = (await db.getSettingsByTwitchChannel(channelName)).twitchPrefix;
      if (prefix && message.startsWith(prefix)) {
        this.executeChatCommand(channel, user, message, prefix);
      }
    } catch (error) {
      console.error(error);
    }
  }

  /**
   * executeChatCommand
   * @param channel The twitch channel where the message was sent
   * @param user The twitch uesr who sent the message
   * @param message The message that was sent
   * @param prefix The bots prefix
   */
  private executeChatCommand(channel: string, user: string, message: string, prefix: string) {
    let tempDiscordService = new DiscordService()
    let commands = new TwitchCommands();

    let [cmd, ...args]: [string, string] = tempDiscordService.getCommandAndArgs(prefix, message);

    try {
      (commands as any)[cmd](chatClient, channel, user, args);
    } catch (error) {
      if (!error.message.endsWith(' is not a function')) {
        console.error(error);
      }
    }
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
