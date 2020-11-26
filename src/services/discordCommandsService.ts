import { GuildSettings, SqliteService } from './sqliteService';
import { Message } from "discord.js";

export class DiscordCommandsService {
  // /**
  //  * execute
  //  * @param command the command to be executed
  //  * @param msg the Discord Message
  //  */
  // public execute(command: string, msg: Message) {

  // }

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

  public test(msg: Message, args: string[]): Promise<any> {
    return new Promise(async (resolve, reject) => {
      let db = new SqliteService();
      let newSettings: GuildSettings = {
        CmdChannel: '',
        discordPrefix: 'temp!',
        twitchChannels: ['hulkermon', 'hulkerbot'],
        twitchPrefix: '!',
      };
      db.setSettingsByGuildId(msg.guild?.id, newSettings).then(r => {
        console.log(r);
        resolve(r);
      }).catch(reject);
    });
  }
}