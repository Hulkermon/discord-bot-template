import { GuildSettings, SqliteService } from './sqliteService';
import { Message } from "discord.js";

export class DiscordCommandsService {
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
      db.setData(msg.guild?.id, args[0], args.slice(1).join(' ')).then(res => {
        msg.channel.send(res).then(resolve).catch(reject);
      }).catch(reject);
    });
  }
}