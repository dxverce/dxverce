const config = require('../../config.js');
const {
    MessageEmbed
} = require('discord.js');
const Discord = require('discord.js')
const prefix = config.discord.prefix;
const {
    errorEmbed,
    errorEmbed2
} = require('../../functions/error')
const {
    getProfile,
    getListing
} = require('../../functions/apiHandler')
const {
    generateTotp
} = require('../../functions/generateTotp')
const emojis = require('../../util/emojis.json')
const fs = require('fs')
const Canvas = require('canvas')
var sha1 = require('sha1');

async function compressImage(img, client) {
    try {
        const canvas = Canvas.createCanvas(512, 512)
        const ctx = canvas.getContext('2d')
        const image = await Canvas.loadImage(img)
        ctx.drawImage(image, 0, 0, 512, 512)
        const buffer = await canvas.toBuffer('image/jpeg')
        let att = new Discord.MessageAttachment(buffer, 'gameflip.png')
        const imgChannel = client.channels.cache.find(c=> c.id === '919202867909386260')
        let imgMsg = await imgChannel.send(att)
        let imgUrl = await imgMsg.attachments.first().url
        return imgUrl
    }catch(e) {
        console.log(e)
        return false
    }
}

module.exports = {
    name: 'import',
    description: 'Create a New Listing and Save.',
    category: 'gameflip',
    cooldown: 2,
    aliases: ['importlisting'],

    run: async (client, message, args) => {
        let msg
        try {
            let userFile = './users/'+message.author.id+'.json'
            if (!fs.existsSync(userFile)) return errorEmbed(message, 'You are not Logged In')

            let loading = new MessageEmbed()
            .setColor('RANDOM')
            .setDescription('Connecting to Gameflip '+emojis.loading)
            .setTimestamp()
            msg = await message.reply(loading)

            let userData = JSON.parse(fs.readFileSync(userFile))
            let key = userData.key
            let secret = userData.secret
            let listings = userData['listings']

            let profile = await getProfile(key, secret)
            if (!profile) return await errorEmbed2(msg, 'Sorry Your Saved Api Key/Secret is no more Valid , Please Relink your Account!')

            let listingUrl = args.join(" ")
            if (!listingUrl) return await errorEmbed2(msg ,`Provide a URL of Listing that you want to Import`)

            let split = listingUrl.split('/')
            let listingId = split[split.length - 1]
            if (!listingId) return await errorEmbed2(msg , `Provide a Valid URL of Listing that you want to Import`)

            let listingData = await getListing(key, secret, listingId)
            if (!listingData) return await errorEmbed2(`No Listing Found`, msg)

            let {
                description,
                name,
                price,
                photo
            } = listingData

            price = parseInt(price)/100

            let imageCover;
            let index = 0
            for (let i in photo) {
                if (i > 0) continue;
                imageCover = photo[i].view_url
                i ++
            }
            let imgUrl = await compressImage(imageCover, client)

            let embed = new MessageEmbed()
            .setColor('RANDOM')
            .setTimestamp()
            .setAuthor(message.author.username, message.author.avatarURL({
                dynamic: true
            }))
            .setFooter(message.author.id)
            .setThumbnail(profile.avatar)
            .setURL(`https://gameflip.com/profile/${profile.owner}`)
            .setTitle(profile.display_name)

            embed.addField('Listing Name', name, true)
            .addField('Listing Description', description, true)
            .addField('Listing Price', price, true)
            .setImage(imgUrl)

            let hash = sha1(Date.now())
            var obj = {}
            obj['name'] = name
            obj['description'] = description
            obj['price'] = price
            obj['image'] = imgUrl
            obj['isPosted'] = false
            listings[hash] = obj
            embed.setDescription('Successfully Saved Your Listing, Listing Id - '+hash)

            fs.writeFileSync(userFile, JSON.stringify(userData, null, 4))

            await msg.delete()
            await message.reply(embed)

        }catch(e) {
            return errorEmbed2(msg, e)
        }
    }
}