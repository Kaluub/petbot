const locale = require('../locale/text.js');
const Item = require('../items/item.js');
const eventinfo = require('../events/events.json');
const {tradingUsers} = require('../commands/trade.js');

module.exports = {
    name: 'buy',
    syntax: '/buy [item name]',
    admin: false,
    async execute(message,args,db){
        if(tradingUsers[message.author.id]) return message.channel.send(locale.text({lang:db.lang,msg:"in_trade"}));
        if(!args[0]) return message.channel.send(locale.text({lang:db.lang,msg:"syntax_error"})+this.syntax);

        let item = await Item.searchItemByName({args:args});
        if(!item) return message.channel.send(locale.text({lang:db.lang,msg:"item_not_found"}));

        if(!item.purchaseable) return message.channel.send(locale.text({lang:db.lang,msg:"item_not_purchaseable"}));
        if(item.startTime && item.startTime > Date.now()) return message.channel.send(locale.text({lang:db.lang,msg:"item_not_found"}));
        if(item.endTime && item.endTime < Date.now()) return message.channel.send(locale.text({lang:db.lang,msg:"item_limited"}));
        if(item.event){
            let event = eventinfo.events[item.event];
            if(event.startTime > Date.now()) return message.channel.send(locale.text({lang:db.lang,msg:"item_not_found"}));
            if(event.endTime < Date.now()) return message.channel.send(locale.text({lang:db.lang,msg:"item_limited"}));
        };

        let userpets = await db.petsdb.get(message.author.id);

        if(userpets.tokens.count < Math.floor(item.price)) return message.channel.send(locale.text({lang:db.lang,msg:"no_tokens"}));
        userpets.tokens.count -= Math.floor(item.price);

        if(!userpets.stats.itemsBought) userpets.stats.itemsBought = 0;
        userpets.stats.itemsBought += 1;

        userpets = await Item.giveItem({id:item.id,userpets:userpets});
        await db.petsdb.set(message.author.id,userpets);

        return message.channel.send(locale.text({lang:db.lang,msg:"bought_item"})+`${item.displayName}.`);
    }
};