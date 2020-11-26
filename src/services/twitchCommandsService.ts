import { ChatClient } from 'twitch-chat-client';
import { GuildSettings, SqliteService } from './sqliteService';

export class TwitchCommandsService {
  public test(chatClient: ChatClient, channel: string, user: string, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      chatClient.say(channel, `Hello ${user}! args: ${args.join(', ')}`);
    });
  }
}