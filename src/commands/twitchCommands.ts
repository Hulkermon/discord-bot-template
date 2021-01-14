import { ChatClient } from 'twitch-chat-client';
import { ApiClient } from 'twitch/lib';
import { SqliteService } from '../services/sqliteService';
import { TwitchService } from '../services/twitchService';
import { DiscordService } from '../services/discordService';
import { MessageEmbed, TextChannel } from 'discord.js';

let sqliteService = new SqliteService();
let discordService = new DiscordService();

export const enum TwitchCommandsList {
  ping = 'ping',
  help = 'help',
};

const enum PermissionLevel {
  developer,
  broadcaster,
  mod,
  viewer,
};

type CommandInfo = {
  name: string,
  cooldownSeconds?: number,
  permissionLevel: PermissionLevel,
  log: boolean,
};


const devUser = 'hulkermon';

const commandsInfos: CommandInfo[] = [
  { name: 'ping', permissionLevel: PermissionLevel.mod, log: false },
  { name: 'help', cooldownSeconds: 30, permissionLevel: PermissionLevel.viewer, log: false },
];

// Used to temporarily store who executed which command and at what time
let commandUsages: [{
  channel: string,
  viewers: [{
    username: string,
    commands: [{
      name: string,
      timestamp: number,
    }],
  }],
}];

export class TwitchCommands {

  /**
   * execute
   * Executes a command
   * @param command
   * @returns Promise that resolves once the command has been executed
   */
  public execute(command: TwitchCommandsList, chatClient: ChatClient, apiClient: ApiClient, channel: string, username: string, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        if ((await this.checkPermission(username, channel, command) as boolean) && this.checkCooldown(chatClient, channel, username, command)) {
          await this.checkLog(apiClient, channel, username, command, args);
          await this[command](chatClient, apiClient, channel, username, args);
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * checkPermission
   * Check if a user is allowed to use a command
   * @param member
   * @param command
   * @returns true if the user has permission to use the command, false if not
   */
  private checkPermission(user: string, channel: string, command?: TwitchCommandsList): Promise<boolean | PermissionLevel> {
    let userAccessLevel: PermissionLevel;
    let commandInfo = commandsInfos.find(c => c.name === command);
    let twitchService = new TwitchService()

    return new Promise(async (resolve, reject) => {
      if (user.toLowerCase() === devUser) {
        userAccessLevel = PermissionLevel.developer;
      } else if (user === channel) {
        userAccessLevel = PermissionLevel.broadcaster;
      } else if ((commandInfo && commandInfo.permissionLevel === PermissionLevel.mod) || !command) {
        if (await twitchService.checkMod(channel, user).catch(reject)) {
          userAccessLevel = PermissionLevel.mod;
        }
      }
      if (userAccessLevel === undefined) {
        userAccessLevel = PermissionLevel.viewer;
      }

      if (commandInfo) {
        resolve(userAccessLevel <= commandInfo.permissionLevel);
      } else {
        resolve(userAccessLevel);
      }
    })
  }

  /**
   * checkLog
   * Checkes if a command execution should be logged and does so if needed
   * @param message The Discord Message
   * @param command The command executed
   */
  private checkLog(apiClient: ApiClient, channel: string, username: string, command: TwitchCommandsList, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let commandInfo = commandsInfos.find(c => c.name === command);
      if (commandInfo?.log) {
        try {
          let settings = await sqliteService.getSettingsByTwitchChannel(channel);
          if (settings.logChannelId) {
            let logChannel = discordService.getClient().guilds.resolve(settings.guildId || '')?.channels.resolve(settings.logChannelId);
            if (logChannel && ((logChannel): logChannel is TextChannel => logChannel.type === 'text')(logChannel)) {
              let user = await apiClient.helix.users.getUserByName(username);
              if (user) {
                let message = settings.twitchPrefix + command.toString() + args.join(' ');
                let logEmbed = new MessageEmbed()
                  .setAuthor(user.name, user.profilePictureUrl)
                  .setDescription(`**Command sent on Twitch**`)
                  .addField(`Message`, message);
                await logChannel.send(logEmbed).catch(reject);
              }
            }
          }
          resolve();
        } catch (error) {
          reject(`checkLog: ${error}`);
        }
      } else {
        resolve();
      }
    });
  }

  /**
   * checkCooldown
   * Check if a command is still on cooldown
   * @param msg The member trying to execute a command
   * @param command The command to be checked
   * @returns true if the cooldown time has passed
   */
  private checkCooldown(chatClient: ChatClient, channel: string, user: string, command: TwitchCommandsList): boolean {
    let now = new Date().getTime() / 1000; // in seconds
    let cooldown = commandsInfos.find(c => c.name === command.toString())?.cooldownSeconds;

    let channelInArray = commandUsages?.find(cu => cu.channel === channel);
    let viewer = channelInArray?.viewers.find(v => v.username === user);
    let lastExecution = viewer?.commands.find(cmd => cmd.name === command.toString());
    if (!(channelInArray && viewer && lastExecution)) {
      if (!lastExecution) {
        lastExecution = {
          name: command.toString(),
          timestamp: now,
        };
        if (viewer) {
          viewer.commands.push(lastExecution);
        }
        else {
          viewer = {
            username: user,
            commands: [lastExecution],
          };
          if (channelInArray) {
            channelInArray.viewers.push(viewer);
          } else {
            channelInArray = {
              channel: channel,
              viewers: [viewer]
            };
            if (Array.isArray(commandUsages)) {
              commandUsages.push(channelInArray);
            } else {
              commandUsages = [channelInArray];
            }
          }
        }
      }
      return true;
    }

    if (!cooldown) {
      return true;
    };
    if (lastExecution.timestamp <= now - cooldown) {
      lastExecution.timestamp = now;
      return true;
    } else {
      let remainingCooldown = lastExecution.timestamp + cooldown - now;
      chatClient.say(channel, `@${user} wait ${Math.ceil(remainingCooldown)} seconds`);
      return false;
    }
  }

  private checkMod(apiClient: ApiClient, channel: string, user: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      apiClient.helix.users.getUsersByNames([channel, user]).then(helixUsers => {
        if (helixUsers[0] && helixUsers[1]) {
          apiClient.helix.moderation.checkUserMod(helixUsers[0].id, helixUsers[1].id).then(isMod => {
            if (isMod) {
              resolve(true);
            } else {
              resolve(false);
            }
          }).catch(reject);
        } else {
          resolve(false);
        }
      }).catch(reject);
    })
  }

  /**
   * ping
   * pings the bot
   */
  private ping(chatClient: ChatClient, apiClient: ApiClient, channel: string, user: string, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        chatClient.say(channel, `🏓`);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * help
   * Displays the availabe commands
   */
  private help(chatClient: ChatClient, apiClient: ApiClient, channel: string, user: string, args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      let viewerCommands = commandsInfos.filter(ci => ci.permissionLevel === PermissionLevel['viewer']).map(ci => ci.name).join(', ')
      let broadcasterCommands = commandsInfos.filter(ci => ci.permissionLevel === PermissionLevel['broadcaster']).map(ci => ci.name).join(', ')
      let helpMessage = `Commands -> ${viewerCommands}`;
      if (user === channel) helpMessage += `, ${broadcasterCommands}`;
      chatClient.say(channel, helpMessage);
      resolve();
    });
  }
}