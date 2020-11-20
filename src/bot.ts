import { TwitchService } from './services/twitchService';
import { DiscordService } from './services/discordService';

const twitchService = new TwitchService();
const discordService = new DiscordService();

export class Bot {
  /**
   * start
   * Start the Discord and Twitch bots
   */
  public start() {
    return new Promise(async (resolve, reject) => {
      await discordService.setup().catch(reject);
      await twitchService.setup().catch(reject);
      resolve();
    })
  }
}
