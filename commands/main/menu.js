import { formatMilliseconds } from "../../lib/Time.js"
import { addCommand } from "../../lib/Commands.js"
import { getFolderName } from "../../lib/Helper.js"
import { db } from "../../config.js"
import fs from "fs"

addCommand({
	on: "cmd",
	pattern: "menu",
	category: getFolderName(import.meta),
}, async (conn, m, { prefix, commands, localHit, globalHit }) => {
	const menu = {}

	commands
		.filter((item) => item !== undefined && item.category !== undefined && item.display !== "")
		.forEach(({ display, category, pattern, noPrefix }) => {
			if (!menu[category]) {
				menu[category] = []
			}
			if (noPrefix === false) {
				menu[category].push(
					...(display === "all" ? pattern.map((pattern) => `${prefix+pattern}`) : [`${prefix+display}`])
				)
			} else if (noPrefix === true) {
				menu[category].push(
					...(display === "all" ? pattern : [display])
				)
			}
		})

	let cmdArray = []
	for(let key in menu) {
		cmdArray.push(...menu[key])
	}

	let text = `Halo!\n@${m.sender.split("@")[0]}\n\n`
		text += "╭ *Server*\n"
		text += `│ ◈ *Platform:* ${process.platform}\n`
		text += `│ ◈ *Arch:* ${process.arch}\n`
		text += `│ ◈ *App-Type:* NodeJS ${process.version}\n`
		text += "│ ◈ *WA-Module:* Baileys\n"
		text += `│ ◈ *Runtime:* ${formatMilliseconds(Date.now() - db.runtime)}\n`
		text += `│ ◈ *Branch:* development\n`
		text += "╰─────┈┈\n\n"

	Object.keys(menu).forEach(category => {
		text += `*${category.charAt(0).toUpperCase() + category.slice(1)}-Menu*\n`
		menu[category].forEach(item => {
			text += ` │  ${item}\n`
		})
		text += " ╰─┈\n\n"
	})

	conn.sendExternalReply(m.chat, {
		text,
		mentions: ["6285977594466@s.whatsapp.net"],
		title: m.pushName,
		url: "#RANDOM#",
		type: "small",
		thumbnail: await conn.getProfilePicture(m.sender, "buffer", "high"),
	})

})