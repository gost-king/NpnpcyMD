const { areJidsSameUser, proto } = (await import("@whiskeysockets/baileys")).default
import { decodeJid } from "../Utility.js"

/**
 * Serialize a message object for communication.
 * @param {Object} conn - The connection object.
 * @param {Object} m - The message object to be serialized.
 * @returns {Object} - The serialized message object.
 */
export default function serialize(conn, m) {
	if(!m) return m

	const senderKeyDistributionMessage = m.message?.senderKeyDistributionMessage?.groupId
	if (m.key) {
		m.chat = decodeJid(m.key?.remoteJid || (senderKeyDistributionMessage && senderKeyDistributionMessage !== "status@broadcast") || "")
		m.sender = decodeJid(m.key.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || "")
		m.isBaileys = m.key.id && m.key.id.length === 16 || m.key.id.startsWith("3EB0") && m.key.id.length === 12 || false
		m.isGroup = m.chat.endsWith("@g.us")
		m.fromMe = m.key.fromMe || areJidsSameUser(m.sender, conn.user.id)
	}

	if(m.message) {
		const type = Object.keys(m.message)
		const mtype = (!["senderKeyDistributionMessage", "messageContextInfo"].includes(type[0]) && type[0]) || (type.length >= 3 && type[1] !== "messageContextInfo" && type[1]) || type[type.length - 1]
		m.message = (mtype === "viewOnceMessageV2") ?
			m.message[mtype].message : (mtype === "documentWithCaptionMessage") ?
				m.message[mtype].message : m.message
		m.mtype = ["viewOnceMessageV2","documentWithCaptionMessage"].includes(mtype) ? Object.keys(m.message)[0] : mtype
		m.msg = m.message[m.mtype]

		let mtext = m.message?.conversation || m.msg?.caption || m.msg?.text || m.msg?.selectedId || m.msg?.selectedButtonId || m.msg?.contentText || m.msg?.message || m.msg?.selectedDisplayText || m.msg?.hydratedContentText || m.msg?.singleSelectReply?.selectedRowId || ""
		let mmtext = ["protocolMessage", "messageContextInfo", "stickerMessage", "audioMessage", "senderKeyDistributionMessage"].includes(m.mtype) ?
			String("") : mtext
		m.text = typeof mmtext === "string" ? mmtext : ""
		m.mentionedJid = m.msg?.contextInfo?.mentionedJid?.length && m.msg.contextInfo.mentionedJid || []
		const contextInfo = m.msg?.contextInfo
		const quoted = contextInfo?.quotedMessage
		if (quoted) {
			const type = Object.keys(quoted)[0]
			m.quoted = (typeof quoted[type] === "string") ? { text: m.quoted } : quoted[type]
			m.quoted.mtype = type
			m.quoted.id = contextInfo.stanzaId
			m.quoted.chat = decodeJid(contextInfo.remoteJid || m.chat)
			m.quoted.isBaileys = (m.quoted.id?.length === 16 || m.quoted.id?.startsWith("3EB0") && m.quoted.id.length === 12 || false)
			m.quoted.sender = decodeJid(contextInfo.participant || m.quoted.chat || "")
			m.quoted.fromMe = areJidsSameUser(m.quoted.sender, conn.user.jid)
			m.quoted.text = m.quoted?.text || m.quoted?.caption || m.quoted?.contentText || m.quoted?.selectedDisplayText || ""
			m.quoted.mentionedJid = m.quoted.contextInfo?.mentionedJid?.length && m.quoted.contextInfo.mentionedJid || []

			// Quoted Method
			if (m.quoted.url || m.quoted.directPath) m.quoted.download = () => conn.downloadM(m.quoted, m.quoted.mtype.toLowerCase().replace(/message/i, ''))
		}
		// Method
		m.reply = async (text, chatId, options) => conn.quickSendMessage(chatId ? chatId : m.chat, text, { quoted: m, ...options })
		if (m.msg && m.msg.url) m.download = () => conn.downloadM(m.msg, m.mtype.toLowerCase().replace(/message/i, ''))
	}
	return m
}