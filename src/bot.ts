import Discord from 'discord.js';
import { environment } from '../environments/environment.dev';

export class Bot {
  /**
   * connect
   * Connect the bot to the Discord API and listen for events.
   */
  public connect(): Promise<string> {
    let client = new Discord.Client();

    client.on('ready', () => {
      console.log(`Logged in as ${client.user?.tag}`);
    });

    client.on('message', msg => {
      this.handleMessage(msg);
    })

    return client.login(environment.botToken);
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
    if (!environment.production && msg.guild?.id !== environment.guildId) {
      // Only listen to test server if in dev environment
      return;
    }
    
  }
}
