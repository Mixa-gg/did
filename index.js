require('dotenv').config()

const Discord = require('discord.js');
const ytdl = require('ytdl-core');
const YouTube = require('simple-youtube-api');
const { title } = require('process');
const client = new Discord.Client({ disableEveryone: true });
const PREFIX = '>';

const youtube = new YouTube(process.env.GOOGLE_API_KEY)

const queue =  new Map()


client.on('ready', () => { 
    console.log(`Ulogovan kao: ${client.user.tag}!`);
    client.user.setActivity('Harmonika ', { type: 'PLAYING' });
      });

client.on('message', async message =>{
    if(message.author.bot) return
    if(!message.content.startsWith(PREFIX)) return
    console.log(`${message.author.tag}: ${message.content}`);

    const args = message.content.substring(PREFIX.length).split(" ")
    const searchString = args.slice(1).join(' ')
    const url = args[1] ? args[1].replace(/<(._)>/g, '$1') : ""
    const serverQueue = queue.get(message.guild.id)

    if(message.content.startsWith(`${PREFIX}play`)){
        const voiceChannel = message.member.voice.channel
        if(!voiceChannel) return message.channel.send("Moras u voicu da budes")
        
        try {
            var video = await youtube.getVideoByID(url)
        } catch{
            try {
                var videos = await youtube.searchVideos(searchString, 1)
                var video = await youtube.getChannelByID(videos[0].id)
            }catch{
                return message.channel.send("Nema rezultata za taj video !")
            }
        }
        
        
        const song = {
            id: video.id,
            title: Discord.Util.escapeMarkdown.video.title,
            url: `https://www.youtube.com/watch?v=${video.id}`
        }

        
        
        
        if(!serverQueue){
            const queueConstruct ={
                textChannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                playing: true
            }
            queue.set(message.guild.id, queueConstruct)

            queueConstruct.songs.push(song)
        
            try{
                var connection = await voiceChannel.join()
                queueConstruct.connection = connection
                play(message.guild, queueConstruct.songs[0])
            } catch (error){
                console.log(`error neki ${error}`)
                queue.delete(message.guild.id)
                return message.channel.send(`neka greska ${error}`)
            }
        
        }else{
            serverQueue.songs.push(song)
            return message.channel.send(`**${song.title}** je dodato na listu`)
        }
       return undefined



        
    } else if (message.content.startsWith(`${PREFIX}stop`)){
        if(!message.member.voice.channel) return message.channel.send("moras da budes u voicu")
       if(!serverQueue) return message.channel.send('nista nisi pustio')
       serverQueue.songs = []
       serverQueue.connection.dispatcher.end()
       message.channel.send("Muzika je zaustavljena")
        return undefined
        
    }else if (message.content.startsWith(`${PREFIX}skip`)){
        if(!message.member.voice.channel) return message.channel.send('Moras da budes u voicu')
    if(!serverQueue) return message.channel.send('Nista se ne pusta')
    serverQueue.connection.dispatcher.end()
    message.channel.send('Preskocio sam tu pesmu')
    return undefined
    }else if (message.content.startsWith(`${PREFIX}zvuk`)) {
        if(!message.member.voice.channel) return message.channel.send('Moras da budes u voicu!')
        if(!serverQueue) return message.channel.send('Nista se ne pusta')
        if(!args[1]) return message.channel.send(`Glasnoca muzike je ${serverQueue.volume}`)
        if(isNaN(args[1])) return message.channel.send('Ne postojeci broj probaj od 1 do 5!')
        serverQueue.volume = args[1]
        serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1]/ 5)
        message.channel.send(`Promenio sam glasnocu muzike na **${args[1]}**`)
        return undefined
    } else if (message.content.startsWith(`${PREFIX}np`)){
        if(!serverQueue) return message.channel.send('Nista se sada ne pusta')
        message.channel.send(`Sada se pusta: **${serverQueue.songs[0].title}**`)
        return undefined
    } else if (message.content.startsWith(`${PREFIX}queue`)){
        if(!serverQueue) return message.channel.send("Trenutno se nista ne pusta")
        message.channel.send(`
        __**Narucene Pesme**__
        ${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}
        
        **Sada se pusta** ${serverQueue.songs[0].title}
        `, { split: true })
        return undefined
    } else if (message.content.startsWith(`${PREFIX}pauza`)){
        if(!message.member.voice.channel) return message.channel.send("Moras da budes u voicu ")
        if(!serverQueue) return message.channel.send("Trenutno se nista ne pusta")
        if(!serverQueue.playing) return message.channel.send("Muzika je vec paziranja")
        serverQueue.playing = false
        serverQueue.connection.dispatcher.pause()
        message.channel.send("Muzika je pauzirana")
        return undefined
    }else if (message.content.startsWith(`${PREFIX}nastavi`)){
        if(!message.member.voice.channel) return message.channel.send("Moras da bdes u voicu!")
        if(!serverQueue) return message.channel.send("Trenutno se nista ne pusta")
        if(!serverQueue.playing) return message.channel.send("Muzika se vec pusta")
        serverQueue.playing = true
        serverQueue.connection.dispatcher.resume()
        message.channel.send("Muzika je uspesno pustena")
        return undefined
    }

})


function play(guild,song) {
 const serverQueue = queue.get(guild.id)

 if(!song){
     serverQueue.voiceChannel.leave()
     queue.delete(guild.id)
     return
 }
 console.log(song)

 const dispatcher = serverQueue.connection.play(ytdl(song.url))
 .on('finish', () => {
    serverQueue.songs.shift()
    play(guild, serverQueue.songs[0])
 })
 .on('error', error =>{
     console.log(error)
 })
 dispatcher.setVolumeLogarithmic( serverQueue.volume/ 5)

 serverQueue.textChannel.send(`Pusta se **${song.title}**`)
}


client.login('epic token')
