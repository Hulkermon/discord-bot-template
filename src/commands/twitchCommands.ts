import { ChatClient } from 'twitch-chat-client';
import { GuildSettings, SqliteService } from './../services/sqliteService';

export const enum TwitchCommandsList {
  ping = 'ping',
};

const enum PermissionLevel {
  developer,
  admin,
  mod,
  member,
};

type CommandInfo = {
  name: string,
  cooldownSeconds: number,
  permissionLevel: PermissionLevel,
};

const commandPermissions: CommandInfo[] = [
  { name: 'ping', cooldownSeconds: 5, permissionLevel: PermissionLevel.member },
];

export class TwitchCommands {

  /**
   * execute
   * Executes a command
   * @param command
   * @returns Promise that resolves once the command has been executed
   */
  public execute(command: TwitchCommandsList, chatClient: ChatClient, channel: string, user: string, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        await this[command](chatClient, channel, user, args);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * ping
   * pings the bot
   */
  private ping(chatClient: ChatClient, channel: string, user: string, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        chatClient.say(channel, `🏓`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }
}