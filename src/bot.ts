import { SqliteService } from './services/sqliteService';
import { DiscordService } from './services/discordService';

const sqliteService = new SqliteService();
const discordService = new DiscordService();

export class Bot {
  /**
   * start
   * Start the Discord bot
   */
  public start() {
    return new Promise(async (resolve, reject) => {
      await sqliteService.setup();
      Promise.all([
        discordService.setup(),
      ]).then(resolve).catch(reject);
    });
  }
}
