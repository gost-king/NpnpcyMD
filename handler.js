import { decodeJid, isEmpty, isSameThing, readmore } from "./lib/Utility.js"
import { config, db } from "./config.js"
import { commands } from "./lib/Commands.js"
import path from "path"
import fs from "fs"

export default async function handler(conn, m) {

	console.log(m)

	// ------ Deklarasi
	const prefixRegex = new RegExp(config.settings.prefix)
	const prefix = m.text.match(prefixRegex) ? m.text.match(prefixRegex)[0] : ""
	const firstWord = m.text.split(" ")[0]
	const cmdName = prefixRegex.test(m.text) ? firstWord.replace(prefixRegex, "") : ""
	const botNumber = decodeJid(conn.user.id)

	// ------ Pemeriksa
	const isCmd = commands.some((cmd) => cmd.on === "text" ? false : cmd.noPrefix === true ? isSameThing(cmd.pattern, firstWord) : isSameThing(cmd.pattern, cmdName))
	const cmd = commands.find((cmd) => cmd.on && (isCmd && ((cmd.noPrefix === true && isSameThing(cmd.pattern, firstWord)) || (cmd.on === "cmd" && isSameThing(cmd.pattern, cmdName)))) || (!isCmd && cmd.on === "text" && m))

	// ------ Percabangan
	if (isCmd && cmd.on === "cmd") {
		executeCommand()
	} else if (!isCmd && cmd && cmd.on === "text") {
		executeCommand()
	}

	function executeCommand() {
		cmd.execute(conn, m, {
			cmdName: firstWord,
			prefix,
			command: cmd,
			readmore,
			args: isCmd ? m.text.split(" ").slice(1) : m.text.split(" "),
			input: isCmd ? m.text.split(" ").slice(1).join(" ") : m.text,
			commands
		})
	}
}