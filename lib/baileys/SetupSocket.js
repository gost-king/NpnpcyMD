const {
	default: waSock,
	proto,
	generateForwardMessageContent,
	generateWAMessageFromContent,
	downloadContentFromMessage
} = (await import("@whiskeysockets/baileys")).default
import { decodeJid, fetchDataFromPath, getRandomString, parseMention, sleep, getRandom } from "../Utility.js"
import { getTempDir } from "../Helper.js"
import { getBuffer } from "../Fetcher.js"
import { config } from "../../config.js"
import fetch from "node-fetch"
import fs from "fs"

/**
 * Create WhatsApp socket connection - Creates a WhatsApp socket connection with the provided options.
 * @param {Object} opts - Options for the WhatsApp socket connection.
 * @returns {Object} - The WhatsApp socket connection object.
 */
export default function makeWASocket(opts) {
	let conn = waSock(opts)

	conn.getProfilePicture = async(jid, type = "url", quality = "high") => {
		const pictQuality = quality && ["high","low"].includes(quality) ? quality : "low"
		quality = pictQuality === "high" ? "image" : ""
		const thumbURL = await conn.profilePictureUrl(jid, quality)
		const buffer = await getBuffer(thumbURL)
		return type === "url" ?
			thumbURL : type === "buffer" ?
				buffer : thumbURL
	}

	conn.sendExternalReply = async(jid, message, m) => {
		let largeThumbnail = message.type && ["large","small"].includes(message.type) ? message.type : false
		message = {
			text: message.text ? message.text : "",
			title: message.title ? message.title : config.bot.name,
			body: message.body ? message.body : config.bot.description,
			mediaType: largeThumbnail === "large" ? 1 : 0,
			thumbnail: message.thumbnail ? message.thumbnail : await conn.getProfilePicture(jid, "buffer"),
			url: message.url && message.url === "#RANDOM#" ? getRandom(opts.links) : message.url,
			type: largeThumbnail === "large" ? true : false,
			mentions: message.mentions && Array.isArray(message.mentions) ? message.mentions : []
		}
		return conn.sendMessage(jid, {
			text: message.text,
			contextInfo: {
				mentionedJid: message.mentions,
				externalAdReply: {
					title: message.title,
					body: message.body,
					mediaType: message.mediaType,
					thumbnail: message.thumbnail,
					sourceUrl: message.url,
					renderLargerThumbnail: message.type
				}
			}
		}, m)
	}

	conn.editMessage = (jid, editObject, key) => {
		if (!key.fromMe) throw new Error("Error!")
		return conn.relayMessage(jid, {
			protocolMessage: {
				key,
				type: 14,
				editedMessage: editObject
			}
		}, {})
	}

	conn.sendReact = (m, text) => {
		return conn.sendMessage(m.chat, {
			react: {
				text,
				key: m.key
			}
		})
	}


	/**
	 * Get file from path - Fetches a file from the specified path and optionally saves it to a temporary file.
	 * @param {String} PATH - The path of the file to fetch.
	 * @param {Boolean} saveToFile - Indicates whether to save the fetched file to a temporary file (optional, default: false).
	 * @returns {Object} - An object containing the fetched file data and additional utility functions.
	 * @throws {TypeError} - If the fetch result is not a buffer.
	 */
	conn.getFile = async (PATH, saveToFile = false) => {
		const res = await fetchDataFromPath(PATH)
		if (res.status !== 200) throw new Error("Failed to fetch file: Non-200 status code")

		let filePath
		if (saveToFile && !res.filename) {
			res.filename = `${getRandomString(7)}.${res.ext}`
			filePath = getTempDir(res.filename)
			await fs.promises.writeFile(filePath, res.data)
		}

		return {
			filePath,
			...res,
			deleteFile: () => res.filename && fs.promises.unlink(res.filename),
		}
	}

	/**
	 * Send file as message - Sends a file as a message to the specified recipient.
	 * @param {String} jid - The ID of the recipient.
	 * @param {String} PATH - The path of the file to send.
	 * @param {Object} options - Additional options for sending the file (optional).
	 * @returns {Promise} - A promise that resolves when the file is successfully sent.
	 * @throws {Error} - If the file cannot be sent.
	 */
	conn.sendFile = async (jid, PATH, options = {}) => {
		const res = await conn.getFile(PATH)
		if (res.status !== 200 || res.data.length <= 65536) {
			throw new Error("Failed to send file: Invalid status or file size too small");
		}

		let { mime, data } = res
		let mtype = ""

		if (options.asDocument === true) mtype = "document"
		else if (/webp/.test(mime)) mtype = "sticker"
		else if (/image/.test(mime)) mtype = "image"
		else if (/video/.test(mime)) mtype = "video"
		else if (/audio/.test(mime)) mtype = "audio"
		else mtype = "document"

		let messageOptions = {
			[mtype]: { url: data },
			mimetype: mime,
			caption: options.caption,
			ptt: options.ptt,
			...options,
		}

		return await conn.sendMessage(jid, messageOptions, {
			filename: options.filename || res.filename,
			...options,
		})
	}

	/**
	 * Quick send message - Sends a message or file as a message to the specified recipient.
	 * @param {String} jid - The ID of the recipient.
	 * @param {String | Buffer} PATH - The path or content of the message/file to send.
	 * @param {Object} options - Additional options for sending the message/file (optional).
	 * @returns {Promise} - A promise that resolves when the message/file is successfully sent.
	 */
	conn.quickSendMessage = (jid, PATH, options) => {
		return Buffer.isBuffer(PATH)
			? conn.sendFile(jid, PATH, options)
			: conn.sendMessage(jid, { ...options, text: PATH, mentions: parseMention(PATH) }, options)
	}

	/**
	 * Download media message - Downloads media content from a message and saves it to a file or returns it as a buffer.
	 * @param {Object} m - The message object containing the media content.
	 * @param {String} type - The type of media content to download.
	 * @param {fs.PathLike | fs.promises.FileHandle} saveToFile - The path or file handle to save the downloaded content to (optional).
	 * @returns {Promise<fs.PathLike | fs.promises.FileHandle | Buffer>} - A promise that resolves to the path or file handle of the saved file if `saveToFile` is provided and the file exists, otherwise resolves to the downloaded content as a buffer.
	 */
	conn.downloadM = async (m, type, saveToFile) => {
		if (!m || !(m.url || m.directPath)) return Buffer.alloc(0)
		const stream = await downloadContentFromMessage(m, type)
		let buffer = Buffer.from([])
		for await (const chunk of stream) {
			buffer = Buffer.concat([buffer, chunk])
		}
		if (saveToFile) {
			const { filePath, data } = await conn.getFile(buffer, true)
			return fs.existsSync(filePath) ? data : buffer
		}
		return buffer
	}

	/**
	 * Copy and forward message - Copies a message and forwards it to the specified recipient with optional customizations.
	 * @param {String} jid - The ID of the recipient.
	 * @param {Object} sourceMessage - The source message object to be copied and forwarded.
	 * @param {Object} options - Additional options for copying and forwarding the message (optional).
	 * @returns {Promise<Object>} - A promise that resolves to the copied and forwarded message object.
	 */
	conn.copyNForward = async (jid, sourceMessage, options = {}) => {
		options = {
			forward: typeof options.forward === "boolean" ? options.forward : false,
			forwardScore: typeof options.forwardScore === "number" ? options.forwardScore : options.forward === true ? 1 : 0,
			readViewOnce: typeof options.readViewOnce === "boolean" ? options.readViewOnce : false,
		}

		let viewOnce = sourceMessage.message.viewOnceMessage?.message || sourceMessage.message.viewOnceMessageV2?.message
		if (options.readViewOnce && viewOnce) {
			let viewOnceType = Object.keys(viewOnce)[0]
			delete sourceMessage.message.viewOnceMessage.message[viewOnceType].viewOnce
			sourceMessage.message = proto.Message.fromObject(JSON.parse(JSON.stringify(viewOnce)))
			sourceMessage.message[viewOnceType].contextInfo = viewOnce.contextInfo
		}

		const messageType = Object.keys(sourceMessage.message)[0]
		const forwardMessage = generateForwardMessageContent(sourceMessage, options.forward)
		const contentype = Object.keys(forwardMessage)[0]
		if (options.forward && options.forwardScore > 0) {
			forwardMessage[contentype].contextInfo.forwardingScore += options.forwardScore
		}
		forwardMessage[contentype].contextInfo = {
			...(sourceMessage.message[messageType].contextInfo || {}),
			...(forwardMessage[contentype].contextInfo || {}),
		}
		const waMessage = generateWAMessageFromContent(jid, forwardMessage, {
			...options,
			userJid: conn.user.jid,
		})
		await conn.relayMessage(jid, waMessage.message, { messageId: waMessage.key.id })
		return waMessage
	}

	return conn
}
