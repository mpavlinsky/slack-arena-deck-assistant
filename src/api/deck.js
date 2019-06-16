import _ from 'lodash';
import querystring from 'querystring';
import request from 'superagent';
import { text, json, send, createError } from 'micro';

const cardDataRegex = /(\d+)\s+(.*)\s\(([A-Z0-9]+)\)\s+(\d+)$/;

// Each line of card data has three variableish lengthed strings: count, card name, and mana cost
// I don't know how to make tabs work in slack so thats why the order of those strings and the formatting is the way that it is
const manaSymbolSpaces = '      ';

export default async (req, res) => {
  try {
    const {
      text: commandText,
      user_name: userName,
      channel_id: channelId,
    } = querystring.parse(await text(req));

    const arenaCardSpecs = _.split(commandText, /\r?\n/);
    const [, deckName, firstCardSpec] = arenaCardSpecs[0].match(/([^\d]*)(.*)/);

    arenaCardSpecs[0] = firstCardSpec;

    const cardData = _.map(arenaCardSpecs, c => {
      const [, count, name, setId, collectorNumber] = c.match(cardDataRegex);
      return {
        count: Number(count),
        name,
        setId,
        collectorNumber: Number(collectorNumber),
      };
    });

    const scryfallCardData = await request
      .post('https://api.scryfall.com/cards/collection')
      .send({
        identifiers: _.map(cardData, c => ({
          name: c.name,
        })),
      }).then(r => r.body.data);


    const sortval = (c) =>
          (_.includes(c.types, 'land') && (
            (_.includes(c.types, 'basic') && 9000) ||
              90001)) ||
          c.cmc;

    let maxManaSymbols = 0;
    const cards = _(scryfallCardData)
          .map(d => {
            const cardValue = (valueName) => {
              if (valueName in d) {
                return d[valueName];
              }
              return d.card_faces[0][valueName];
            };

            let manaCosts = cardValue('mana_cost').split(' // ');
            manaCosts = _.map(manaCosts, mc => {
              return (
                mc.replace(/[^{}A-Za-z0-9]/g, '')
                  .match(/[0-9A-Za-z]+/g) || [])
                .map(mc => `:mana-${mc.toLowerCase()}:`)
                .join('');
            });

            const types = _(cardValue('type_line').split(/[^A-Za-z]/))
                  .filter()
                  .map(t => t.toLowerCase())
                  .value();

            return {
              inputData: _.find(cardData, cd => d.name.includes(cd.name)),
              name: d.name,
              manaSymbolsText: manaCosts.join(' // '),
              cmc: d.cmc,
              types,
              imageUri: cardValue('image_uris').normal,
            };
          })
          .sortBy(c => sortval(c))
          .value();

    const displayTypeSeive = [
      ['Lands', ['land']],
      ['Creatures', ['creature']],
      ['Planeswalkers', ['planeswalker']],
      ['Spells', ['instant', 'sorcery']],
      ['Enchantments', ['enchantment']],
    ];

    const displayBuckets = _.reduce(cards, (acc, c) => {
      let displayType = 'Other';
      _.each(displayTypeSeive, ([dt, matchedTypes]) => {
        if (_.intersection(c.types, matchedTypes).length) {
          displayType = dt;
          return false;
        }
        return true;
      });

      const dtAcc = acc[displayType] || [];
      dtAcc.push(c);
      acc[displayType] = dtAcc;
      return acc;
    }, {});

    const cardLineText = (c) => `${c.inputData.count} <${c.imageUri}|${c.name}> ${c.manaSymbolsText}`;

    const deckText = _.flatMap(displayBuckets, (cards, title) => {
      if (!cards.length) {
        return [];
      }

      const cardSum = _.sumBy(cards, c => c.inputData.count);

      return [{
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*${title} (${cardSum})*`,
        },
      }, {
        type: 'divider'
      }, {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: _.join(_.map(cards, c => cardLineText(c)), '\n'),
        },
      }];
    });

    deckText.unshift({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*_${deckName || 'untitled'}_ by @${userName}* (${_.sumBy(cards, c => c.inputData.count)} Cards Total)`,
      },
    });

    send(res, 200, {
      response_type: 'in_channel',
      blocks: deckText,
    });
  } catch (e) {
    console.error('e: ' + require('util').inspect(e, null, 5));
  }
};
