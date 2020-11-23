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
      pingMsg.channel.send(`pong!`).then(pongMsg => {
        let pingTime = pingMsg.createdTimestamp;
        let pongTime = pongMsg.createdTimestamp;
        let timeDelta = pongTime - pingTime;
        pongMsg.edit(`${pongMsg.content} \`${timeDelta}ms\``)
      }).catch(reject);
    });
  }
}