import { GuildSettings, SqliteService } from './sqliteService';
import { Message, MessageEmbed } from "discord.js";
import { rejects } from 'assert';

let DeveloperDiscordIconUrl = 'https://cdn.discordapp.com/avatars/220215888555540490/eeae2fcf085a425ccfe86771625c281e.png?size=128';

export class DiscordCommandsService {

  /**
   * help
   * displays a list of available commands
   */
  public help(msg: Message, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let db = new SqliteService();
      let settings = await db.getSettingsByGuildId(msg.guild?.id);
      let helpEmbed = new MessageEmbed()
        .setColor('#92cded')
        .setTitle('Commands List')
        .setDescription(`prefix: \`${settings.discordPrefix}\``)
        .addFields(
          { name: '***help***', value: 'Shows this menu' },
          { name: '***prefix [newPrefix]***', value: 'Changes the bots prefix' },
          { name: '***ping***', value: 'Pings the bot' },
          { name: '***info***', value: 'some general infos about the bot' },
          { name: '***cmdChannel [#text-channel]***', value: 'Sets where the bot listens for commands. "off" to disable' },
        )
        .setFooter('Coded with <3 by Hulkermon#1337', DeveloperDiscordIconUrl);
      msg.channel.send(helpEmbed).then(resolve).catch(reject);
    })
  }

  /**
   * ping
   * pings the bot
   */
  public ping(pingMsg: Message, args: string[]): Promise<number> {
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
  public prefix(msg: Message, args: string[]): Promise<any> {
    return new Promise((resolve, reject) => {
      let db = new SqliteService();
      let newSettings: GuildSettings = { discordPrefix: args[0] };
      db.setSettingsByGuildId(msg.guild?.id, newSettings).then(res => {
        msg.channel.send(`prefix changed to \`${args[0]}\``).then(() => resolve(res)).catch(reject);
      }).catch(reject);
    });
  }


  /**
   * info
   * Posts some general infos about the bot
   */
  public info(msg: Message, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let db = new SqliteService();
      let settings = await db.getSettingsByGuildId(msg.guild?.id);
      let infoEmbed = new MessageEmbed()
        .setColor('#92cded')
        .setTitle('Info')
        .setDescription(msg.guild?.name)
        .addFields(
          { name: '***Discord prefix***', value: `\`${settings.discordPrefix}\``, inline: true },
          { name: '***Twitch prefix***', value: `\`${settings.twitchPrefix}\``, inline: true },
        )
        .setFooter('Coded with <3 by Hulkermon#1337', DeveloperDiscordIconUrl)
      if (settings.twitchChannels && settings.twitchChannels.length > 0) {
        infoEmbed.addField('***Connected Twitch channels***', `${settings.twitchChannels?.join(', ')}`);
      }
      msg.channel.send(infoEmbed).then(resolve).catch(reject);
    });
  }
  /**
   * commandsChannel
   * Redirects to cmdChannel
   */
  public commandschannel(msg: Message, args: string[]): Promise<any> {
    return this.cmdchannel(msg, args);
  }

  /**
   * cmdChannel
   * AKA: commandsChannel
   * Enables and sets or disables specific command channels where the bot listens
   */
  public async cmdchannel(msg: Message, args: string[]): Promise<any> {
    if (!args[0]) {
      await msg.channel.send('Please provide a text channel');
      return Promise.reject('No Text channel was provided');
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
        return Promise.reject('Channel not found');
      }
    }
    return new Promise((resolve, reject) => {
      let newCmdChannel = msg.guild?.channels.resolve(newCmdChannelId);
      let db = new SqliteService();
      let newSettings: GuildSettings = { CmdChannelId: newCmdChannel?.id };
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
  public get(msg: Message, args: string[]): Promise<any> {
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
  public set(msg: Message, args: string[]): Promise<any> {
    let value: string = args.slice(1).join(' ');

    return new Promise(async (resolve, reject) => {
      let db = new SqliteService();
      db.setValue(msg.guild?.id, args[0], value).then(res => {
        msg.channel.send(res).then(resolve).catch(reject);
      }).catch(reject);
    });
  }
}