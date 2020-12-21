import { SqliteService } from './services/sqliteService';
import { TwitchService } from './services/twitchService';
import { DiscordService } from './services/discordService';

const sqliteService = new SqliteService();
const twitchService = new TwitchService();
const discordService = new DiscordService();

export class Bot {
  /**
   * start
   * Start the Discord and Twitch bots
   */
  public start() {
    return new Promise(async (resolve, reject) => {
      await sqliteService.setup();
      Promise.all([
        discordService.setup(),
        console.log('Twitch side requires some more setup'),
        // twitchService.setup(),
      ]).then(resolve).catch(reject);
    });
  }
}
