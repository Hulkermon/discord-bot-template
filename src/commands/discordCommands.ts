import { TwitchService } from './../services/twitchService';
import { GuildSettings, SqliteService } from '../services/sqliteService';
import { GuildMember, Message, MessageEmbed } from "discord.js";

export const enum DiscordCommandsList {
  help = 'help',
  ping = 'ping',
  prefix = 'prefix',
  twitchprefix = 'twitchprefix',
  settwitch = 'settwitch',
  info = 'info',
  cmdchannel = 'cmdchannel',
  get = 'get',
  set = 'set',
};

const enum PermissionLevel {
  developer,
  admin,
  manager,
  member,
};

type CommandInfo = {
  name: string,
  cooldownSeconds: number,
  permissionLevel: PermissionLevel,
};


const devUserId = '220215888555540490';
const botDevDiscordIconUrl = 'https://cdn.discordapp.com/avatars/220215888555540490/eeae2fcf085a425ccfe86771625c281e.png?size=128';

const commandPermissions: CommandInfo[] = [
  { name: 'help', cooldownSeconds: 5, permissionLevel: PermissionLevel.member },
  { name: 'ping', cooldownSeconds: 5, permissionLevel: PermissionLevel.member },
  { name: 'prefix', cooldownSeconds: 1, permissionLevel: PermissionLevel.admin },
  { name: 'twitchprefix', cooldownSeconds: 1, permissionLevel: PermissionLevel.admin },
  { name: 'settwitch', cooldownSeconds: 1, permissionLevel: PermissionLevel.admin },
  { name: 'info', cooldownSeconds: 5, permissionLevel: PermissionLevel.member },
  { name: 'commandschannel', cooldownSeconds: 1, permissionLevel: PermissionLevel.admin },
  { name: 'cmdchannel', cooldownSeconds: 1, permissionLevel: PermissionLevel.admin },
  { name: 'get', cooldownSeconds: 1, permissionLevel: PermissionLevel.developer },
  { name: 'set', cooldownSeconds: 1, permissionLevel: PermissionLevel.developer },
];

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
        if (msg.member && this.checkPermission(msg.member, command)) {
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
  private checkPermission(member: GuildMember, command: DiscordCommandsList): boolean {
    let authorAccessLevel: PermissionLevel;
    let commandInfo = commandPermissions.find(c => c.name === command);

    if (commandInfo === undefined) {
      return false;
    }

    if (member.id === devUserId) {
      authorAccessLevel = PermissionLevel.developer;
    } else if (member.hasPermission('ADMINISTRATOR')) {
      authorAccessLevel = PermissionLevel.admin;
    } else if (member.hasPermission('MANAGE_GUILD')) {
      authorAccessLevel = PermissionLevel.manager;
    } else {
      authorAccessLevel = PermissionLevel.member;
    }

    return authorAccessLevel <= commandInfo.permissionLevel;
  }

  /**
   * help
   * displays a list of available commands
   */
  private help(msg: Message, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let db = new SqliteService();
      let settings = await db.getSettingsByGuildId(msg.guild?.id);
      let helpEmbed = new MessageEmbed()
        .setColor('#92cded')
        .setTitle('**Commands List**')
        .setDescription(`prefix: \`${settings.discordPrefix}\``)
        .addFields(
          { name: '*help*', value: 'Shows this menu' },
          { name: '*ping*', value: 'Pings the bot' },
          { name: '*info*', value: 'some general infos about the bot' },
        )
        .setFooter('Coded with <3 by Hulkermon#1337', botDevDiscordIconUrl);
      if (msg.member?.hasPermission('ADMINISTRATOR')) {
        helpEmbed.addFields(
          { name: '\u200B', value: '\u200B' },
          { name: '**Admin Commands**', value: '\u200B' },
          { name: '*cmdChannel [#text-channel]*', value: `Sets where the bot listens for commands.\n\`${settings.discordPrefix}cmdChannel off\` to disable` },
          { name: '*prefix [newPrefix]*', value: 'Changes the bots prefix' },
          { name: '*twitchPrefix [newPrefix]*', value: 'Changes the bots prefix on Twitch' },
          { name: '*setTwitch [twitchChannel]*', value: 'Sets where the bot will listen on Twitch' },
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
        let db = new SqliteService();
        let newSettings: GuildSettings = { discordPrefix: args[0] };
        db.setSettingsByGuildId(msg.guild?.id, newSettings).then(res => {
          msg.channel.send(`prefix changed to \`${args[0]}\``).then(() => resolve(res)).catch(reject);
        }).catch(reject);
      }
    });
  }

  /**
   * prefix
   * Sets the bots prefix on twitch
   */
  private twitchprefix(msg: Message, args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!args[0]) {
        msg.channel.send('Please provide a prefix')
          .then(() => { resolve('no prefix defined') })
          .catch(reject);
      } else {
        let db = new SqliteService();
        let newSettings: GuildSettings = { twitchPrefix: args[0] };
        db.setSettingsByGuildId(msg.guild?.id, newSettings).then(res => {
          msg.channel.send(`prefix changed to \`${args[0]}\``).then(() => resolve(res)).catch(reject);
        }).catch(reject);
      }
    });
  }

  /**
   * settwitch
   * Sets the twitch channel the bot listens to
   */
  private settwitch(msg: Message, args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!args[0]) {
        msg.channel.send('Please provide a Twitch channel')
          .then(() => { resolve('no Twitch channel defined') })
          .catch(reject);
      } else {
        let newSettings: GuildSettings;
        let confirmationString = '';
        if (args[0].toLowerCase() === 'off') {
          newSettings = { twitchChannel: null }
          confirmationString = `Twitch channel disabled`;
        } else {
          newSettings = { twitchChannel: args[0] }
          confirmationString = `Twitch channel set to \`${args[0]}\``;
        }
        let db = new SqliteService();
        db.setSettingsByGuildId(msg.guild?.id, newSettings).then(async res => {
          let twitchService = new TwitchService();
          await twitchService.setup().catch(reject);
          await msg.channel.send(confirmationString).catch(reject);
          resolve();
        }).catch(reject);
      }
    });
  }

  /**
   * info
   * Posts some general infos about the bot
   */
  private info(msg: Message, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let db = new SqliteService();
      let settings = await db.getSettingsByGuildId(msg.guild?.id);
      let infoEmbed = new MessageEmbed()
        .setColor('#92cded')
        .setTitle('Info')
        .addFields(
          { name: '***Discord prefix***', value: `\`${settings.discordPrefix}\``, inline: true },
          { name: '***Twitch prefix***', value: `\`${settings.twitchPrefix}\``, inline: true },
        )
        .setFooter('Coded with <3 by Hulkermon#1337', botDevDiscordIconUrl);
      if (settings.cmdChannelId) {
        infoEmbed.addField('***Commands Channel***', `<#${settings.cmdChannelId}>`);
      }
      if (settings.twitchChannel) {
        infoEmbed.addField('***Connected Twitch channels***', `${settings.twitchChannel}`);
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
      let db = new SqliteService();
      let newSettings: GuildSettings = { cmdChannelId: newCmdChannel?.id };
      db.setSettingsByGuildId(msg.guild?.id, newSettings).then(async res => {
        if (newCmdChannel) {
          await msg.channel.send(`cmdChannel changed to ${newCmdChannel?.toString()}`).catch(reject);
        }
        resolve(res);
      }).catch(reject);
    })
  }

  /**
   * get
   * Gets the value of a key from the local database
   */
  private get(msg: Message, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let key = args[0];
      let db = new SqliteService();
      db.getValue(msg.guild?.id, key).then(value => {
        msg.channel.send(`**${key}**\n\`${value}\``).then(resolve).catch(reject);
      }).catch(e => {
        if (typeof e === 'string') {
          msg.channel.send(e).then(resolve).catch(reject);
        } else {
          reject(e);
        }
      });
    });
  }

  /**
   * set
   * Sets the value of a key on the local database
   */
  private set(msg: Message, args: string[]): Promise<any> {
    let value: string = args.slice(1).join(' ');

    return new Promise(async (resolve, reject) => {
      let db = new SqliteService();
      db.setValue(msg.guild?.id, args[0], value).then(res => {
        msg.channel.send(res).then(resolve).catch(reject);
      }).catch(reject);
    });
  }
}