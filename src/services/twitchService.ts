import { TwitchCommands, TwitchCommandsList } from './../commands/twitchCommands';
import { SqliteService } from './sqliteService';
import { environment } from '../../environments/environment';
import { RefreshableAuthProvider, RefreshConfig, StaticAuthProvider } from 'twitch-auth';
import { ChatClient } from 'twitch-chat-client';
import { promises as fs } from 'fs';
import { ApiClient } from 'twitch';

let apiClient: ApiClient;
let chatClient: ChatClient;

export class TwitchService {

  constructor() {
  }
  /**
   * setup
   * Connect the bot to the Twitch API and listen for events.
   */
  public setup(): Promise<any> {
    return new Promise(async (resolve, reject) => {
      await this.startApiClient().catch(reject);
      await this.startChatClient().catch(reject);
      this.setupEventHandlers(chatClient);
      console.log(`Logged into Twitch as ${environment.twitch.username}`);
      resolve();
    });
  }

  /**
   * startApiClient
   * Starts the Twitch API client
   */
  private startApiClient(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.refreshApiAuth().then(authProvider => {
        apiClient = new ApiClient({ authProvider, preAuth: true });
      }).catch(reject);
      resolve();
    });
  }

  /**
   * startChatClient
   * Start the Twitch Chat client
   */
  public startChatClient(): Promise<any> {
    return new Promise((resolve, reject) => {
      let sqliteService = new SqliteService();
      sqliteService.getGuildsDb().then(db => {
        let allChannels: string[] = [];
        db.all('SELECT settings FROM settings', (err: Error | null, rows: any[]) => {
          if (err) {
            reject(err);
          } else {
            rows.forEach(row => {
              let settings = JSON.parse(row.settings);
              if (settings.twitchChannel) {
                allChannels.push(settings.twitchChannel);
              }
            });
            this.refreshChatAuth().then(async auth => {
              chatClient = new ChatClient(auth, { channels: allChannels, requestMembershipEvents: true });
              await chatClient.connect().catch(reject);
              resolve();
            }).catch(reject);
          }
        });
      }).catch(reject);
    })
  }

  private refreshChatAuth(): Promise<RefreshableAuthProvider> {
    return new Promise(async (resolve, reject) => {
      fs.readFile('./environments/botToken.json').then(rawTokenData => {
        let twitchEnv = environment.twitch;
        let clientId = twitchEnv.clientId;
        let clientSecret = twitchEnv.clientSecret;

        let tokenData = JSON.parse(rawTokenData.toString());
        let accessToken = tokenData.accessToken;
        let refreshToken = tokenData.refreshToken;
        let expiryTimestamp = tokenData.expiryTimestamp;

        let childProvider = new StaticAuthProvider(clientId, accessToken);
        let refreshConfig: RefreshConfig = {
          clientSecret,
          refreshToken,
          expiry: expiryTimestamp === null ? null : new Date(expiryTimestamp),
          onRefresh: async ({ accessToken, refreshToken, expiryDate }) => {
            let newTokenData = {
              accessToken,
              refreshToken,
              tokenExpiryTimestamp: expiryDate === null ? 0 : expiryDate.getTime()
            };
            await fs.writeFile('./environments/botToken.json', JSON.stringify(newTokenData, null, 4), 'utf-8');
            console.log('refreshed bot token');
          }
        }
        let auth = new RefreshableAuthProvider(childProvider, refreshConfig);
        resolve(auth);
      }).catch(reject);
    });
  }

  private refreshApiAuth(): Promise<RefreshableAuthProvider> {
    return new Promise(async (resolve, reject) => {
      fs.readFile('./environments/broadcasterToken.json').then(rawTokenData => {
        let twitchEnv = environment.twitch;
        let clientId = twitchEnv.clientId;
        let clientSecret = twitchEnv.clientSecret;

        let tokenData = JSON.parse(rawTokenData.toString());
        let accessToken = tokenData.accessToken;
        let refreshToken = tokenData.refreshToken;
        let expiryTimestamp = tokenData.expiryTimestamp;

        let childProvider = new StaticAuthProvider(clientId, accessToken);
        let refreshConfig: RefreshConfig = {
          clientSecret,
          refreshToken,
          expiry: expiryTimestamp === null ? null : new Date(expiryTimestamp),
          onRefresh: async ({ accessToken, refreshToken, expiryDate }) => {
            let newTokenData = {
              accessToken,
              refreshToken,
              tokenExpiryTimestamp: expiryDate === null ? 0 : expiryDate.getTime()
            };
            await fs.writeFile('./environments/broadcasterToken.json', JSON.stringify(newTokenData, null, 4), 'utf-8');
            console.log('refreshed API token');
          }
        }
        let auth = new RefreshableAuthProvider(childProvider, refreshConfig);
        resolve(auth);
      }).catch(reject);
    });
  }

  /**
   * setupEventHandlers
   * sets up all the event handlers for a Twitch Chat Client.
   * @param client The chat client for which to setup the event handlers.
   */
  private setupEventHandlers(client: ChatClient) {
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
      let sqliteService = new SqliteService();
      let settings = await sqliteService.getSettingsByTwitchChannel(channelName);
      let prefix = settings.twitchPrefix;
      let isDevChannel = settings.guildId ? environment.discord.devGuildIds.includes(settings.guildId) : false;

      if (prefix && message.startsWith(prefix) && (environment.production ? !isDevChannel : isDevChannel)) {
        this.executeChatCommand(channelName, user, message, prefix);
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
    let commands = new TwitchCommands();

    let [cmd, ...args]: [TwitchCommandsList, string] = this.getCommandAndArgs(prefix, message);

    commands.execute(cmd, chatClient, apiClient, channel, user, args).catch(console.error);
  }

  /**
   * getCommandAndArgs
   * @param prefix The bots prefix
   * @param message The string containing the command
   */
  private getCommandAndArgs(prefix: string, message: string): any {
    let safePrefix = '';
    for (let i = 0; i < prefix.length; i++) {
      let char = prefix[i];
      if (!char.match(/[a-z]|[0-9]/i)) {
        char = '\\' + char;
      }
      safePrefix += char;
    }

    let regex = "^" + safePrefix + "|\\s+";
    let commandAndArgs = message.split(new RegExp(regex)).splice(1);
    commandAndArgs[0] = commandAndArgs[0].toLowerCase();
    return commandAndArgs;
  }
}
