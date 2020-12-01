import { CommandsList, DiscordCommands } from '../commands/discordCommands';
import Discord, { Message } from 'discord.js';
import { environment } from '../../environments/environment.dev';
import { SqliteService } from './sqliteService';

let db = new SqliteService();

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

      await db.connect().catch(reject);

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
      this.handleMessage(msg);
    })
  }

  /**
   * handleMessage
   * Handles the message.
   * @param msg The message to be handled.
   */
  private async handleMessage(msg: Discord.Message) {
    if (msg.author.bot || !msg.guild) {
      // Ignore Messages by Bots
      // Only listen to messages in guilds
      return;
    }
    
    let settings = (await db.getSettingsByGuildId(msg.guild.id));
    let prefix = settings.discordPrefix;
    let cmdChannelId = settings.CmdChannelId;
    if ((prefix && msg.content.startsWith(prefix)) && (!cmdChannelId || cmdChannelId === msg.channel.id)) {
      this.executeChatCommand(msg, prefix);
    }
  }

  /**
   * Executes a discord chat command.
   * @param msg discord message with the command to execute
   */
  private executeChatCommand(msg: Discord.Message, prefix: string) {
    let commands = new DiscordCommands();

    let [cmd, ...args]: [CommandsList, string] = this.getCommandAndArgs(prefix, msg.content);

    commands.execute(cmd, msg, args).catch(console.error);
  }

  /**
   * getCommandAndArgs
   * @param prefix The bots prefix
   * @param msg The string containing the command
   */
  public getCommandAndArgs(prefix: string, msg: string): any {
    let safePrefix = '';
    for (let i = 0; i < prefix.length; i++) {
      let char = prefix[i];
      if (char === '\\') {
        char = '\\\\';
      }
      safePrefix += char;
    }

    let regex = "^" + safePrefix + "|\\s+";
    let commandAndArgs = msg.split(new RegExp(regex)).splice(1);
    commandAndArgs[0] = commandAndArgs[0].toLowerCase();
    return commandAndArgs;
  }
}
