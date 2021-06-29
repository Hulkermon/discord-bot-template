import { Bot } from "./bot";

let bot = new Bot();

export const rejectStatuses = {
  canceled: 'canceled',
  timedOut: 'timedOut',
  silent: 'silent',
  notFound: 'notFound',
  insufficientPoints: 'insufficientPoints',
  maxBetReached: 'maxBetReached',
  minBetNotReaced: 'minBetNotReaced',
  itemAlreadyExists: 'itemAlreadyExists',
}

main();


function main() {
  bot.start().catch(e => {
    console.error('Unhandled Bot Error:', e);
  });
}
