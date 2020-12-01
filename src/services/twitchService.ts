import { TwitchCommands, TwitchCommandsList } from './../commands/twitchCommands';
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
      // TODO: Dynamic Twitch channels and such. Not really a priority I guess...
      chatClient = new ChatClient(auth, { channels: ['hulkerbot'], requestMembershipEvents: true });
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
    let commands = new TwitchCommands();

    let [cmd, ...args]: [TwitchCommandsList, string] = this.getCommandAndArgs(prefix, message);

    commands.execute(cmd, chatClient, channel, user, args).catch(console.error);
  }

  /**
   * Executes a discord chat command.
   * @param msg discord message with the command to execute
   */
  // private executeChatCommand(msg: Discord.Message, prefix: string) {
  //   let commands = new DiscordCommands();

  //   let [cmd, ...args]: [CommandsList, string] = this.getCommandAndArgs(prefix, msg.content);

  //   commands.execute(cmd, msg, args).catch(console.error);
  // }

  /**
   * getCommandAndArgs
   * @param prefix The bots prefix
   * @param message The string containing the command
   */
  public getCommandAndArgs(prefix: string, message: string): any {
    let safePrefix = '';
    for (let i = 0; i < prefix.length; i++) {
      let char = prefix[i];
      if (char === '\\' || char === '$') {
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
