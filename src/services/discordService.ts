import Discord from 'discord.js';
import { environment } from '../../environments/environment.dev';

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
      console.log(`Logged in as ${client.user?.tag}`);
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
  private handleMessage(msg: Discord.Message) {
    if (msg.author.bot) {
      // Ignore Messages by Bots
      return;
    }
    if (!environment.production && msg.guild?.id !== environment.discord.guildId) {
      // Only listen to test server if in dev environment
      return;
    }
    msg.channel.send('hi');
  }
}