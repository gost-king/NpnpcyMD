/**
 * Hello There!
 * GitHub: @mrsyasptr
 * Replit: @mrsyasptr
 * InstaGram: @mrsyasptr_
 */
import { useMultiFileAuthState, DisconnectReason } from "@whiskeysockets/baileys"
import { importCommands, decodeJid } from "./lib/Utility.js"
import { reacts, config, db } from "./config.js"
import { Boom } from "@hapi/boom"
import makeWASocket from "./lib/baileys/SetupSocket.js"
import serialize from "./lib/baileys/MSerializer.js"
import handler from "./handler.js"
import P from "pino"
import fs from "fs"

async function connect() {

	// Pembuatan Class Baileys
	importCommands(config.path.commands)
	const { state, saveCreds } = await useMultiFileAuthState(config.path.baileys_session)
	const sock = makeWASocket({
		logger: P({ level: "silent" }),
		printQRInTerminal: true,
		generateHighQualityLinkPreview: true,
		defaultQueryTimeoutMs: 0,
		links: config.links,
		auth: state,
		reacts
	})

	// Event Listener
	sock.ev.process(
		async(events) => {

			// Koneksi (qr, open, close, ...etc)
			if(events["connection.update"]) {
				const { lastDisconnect, connection } = events["connection.update"]
				if(connection === "close") {
					if (new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut) {
						connect()
					} else {
						console.log("Connection closed. You are logged out.")
					}
				} else if(connection === "open") {
					console.log("Bot Information:", {
						bot_name: config.bot.name,
						contact: {
							jid: decodeJid(sock.user.id),
							id: sock.user.id,
							name: sock.user.name
						},
						owner: config.owner
					})
				}
			}

			// Penerima Pesan
			if(events["messages.upsert"]) {
				const { type, messages } = events["messages.upsert"]
				if (type === "notify") {
					const m = serialize(sock, messages[0])
					if (m.key && m.key.remoteJid == "status@broadcast") return
					if (!m.message) return
					if (m.isBaileys) return
					handler(sock, m)
				}
			}

			// Panggilan/Telepon
			if(events["call"]) {
				events["call"].forEach(({ from, id, status}) => {
					if (status === "offer" && config.settings.reject_call) {
						sock.rejectCall(id, from)
					}
				})
			}

			// Session (Kredensial)
			if(events["creds.update"]) {
				await saveCreds()
			}

		}
	)
}

connect()