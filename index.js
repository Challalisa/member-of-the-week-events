const { Client, MessageEmbed } = require('discord.js');
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const db = require('quick.db');
const CronJob = require('cron').CronJob;
const colors = require('colors');
const members = new db.table("members");
const config = new db.table("config");
const settings = require('./config.json');
let errors;
let timezone;
const userSpoke = new Set();

// PRE-EXECUTUON CHECKLIST
const checker = (async () => {
    console.log("✔ Token Validated!".green);
    let guild;
    await client.guilds.fetch(settings.important_settings.guild_id)
        .then(() => {
            guild = true;
            errors = "NO"
            console.log("✔ Guild ID Validated!".green);
        }).catch(() => {
            client.destroy();
            console.log("Invalid guild ID. Are you sure the bot is in the server whose ID you provided?\nShutting down...".red);
            process.exit(1);
        });

    await client.channels.fetch(settings.important_settings.winners_announcement_channel)
        .then(() => {
            errors = errors + "NE"
            console.log("✔ Announcement Channel ID Validated!".green);
        }).catch(() => {
            client.destroy();
            console.log("Invalid channel ID. Please correct it in config.json.\nShutting down...".red);
            process.exit(1);
        });

    if (settings.important_settings.prefix === "") {
        console.log("Please provide a prefix for the bot!\nShutting down".red)
        process.exit(1);
    } else {
        errors = errors + "AT"
        console.log(`✔ Using prefix "${settings.important_settings.prefix}"!`.green);
    }



    try {
        const tzchecker = new CronJob(`* * * * * *`, function () {
            timezone = "valid";
            console.log("✔ Timezone Validated!".green);
            tzchecker.stop();
        }, null, true, settings.important_settings.timezone);
    } catch (err) {
        console.log("Invalid Timezone! Defaulting to London's timezone (Europe/London)...".red);
    }

    if (guild === true) {
        const g = await client.guilds.fetch(settings.important_settings.guild_id);
        if (!g.me.permissions.has("ADMINISTRATOR")) {
            console.log("Missing permissions! Please add the ADMINISTRATOR permission to my bot so I can work efficiently.\nShutting down...".red);
            process.exit(1);
        }
    }

    if (settings.optional_settings.staff_role_id !== "") {
        if (guild == true) {
            const g = await client.guilds.fetch(settings.important_settings.guild_id);
            await g.roles.fetch(settings.optional_settings.staff_role_id)
                .then((res) => {
                    if (res == null) {
                        console.log("Invalid Role ID. Please correct it in config.json. Defaulting to ADMIN-ONLY system...".red);
                    } else {
                        console.log("✔ Staff Role ID Validated!".green);
                    }
                }).catch((err) => {
                    console.log(err);
                    console.log("An error occured while validating staff role ID! Defaulting to ADMIN-ONLY system...".red);
                });
        }
    } else {
        console.log("Staff role ID was not provided. Skipping...".blue)
    }

    if (errors === "NONEAT") {
        console.log("✔ Bot started successfully!".green)
    }
});

// FUNCTIONS
const embeds = (color, description) => {
    const embed = new MessageEmbed()
        .setDescription(description)
        .setColor(`${color}`);
    return embed;
}

// CRON JOBS

const job1 = new CronJob(`0 0 * * * ${settings.important_settings.weekly_event_start_day}`, function () {
    if (errors !== "NONEAT") return;
    if (!config.get(`${settings.important_settings.guild_id}`)) {
        config.set(`${settings.important_settings.guild_id}.status`, true);
    }
    config.set(`${settings.important_settings.guild_id}.status`, true);
}, null, true, (timezone === "valid") ? settings.important_settings.timezone : "Europe/London");

job1.start();

const job2 = new CronJob(`0 0 * * * ${settings.important_settings.weekly_event_end_day}`, async function () {
    if (errors !== "NONEAT") return;
    config.set(`${settings.important_settings.guild_id}.status`, false);
    const channel = await client.channels.fetch(settings.important_settings.winners_announcement_channel);
    let list = '';
    const contestants = await members.all();
    contestants.sort(function (a, b) {
        return (a.data.vote_points + a.data.message_points) - (b.data.vote_points + b.data.message_points);
    });
    contestants.reverse();
    const final = contestants.slice(0, 3);
    final.forEach((m) => {
        const points = m.data.message_points + m.data.vote_points + m.data.credited_points;
        list = list.concat(`• <@${m.data.member_id}> **(${m.data.member_name}#${m.data.member_discriminator})** with ***${((points) % 1 != 0) ? points.toFixed(2) : points}*** ${((points % 1 == 1)) ? "point" : "points"}\n`)
    });
    const embed = new MessageEmbed()
        .setTitle("Top 3 members of the week!")
        .setDescription(list)
        .setColor("87CEFA")
        .setTimestamp();
    channel.send({ embeds: [embed] });
}, null, true, (timezone === "valid") ? settings.important_settings.timezone : "Europe/London");

job2.start();

client.on('messageCreate', async msg => {
    if (msg.author.bot) return;
    if (!config.get(`${settings.important_settings.guild_id}.status`)) return;


    const m = await members.get(msg.author.id);
    if (!m) {
        await members.set(msg.author.id,
            {
                member_id: msg.author.id,
                member_name: msg.author.username,
                member_discriminator: msg.author.discriminator,
                votes: 0,
                voted: false,
                vote_points: 0,
                message_points: settings.important_settings.message_points,
                credited_points: 0,
                messages: 1,
                mow_wins: 0,
                mom_wins: 0,
                mow_first_wins_streak: 0,
                mom_first_wins_streak: 0
            }
        )
    } else {
        if (settings.important_settings.message_points_cooldown === false) {
            members.add(`${msg.author.id}.messages`, 1);
            members.add(`${msg.author.id}.message_points`, (settings.important_settings.message_points).toFixed(2));
        } else if (settings.important_settings.message_points_cooldown === true || typeof settings.important_settings.message_points_cooldown !== "boolean") {
            if (!userSpoke.has(msg.author.id)) {
                userSpoke.add(msg.author.id);

                members.add(`${msg.author.id}.messages`, 1);
                members.add(`${msg.author.id}.message_points`, (settings.important_settings.message_points).toFixed(2));

                setTimeout(() => {
                    userSpoke.delete(msg.author.id);
                }, 60000);
            }
        }
    }

    const args = msg.content.trim().split(/ +/g);
    const cmd = args[0].slice(settings.important_settings.prefix.length).toLowerCase();

    if (cmd === "vote") {
        if (members.get(`${msg.author.id}.voted`)) return msg.reply({ embeds: [embeds("FF0000", ":x:  You have already voted for someone this week!")] })
        if (!args[1]) {
            msg.reply({ embeds: [embeds("FF0000", ":x:  -vote <Member ID/Mention>")] });
        } else {
            const str = args[1];
            const memberID = str.replace(/[<@!>]/g, "")
            const member = await msg.guild.members.cache.get(memberID);
            if (!member) {
                msg.reply({ embeds: [embeds("FF0000", ":x:  User was not found in this server!")] });
            } else {
                if (memberID === msg.author.id) return msg.reply({ embeds: [embeds("FF0000", ":x:  Nice try :eyes:")] });
                if (member.user.bot) return msg.reply({ embeds: [embeds("FF0000", ":x:  Can't vote for non-human things mate.")] })
                const m = await members.get(memberID);
                if (!m) {
                    msg.reply({ embeds: [embeds("FF0000", ":x:  This user has sent no messages during this week!")] })
                } else {
                    members.set(`${msg.author.id}.voted`, true);
                    members.add(`${memberID}.votes`, 1);
                    members.add(`${memberID}.vote_points`, (2).toFixed(2));
                    msg.reply({ embeds: [embeds("32CD32", ":white_check_mark:  Thank you for your vote!")] })
                }
            }
        }
    } else if (cmd === "end") {
        if (!msg.member.permissions.has("ADMINISTRATOR")) return;
        const channel = await msg.guild.channels.fetch(settings.important_settings.winners_announcement_channel);
        let list = '';
        const contestants = await members.all();
        contestants.sort(function (a, b) {
            return (a.data.vote_points + a.data.message_points + a.data.credited_points) - (b.data.vote_points + b.data.message_points + b.data.credited_points);
        });
        contestants.reverse();
        const final = contestants.slice(0, 3);
        final.forEach((m) => {
            const points = m.data.message_points + m.data.vote_points + m.data.credited_points;
            list = list.concat(`• <@${m.data.member_id}> **(${m.data.member_name}#${m.data.member_discriminator})** with ***${((points) % 1 != 0) ? points.toFixed(2) : points}*** ${((points % 1 == 1)) ? "point" : "points"}\n`)
        });
        const embed = new MessageEmbed()
            .setTitle("Top 3 members of the week!")
            .setDescription(list)
            .setColor("87CEFA")
            .setTimestamp();
        channel.send({ embeds: [embed] });
    } else if (cmd === "points") {
        if (msg.member.roles.cache.find(r => r.id === settings.optional_settings.staff_role_id) || msg.member.permissions.has("ADMINISTRATOR")) {
            if (args[1]) {
                if (msg.member.permissions.has("ADMINISTRATOR")) {
                    if (args[1] === "add") {
                        if (!args[2] || !args[3]) return msg.reply({ embeds: [embeds("FF0000", ":x:  -points add/remove <Member ID/Mention>")] });
                        const str = args[2];
                        const memberID = str.replace(/[<@!>]/g, "")
                        const member = await msg.guild.members.cache.get(memberID);
                        if (!member) {
                            return msg.reply({ embeds: [embeds("FF0000", ":x:  User was not found in this server!")] });
                        } else {
                            if (member.user.bot) return msg.reply({ embeds: [embeds("FF0000", ":x:  Mate, that's a bot.")] })
                            const m = await members.get(memberID);
                            if (!m) {
                                return msg.reply({ embeds: [embeds("FF0000", ":x:  This user is not a contestant because they haven't sent any messages this week!")] })
                            } else {
                                if (args[3]) {
                                    const points = parseInt(args[3]);
                                    if (isNaN(points)) return msg.reply({ embeds: [embeds("FF0000", ":x:  Please provide a valid number!")] });
                                    await members.add(`${memberID}.credited_points`, points);
                                    return msg.reply({ embeds: [embeds("32CD32", `:white_check_mark:  Credited ${member.user.username}#${member.user.discriminator} with **${points}** points!`)] })
                                }
                            }
                        }
                    } else if (args[1] === "remove") {
                        if (!args[2] || !args[3]) return msg.reply({ embeds: [embeds("FF0000", ":x:  -points add/remove <Member ID/Mention>")] });
                        const str = args[2];
                        const memberID = str.replace(/[<@!>]/g, "")
                        const member = await msg.guild.members.cache.get(memberID);
                        if (!member) {
                            return msg.reply({ embeds: [embeds("FF0000", ":x:  User was not found in this server!")] });
                        } else {
                            if (member.user.bot) return msg.reply({ embeds: [embeds("FF0000", ":x:  Mate, that's a bot.")] })
                            const m = await members.get(memberID);
                            if (!m) {
                                return msg.reply({ embeds: [embeds("FF00`00", ":x:  This user is not a contestant because they haven't sent any messages this week!")] })
                            } else {
                                if (args[3]) {
                                    const points = parseInt(args[3]);
                                    if (isNaN(points)) return msg.reply({ embeds: [embeds("FF0000", ":x:  Please provide a valid number!")] });
                                    await members.subtract(`${memberID}.credited_points`, points);
                                    return msg.reply({ embeds: [embeds("32CD32", `:white_check_mark:  Removed **${points}** points from **${member.user.username}#${member.user.discriminator}**!`)] })
                                }
                            }
                        }
                    }
                } else {
                    const str = args[1];
                    const memberID = str.replace(/[<@!>]/g, "")
                    const member = await msg.guild.members.cache.get(memberID);
                    if (!member) {
                        return msg.reply({ embeds: [embeds("FF0000", ":x:  User was not found in this server!")] });
                    } else {
                        if (member.user.bot) return msg.reply({ embeds: [embeds("FF0000", ":x:  Mate, that's a bot.")] })
                        const m = await members.get(memberID);
                        if (!m) {
                            return msg.reply({ embeds: [embeds("FF0000", ":x:  This user is not a contestant because they haven't sent any messages this week!")] })
                        }
                        return msg.reply({ embeds: [embeds("87CEFA", `:diamond_shape_with_a_dot_inside: **This member *(${member.user.username})* has ${((m.message_points + m.credited_points) % 1 != 0) ? (m.message_points + m.credited_points).toFixed(2) : m.message_points + m.credited_points}** points\n\n*This score does not take vote points into consideration. The final score with vote points will be calculated just before we announce the top members of the week/month!*`)] });
                    }
                }
            }
        }
        const my = await members.get(msg.author.id);
        msg.reply({ embeds: [embeds("87CEFA", `:diamond_shape_with_a_dot_inside: **${((my.message_points + my.credited_points) % 1 != 0) ? (my.message_points + my.credited_points).toFixed(2) : my.message_points + my.credited_points}** points\n\n*This score does not take vote points into consideration. The final score with vote points will be calculated just before we announce the top members of the week/month!*`)] })
    }
});

client.login(settings.important_settings.bot_token)
    .then(() => {
        checker();
    }).catch((err) => {
        if (err) {
            if (err.message.includes("An invalid token was provided")) {
                console.log("The bot token is invalid!".red);
                process.exit(1)
            } else {
                console.log("Please try again later. If the problem persists, open an issue at out github.".red);
            }
        }
    });