import { Message } from 'discord.js';
import { DiscordCommandsList, DiscordCommands } from '../commands/discordCommands';
import Discord from 'discord.js';
import { environment } from '../../environments/environment';
import { SqliteService, GuildSettings } from './sqliteService';


export class DiscordService {
  /**
   * setup
   * Connect the bot to the Discord API and listen for events.
   */
  public setup(): Promise<string> {
    return new Promise(async (resolve, reject) => {
      let client = new Discord.Client();

      this.setupEventHandlers(client);

      await client.login(environment.discord.botToken).catch(reject);

      resolve();
    });
  }

  /**
   * setupEventHandlers
   * sets up all the event handlers for a Discord Client.
   * @param client The client for which to setup the event handlers.
   */
  private setupEventHandlers(client: Discord.Client) {
    client.on('ready', () => {
      console.log(`Logged into Discord as ${client.user?.tag}`);
    });

    client.on('message', msg => {
      try {
        this.handleMessage(msg);
      } catch (error) {
        console.error(error);
      }
    })
  }

  /**
   * handleMessage
   * Handles the message.
   * @param msg The message to be handled.
   */
  private async handleMessage(msg: Message) {
    if (msg.author.bot || !msg.guild) {
      // Ignore Messages by Bots
      // Only listen to messages in guilds
      return;
    }

    let sqliteService = new SqliteService();
    sqliteService.getSettingsByGuildId(msg.guild?.id).then(settings => {
      if (environment.production && msg.guild && environment.discord.prodGuildIds.includes(msg.guild.id)) {
        this.checkForActions(msg, settings);
      } else if (!environment.production && msg.guild && environment.discord.devGuildIds.includes(msg.guild.id)) {
        this.checkForActions(msg, settings);
      }
    }).catch(console.error);
  }

  private checkForActions(msg: Message, settings: GuildSettings) {
    let prefix = settings.discordPrefix;
    let cmdChannelId = settings.cmdChannelId;
    try {
      if ((prefix && msg.content.startsWith(prefix)) && (!cmdChannelId || cmdChannelId === msg.channel.id)) {
        this.executeChatCommand(msg, prefix);
      }
    } catch (error) {
      console.log('Error executing a command:', error);
    }
  }

  /**
   * Executes a discord chat command.
   * @param msg discord message with the command to execute
   */
  private executeChatCommand(msg: Discord.Message, prefix: string): Promise<any> {
    return new Promise((resolve, reject) => {
      let commands = new DiscordCommands();

      let [cmd, ...args]: [DiscordCommandsList, string] = this.getCommandAndArgs(prefix, msg.content);

      commands.execute(cmd, msg, args).then(resolve).catch(reject);
    });
  }

  /**
   * getCommandAndArgs
   * @param prefix The bots prefix
   * @param message The string containing the command
   */
  public getCommandAndArgs(prefix: string, message: string): any {
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
