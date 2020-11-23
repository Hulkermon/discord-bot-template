import { DiscordCommandsService } from './discordCommandsService';
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
    if (msg.author.bot || msg.channel.type === 'dm') {
      // Ignore Messages by Bots
      // Ignore DMs
      return;
    }
    
    let prefix = (await db.getSettingsByGuildId(msg.guild?.id)).discordPrefix;
    if (msg.content.startsWith(prefix)) {
      this.executeChatCommand(msg, prefix);
    }
  }

  /**
   * Executes a discord chat command.
   * @param msg discord message with the command to execute
   */
  private executeChatCommand(msg: Discord.Message, prefix: string) {
    let commands = new DiscordCommandsService();

    let [cmd, ...args]: [string, string] = this.getCommandAndArgs(prefix, msg);
    // this.getCommandAndArgs(prefix, msg);

    try {
      (commands as any)[cmd](msg, args);
    } catch (error) {
      if (!error.message.endsWith(' is not a function')) {
        console.error(error);
      }
    }
    // msg.channel.send(`hello ${msg.guild?.members.resolve(msg.author)?.displayName}`);
  }

  private getCommandAndArgs(prefix: string, msg: Message): any {
    let regex = "^" + prefix + "|\\s+";
    return msg.content.split(new RegExp(regex)).splice(1);
    // let [cmd, ...args] = msg.content.split(new RegExp(regex)).splice(1);
    // console.log(`msg.content: ${msg.content.split('')}`);
    // console.log(`cmd: ${cmd}`);
  }
}
