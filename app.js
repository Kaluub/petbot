// Setting up the bot for the first time: Please read the README.md file included in this directory.

// Define variables:
const { Client, MessageEmbed } = require('discord.js');
const client = new Client();
const config = require('./private/config.json');
const text = require('./locale/text.js');
const Pet = require('./pets/pet');
const Data = require('./data.js');
const petinfo = require('./pets/pets.json');
const commands = require('./commands.js');
const eventinfo = require('./events/events.json');
const prefix = `/`;

// Start database:
const Keyv = require('keyv');
const maindb = new Keyv('sqlite://private/data/main.sqlite');
const petsdb = new Keyv('sqlite://private/data/pets.sqlite');

// Knowledge of when the bot is fully started:
client.on('ready', () => {
    console.log('Bot started.');
});

// Handle messages:
client.on('message', async (message) => {
    // Ignore other bots and self:
    if(message.author.bot) return;
    // Load pet data for user, if inexistent set to defaults, if outdated fix it:
    let userpets = await petsdb.get(message.author.id);
    if(!userpets)
        await petsdb.set(message.author.id, new Data('pets',{}));
        userpets = await petsdb.get(message.author.id);
    if(!userpets.version || userpets.version < 1)
        await petsdb.set(message.author.id, Data.updateData('pets',userpets));
        userpets = await petsdb.get(message.author.id);
    // Main settings for the user
    let usersettings = await maindb.get(message.author.id);
    if(!usersettings)
        await maindb.set(message.author.id,new Data('main',{}));
        usersettings = await maindb.get(message.author.id);
    if(!usersettings.version || usersettings.version < 1)
        await maindb.set(message.author.id, Data.updateData('main',usersettings));
        usersettings = await maindb.get(message.author.id);
    // Active pet training:
    if(userpets.activePet && !message.content.startsWith(prefix)){
        let pet = userpets.pets[userpets.activePet];
        if(!pet){
            userpets.activePet = null;
            await petsdb.set(message.author.id,userpets);
        } else {
            if(userpets.petMessageCooldown <= Date.now() && pet.level < 10){
                pet.exp += 1;
                if(pet.exp >= petinfo.req.base[pet.level]*petinfo.req[petinfo.pets[pet.id].rarity] && pet.level < 10){
                    pet.level += 1;
                    pet.exp = 0;
                };
                if(pet.level > 9 && petinfo.pets[pet.id].evolution){
                    try{
                        let res = Pet.evolvePet(pet);
                        if(userpets[res.id]) throw null;
                        if(res !== null){
                            let oldPet = pet;
                            delete userpets.pet[activePet];
                            userpets.activePet = res.id;
                            pet = res;
                            let notification = new MessageEmbed()
                                .setColor('#0000FF')
                                .setTitle(`Pet Evolution: ${petinfo.pets[pet.id].displayName}`)
                                .attachFiles([`./pets/sprites/${petinfo.pets[pet.id].sprite}`])
                                .setImage(`attachment://${petstpetinfo.pets[pet.id].sprite}`)
                                .setDescription(`Your old pet ${petinfo.pets[oldPet.id].displayName} evolved! It has become ${petinfo.pets[pet.id].displayName}.`)
                            message.channel.send(notification);
                        };
                    } catch(error){
                        return;
                    };
                };
                userpets.pets[userpets.activePet] = pet;
                userpets.petMessageCooldown = Date.now() + 10000;
                await petsdb.set(message.author.id,userpets);
            };
        };
        return;
    };

    // Command handling
    const args = message.content.slice(prefix.length).split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = commands.get(commandName) || commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    if(!command) return;
    if(command.admin && !config.admins.includes(message.author.id)) return message.channel.send(text.text({lang:usersettings.lang,msg:'no_admin'}));
    if(command.event){
        let event = eventinfo.events[command.event];
        if(event.startTime > Date.now()) return message.channel.send(text.text({lang:usersettings.lang,msg:'command_not_available'}));
        if(event.endTime < Date.now()) return message.channel.send(text.text({lang:usersettings.lang,msg:'command_not_available'}));
    };
    try{
        command.execute(message,args,{maindb:maindb,petsdb:petsdb,lang:usersettings.lang,commands:commands});
    } catch(error){
        console.error(error);
        return message.channel.send(text.text({lang:usersettings.lang,msg:'unknown_error'}));
    };
    if(!userpets.stats.commandsUsed) userpets.stats.commandsUsed = 0;
    userpets.stats.commandsUsed += 1;
    await petsdb.set(message.author.id,userpets);
});

// Logging in. Make sure to set up './private/config.json' to be able to use a token.
client.login(config.token);