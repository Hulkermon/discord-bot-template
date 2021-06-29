import { GuildSettings, SqliteService } from '../services/sqliteService';
import { GuildMember, Message, MessageEmbed, TextChannel } from "discord.js";

let sqliteService = new SqliteService();

export const enum DiscordCommandsList {
  // Member commands
  help = 'help',
  ping = 'ping',

  // Mod commands
  info = 'info',

  // Admin commands
  prefix = 'prefix',
  mod = 'mod',
  cmdchannel = 'cmdchannel',
  logchannel = 'logchannel',
};

const enum PermissionLevel {
  developer,
  admin,
  moderator,
  member,
};

type CommandInfo = {
  name: string,
  cooldownSeconds: number,
  permissionLevel: PermissionLevel,
  log: boolean,
};


const devUserId = '220215888555540490';
const botDevDiscordIconUrl = 'https://cdn.discordapp.com/avatars/220215888555540490/eeae2fcf085a425ccfe86771625c281e.png?size=128';

const commandsInfos: CommandInfo[] = [
  { name: 'help', cooldownSeconds: 5, permissionLevel: PermissionLevel.member, log: false },
  { name: 'ping', cooldownSeconds: 5, permissionLevel: PermissionLevel.member, log: true },
  { name: 'info', cooldownSeconds: 5, permissionLevel: PermissionLevel.moderator, log: false },
  { name: 'prefix', cooldownSeconds: 1, permissionLevel: PermissionLevel.admin, log: false },
  { name: 'mod', cooldownSeconds: 1, permissionLevel: PermissionLevel.admin, log: false },
  { name: 'commandschannel', cooldownSeconds: 1, permissionLevel: PermissionLevel.admin, log: false },
  { name: 'cmdchannel', cooldownSeconds: 1, permissionLevel: PermissionLevel.admin, log: false },
  { name: 'logchannel', cooldownSeconds: 1, permissionLevel: PermissionLevel.admin, log: true },
  { name: 'get', cooldownSeconds: 1, permissionLevel: PermissionLevel.developer, log: false },
  { name: 'set', cooldownSeconds: 1, permissionLevel: PermissionLevel.developer, log: false },
];

// Used to temporarily store who executed which command and at what time
let commandUsages: [{
  guildId: string | undefined,
  members: [{
    userId: string,
    commands: [{
      name: string,
      timestamp: number,
    }],
  }],
}];

export class DiscordCommands {

  /**
   * execute
   * Executes a command
   * @param command
   * @returns Promise that resolves once the command has been executed
   */
  public execute(command: DiscordCommandsList, msg: Message, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      try {
        if (msg.member && ((await this.checkPermission(msg.member, command)) as boolean) && this.checkCooldown(msg, command)) {
          await this.checkLog(msg, command);
          await this[command](msg, args);
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
  private checkPermission(member: GuildMember, command?: DiscordCommandsList): Promise<boolean | PermissionLevel> {
    let authorAccessLevel: PermissionLevel;
    let commandInfo = commandsInfos.find(c => c.name === command);

    return new Promise(async (resolve, reject) => {
      try {
        let settings = await sqliteService.getSettingsByGuildId(member.guild.id);
        if (member.id === devUserId) {
          authorAccessLevel = PermissionLevel.developer;
        } else if (member.hasPermission('ADMINISTRATOR')) {
          authorAccessLevel = PermissionLevel.admin;
        } else if (settings.modRoleId && member.roles.cache.find(r => r.id === settings.modRoleId)) {
          authorAccessLevel = PermissionLevel.moderator;
        } else {
          authorAccessLevel = PermissionLevel.member;
        }

        if (commandInfo === undefined) {
          resolve(authorAccessLevel);
        } else {
          resolve(authorAccessLevel <= commandInfo.permissionLevel);
        }
      } catch (error) {
        reject(`checkPermission: ${error}`);
      }
    })
  }

  /**
   * checkCooldown
   * Check if a command is still on cooldown
   * @param msg The member trying to execute a command
   * @param command The command to be checked
   * @returns true if the cooldown time has passed
   */
  private checkCooldown(msg: Message, command: DiscordCommandsList): boolean {
    let now = new Date().getTime() / 1000; // in seconds
    let cooldown = commandsInfos.find(c => c.name === command.toString())?.cooldownSeconds;
    let guild = commandUsages?.find(cu => cu.guildId === msg.guild?.id);
    let member = guild?.members.find(m => m.userId === msg.author.id);
    let lastExecution = member?.commands.find(cmd => cmd.name === command.toString());
    if (!(guild && member && lastExecution)) {
      if (!lastExecution) {
        lastExecution = {
          name: command.toString(),
          timestamp: now,
        };
        if (member) {
          member.commands.push(lastExecution);
        }
        else {
          member = {
            userId: msg.author.id,
            commands: [lastExecution],
          };
          if (guild) {
            guild.members.push(member);
          } else {
            guild = {
              guildId: msg.guild?.id,
              members: [member]
            };
            if (Array.isArray(commandUsages)) {
              commandUsages.push(guild);
            } else {
              commandUsages = [guild];
            }
          }
        }
      }
      return true;
    }

    if (!cooldown) return true;
    if (lastExecution.timestamp <= now - cooldown) {
      lastExecution.timestamp = now;
      return true;
    } else {
      let remainingCooldown = lastExecution.timestamp + cooldown - now;
      msg.channel.send(`${msg.author.toString()} Please wait ${Math.ceil(remainingCooldown)} Seconds`).catch(console.error);
      return false;
    }
  }

  private resetCooldown(guildId: string | undefined, memberId: string, command: DiscordCommandsList) {
    let storedCommand = commandUsages.find(cu => cu.guildId === guildId)?.members.find(m => m.userId === memberId)?.commands.find(c => c.name === command);
    if (storedCommand?.timestamp) storedCommand.timestamp = 0;
  }

  /**
   * checkLog
   * Checkes if a command execution should be logged and does so if needed
   * @param msg The Discord Message
   * @param command The command executed
   */
  private checkLog(msg: Message, command: DiscordCommandsList): Promise<any> {
    let sqliteService = new SqliteService();

    return new Promise((resolve, reject) => {
      let commandInfo = commandsInfos.find(c => c.name === command);
      if (commandInfo?.log) {
        sqliteService.getSettingsByGuildId(msg.guild?.id).then(async settings => {
          if (settings.logChannelId) {
            let logChannel = msg.guild?.channels.resolve(settings.logChannelId);
            if (logChannel && ((logChannel): logChannel is TextChannel => logChannel.type === 'text')(logChannel)) {
              let logEmbed = new MessageEmbed()
                .setAuthor(msg.author.tag, msg.author.displayAvatarURL())
                .setDescription(`**Command sent in** <#${msg.channel.id}> [Go to Message](https://discord.com/channels/${msg.guild?.id}/${msg.channel.id}/${msg.id})`)
                .addField(`Message`, `${msg.content}`);
              await logChannel.send(logEmbed).catch(reject);
            }
          }
          resolve();
        }).catch(reject);
      } else {
        resolve();
      }
    });
  }

  /**
   * help
   * displays a list of available commands
   */
  private help(msg: Message, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let settings = await sqliteService.getSettingsByGuildId(msg.guild?.id);
      let helpEmbed = new MessageEmbed()
        .setColor('#92cded')
        .setTitle('**Commands List**')
        .setDescription(`prefix: \`${settings.discordPrefix}\``)
        .addFields(
          { name: '*help*', value: 'Shows this menu' },
          { name: '*ping*', value: 'Pings the bot' },
        )
        .setFooter('Coded with <3 by Hulkermon#1337', botDevDiscordIconUrl);
      if (msg.member && ((await this.checkPermission(msg.member) as PermissionLevel) <= PermissionLevel.moderator)) {
        helpEmbed.addFields(
          { name: '\u200B', value: '\u200B' },
          { name: '**Moderator Commands**', value: '\u200B' },
          { name: '*info*', value: 'some general infos about the bot' },
        );
      }
      if (msg.member && ((await this.checkPermission(msg.member) as PermissionLevel) <= PermissionLevel.admin)) {
        helpEmbed.addFields(
          { name: '\u200B', value: '\u200B' },
          { name: '**Admin Commands**', value: '\u200B' },
          { name: '*cmdChannel [#text-channel]*', value: `Sets where the bot listens for commands.\n\`${settings.discordPrefix}cmdChannel off\` to disable` },
          { name: '*logChannel [#text-channel]*', value: `Logs certain command executions.\n\`${settings.discordPrefix}logChannel off\` to disable` },
          { name: '*prefix [newPrefix]*', value: 'Changes the bots prefix' },
          { name: '*mod [@modRole]*', value: 'Sets the moderator role' },
        );
      }
      msg.channel.send(helpEmbed).then(resolve).catch(reject);
    })
  }

  /**
   * ping
   * pings the bot
   */
  private ping(pingMsg: Message, args: string[]): Promise<number> {
    return new Promise(async (resolve, reject) => {
      pingMsg.channel.send(`pong!`).then(async pongMsg => {
        let pingTime = pingMsg.createdTimestamp;
        let pongTime = pongMsg.createdTimestamp;
        let timeDelta = pongTime - pingTime;
        await pongMsg.edit(`${pongMsg.content} \`${timeDelta}ms\``);
        resolve(timeDelta);
      }).catch(reject);
    });
  }

  /**
   * prefix
   * Sets the bots prefix
   */
  private prefix(msg: Message, args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!args[0]) {
        msg.channel.send('Please provide a prefix')
          .then(() => { resolve('no prefix defined') })
          .catch(reject);
      } else {
        let newSettings: GuildSettings = { discordPrefix: args[0] };
        sqliteService.setSettingsByGuildId(msg.guild?.id, newSettings).then(res => {
          msg.channel.send(`prefix changed to \`${args[0]}\``).then(() => resolve(res)).catch(reject);
        }).catch(reject);
      }
    });
  }

  /**
   * mod
   * Sets the moderator role
   */
  private mod(msg: Message, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let modRoleRegex = /<@&(\d{18})>/;
      if (!args[0] || args[0].match(modRoleRegex) === null) {
        await msg.channel.send('[@modRole] must be tagged with @').catch(reject);
        resolve();
      } else {
        let modRoleMatch = args[0].match(modRoleRegex);
        if (modRoleMatch) {
          let modRoleId = modRoleMatch[1];
          let newSettings: GuildSettings = {
            modRoleId,
          };
          await sqliteService.setSettingsByGuildId(msg.guild?.id, newSettings).catch(reject);
          await msg.channel.send(`<@&${modRoleId}> set as bot moderator role`);
          resolve();
        }
      }
    });
  }

  /**
   * info
   * Posts some general infos about the bot
   */
  private info(msg: Message, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let settings = await sqliteService.getSettingsByGuildId(msg.guild?.id);
      let infoEmbed = new MessageEmbed()
        .setColor('#92cded')
        .setTitle('Info')
        .addFields(
          { name: '***Discord prefix***', value: `\`${settings.discordPrefix}\``, inline: true },
        )
        .setFooter('Coded with <3 by Hulkermon#1337', botDevDiscordIconUrl);
      if (settings.cmdChannelId) {
        infoEmbed.addField('***Commands Channel***', `<#${settings.cmdChannelId}>`);
      }
      msg.channel.send(infoEmbed).then(resolve).catch(reject);
    });
  }

  /**
   * cmdChannel
   * Enables and sets or disables specific command channels where the bot listens
   */
  private async cmdchannel(msg: Message, args: string[]): Promise<any> {
    if (!args[0]) {
      await msg.channel.send('Please provide a text channel');
      return Promise.resolve('No Text channel was provided');
    }

    let newCmdChannelId: string;
    if (args[0].toLowerCase() === 'off') {
      newCmdChannelId = '';
      await msg.channel.send(`Commands can now be used server-wide`);
    } else {
      let regex = args[0].match(/<#(\d{18})>/);
      if (regex && regex[1]) {
        newCmdChannelId = regex[1];
      } else {
        await msg.channel.send(`Please mention the channel with #`);
        return Promise.resolve('Channel not found');
      }
    }
    return new Promise((resolve, reject) => {
      let newCmdChannel = msg.guild?.channels.resolve(newCmdChannelId);
      let newSettings: GuildSettings = { cmdChannelId: newCmdChannel?.id };
      sqliteService.setSettingsByGuildId(msg.guild?.id, newSettings).then(async res => {
        if (newCmdChannel) {
          await msg.channel.send(`cmdChannel changed to ${newCmdChannel?.toString()}`).catch(reject);
        }
        resolve(res);
      }).catch(reject);
    })
  }

  /**
   * logchannel
   * Enables and sets or disables a textchannel where certain command executions are logged
   */
  private async logchannel(msg: Message, args: string[]): Promise<any> {
    if (!args[0]) {
      await msg.channel.send('Please provide a text channel');
      return Promise.resolve();
    }

    let newLogChannelId: string;
    if (args[0].toLowerCase() === 'off') {
      newLogChannelId = '';
      await msg.channel.send(`Command executions will no longer be logged`);
    } else {
      let regex = args[0].match(/<#(\d{18})>/);
      if (regex && regex[1]) {
        newLogChannelId = regex[1];
      } else {
        await msg.channel.send(`Please mention the channel with #`);
        return Promise.resolve();
      }
    }
    return new Promise((resolve, reject) => {
      let newLogChannel = msg.guild?.channels.resolve(newLogChannelId);
      let db = new SqliteService();
      let newSettings: GuildSettings = { logChannelId: newLogChannel?.id };
      db.setSettingsByGuildId(msg.guild?.id, newSettings).then(async res => {
        if (newLogChannel) {
          await msg.channel.send(`Log Channel set to ${newLogChannel?.toString()}`).catch(reject);
          this.checkLog(msg, DiscordCommandsList.logchannel)
        }
        resolve(res);
      }).catch(reject);
    })
  }
}