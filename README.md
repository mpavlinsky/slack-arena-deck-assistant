# slack-arena-deck-assistant
Paste your exported Magic Arena decklist into Slack and have it paired with rich data from Scryfall (image links, mana symbols, types) and formatted for easy reading

![Screenshot](https://github.com/mpavlinsky/slack-arena-deck-assistant/blob/master/screenshot.png)

## API
Currently responds to one command:
`/deck [deck_name] pasted_arena_decklist`

- Matches each card to scryfall to get rich data
- Sorts each card into broad categories similiar to other deck views
- Posts a mediocrely formatted decklist to the channel where the command originated with card types, image links, and mana costs

## Deployment
I have some version currently deployed at https://slack-arena-deck-assistant.mpavlinsky.now.sh/api/deck.js and you are welcome to use that with no guarantees if you would like to skip source deployment.

### Source
The deployment is currently based on the zeit now platform and micro. It should be trivial to factor the function out into whatever interface your serverless hosting provider allows.

### Slack App
For the time being you need to make a new development slack app by following the instructions at https://api.slack.com/apps?new_app=1 and then linking a slash command to the URL you deployed to.

## Dependencies
This bot responds with mana symbols in the Scryfall "Manamoji" format. Follow installation instructions at https://scryfall.com/docs/slack-bot


## License
MIT
