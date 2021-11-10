# About
This is something I was working for a private server to increase server activity, then I decided to make it compatible for public use. Now it's here!

## Installation

### _**Prerequisites**_

- Node 16.6 or higher (Install it [here](https://nodejs.org/en/))
- A discord bot account (Follow [this](https://dsharpplus.github.io/articles/basics/bot_account.html) guide to create a discord bot account, add it your server with **ADMINISTRATOR** permission)

### _**Downloading dependencies**_
- Install  this repository onto the device the bot is going to be hosted on.
- Run `npm install`.
- Open the `config.json` file and fill in all the details.
```json
{
    "important_settings": {
        "bot_token": "BOT TOKEN HERE",
        "guild_id": "GUILD ID HERE",
        "prefix": "-",
        "timezone": "List of timezones - https://www.php.net/manual/en/timezones.php",
        "weekly_event_start_day": "0-6",
        "weekly_event_end_day": "0-6",
        "vote_points": 2,
        "message_points": 0.2,
        "message_points_cooldown": true,
        "winners_announcement_channel": "CHANNEL ID HERE"
    },

    "optional_settings": {
        "staff_role_id": "ROLE ID HERE"
    }
}
```

- For `bot_token`, paste in your bot's token. You can find your bot's token in the Discord Developer Portal.
- For `guild_id`, paste in the ID of the server where you want the events to take place.
- For `prefix`, type in any prefix of your choice.
- For `timezone`, go through https://www.php.net/manual/en/timezones.php and select your timezone or a timezone with the same time as yours. The default timezone is Europe/London.
- For `weekly_event_start_date`, type in the day when you want the event to start weekly. Day must be given as 0 (Sunday), 1 (Monday), 2 (Tuesday), 3 (Wednesday), 4 (Thurday), 5 (Friday), or 6 (Saturday). For example;

```json
{
    "weekly_event_start_date": "0"
    // This will make the event start on Sunday 00:00 each week
}
```
- `weekly_event_end_day` is the same as `weekly_event_start_day`, but `weekly_event_end_day` determines what day the event should end weekly. This value should also be in 0-6.
- `vote_points` is the amount of points a user receives when someone votes for them.
- `message_points` is the amount of points a user receives when they send a message.
- `message_points_cooldown` can be changed to *true* or *false*. If set to true, there will be a
1-minute points cooldown before a user can receive points for the next message they send. If the value provided is detected as invalid, then it will default to **true**.
- `winner_announcement_channel` is the channel where the top 3 members are announced after the event ends.
- `staff_role_id` is an optional setting. It allows anyone with this role to add and remove points from a user and check how many points a user has. If no value is provided, then it will defalt to an ADMINISTRATOR-ONLY system.