import fetch from "node-fetch"
import path from "path"
import fs from "fs"
import { __dirname, getFileName } from "./Helper.js"
import { fileTypeFromBuffer } from "file-type"
import { jidDecode } from "@whiskeysockets/baileys"

/**
 * Asynchronously pauses the execution for the specified duration.
 * @param {number} ms - The duration in milliseconds to sleep.
 * @returns {Promise} - A promise that resolves after the specified duration.
 */
export async function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Checks if the given argument is nullish (null or undefined).
 * @param {*} args - The argument to check.
 * @returns {Boolean} - Returns true if the argument is nullish, false otherwise.
 */
export function nullish(args) {
	return args === null || args === undefined
}

/**
 * Returns a random element from the given array.
 * @param {Array} arr - The array to choose a random element from.
 * @returns {*} - A random element from the array.
 */
export function getRandom(arr) {
	return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Generates a random string of specified length.
 * @param {Number} length - The length of the random string to generate (default: 10).
 * @returns {String} - The randomly generated string.
 */
export function getRandomString(length = 10) {
	let result = ""
	const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890"
	const charactersLength = characters.length

	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * charactersLength))
	}

	return result
}

/**
 * Checks if a value is empty.
 * @param {*} value - The value to check.
 * @returns {Boolean} - True if the value is empty, false otherwise.
 */
export function isEmpty(value) {
	if (typeof value === "string") {
		return value.trim() === ""
	} else if (Array.isArray(value) || typeof value === "object") {
		return Object.keys(value).length === 0
	} else {
		return false
	}
}

/**
 * Decode a JID (Jabber Identifier) and return the decoded value.
 * @param {String} jid - The JID to be decoded.
 * @returns {String|Null} - The decoded JID value or null if the input is invalid.
 */
export function decodeJid(jid) {
	if (!jid || typeof jid !== "string") return (!nullish(jid) && jid) || null
	if (/:\d+@/gi.test(jid)) {
		const decode = jidDecode(jid) || {}
		return (decode.user && decode.server && decode.user + "@" + decode.server || jid).trim()
	} else {
		return jid.trim()
	}
}

/**
 * Import commands from a specified folder path.
 * @param {String} folderPath - The path of the folder containing the commands.
 */
export function importCommands(folderPath) {
	fs.readdirSync(folderPath).forEach(file => {
		if (!file.startsWith("__")) {
			const filePath = path.join(folderPath, file)
			const isDir = fs.statSync(filePath).isDirectory()
			if (isDir) {
				importCommands(filePath)
			} else {
				const rootFolderPath = path.join(__dirname(import.meta), "../")
				import(
					path.join(rootFolderPath, filePath)
				)
			}
		}
	})
}

/**
 * Validates the given value against the specified type and returns the value if it matches the type, or the default value otherwise.
 * @param {*} value - The value to validate.
 * @param {String} type - The type to validate against (supported types: "string", "object", "array", "number").
 * @param {*} defaultValue - The default value to return if the validation fails.
 * @returns {*} - The validated value or the default value.
 */
export function validateType(value, type, defaultValue) {
	const supportedTypes = ["string", "boolean", "object", "array", "number"]
	defaultValue = defaultValue ? defaultValue : { "string": "", "object": {}, "array": [], "number": 0, "boolean": false }[type]

	if (!supportedTypes.includes(type)) {
		throw new Error(`Unsupported type: ${type}`)
	}

	if (type === "array") {
		return Array.isArray(value) ? value : defaultValue
	}

	return typeof value === type ? value : defaultValue
}

/**
 * Abbreviates a large number by scaling it down and appending an appropriate suffix.
 * @param {number} num - The number to abbreviate.
 * @returns {string} - The abbreviated string representation of the number.
 */
export function abbreviateNumber(num) {
	if (num < 1000) {
		return num.toString()
	}

	const suffixes = ["", "ribu", "juta", "miliar", "triliun"]
	const suffixIndex = Math.floor(num.toString().length / 3)
	let abbreviatedValue = ""

	for (let precision = 2; precision >= 1; precision--) {
		abbreviatedValue = parseFloat(
			(suffixIndex !== 0 ? num / Math.pow(1000, suffixIndex) : num).toPrecision(precision)
		)

		let sanitizedValue = abbreviatedValue.toString().replace(/[^a-zA-Z0-9]+/g, "")

		if (sanitizedValue.length <= 2) {
			break
		}
	}

	if (abbreviatedValue % 1 !== 0) {
		abbreviatedValue = abbreviatedValue.toFixed(1)
	}

	return abbreviatedValue + suffixes[suffixIndex]
}

/**
 * Formats the given size in bytes into a human-readable string representation.
 * @param {number} bytes - The size in bytes.
 * @param {boolean} si - Whether to use the SI (decimal) system or the binary system (default: false).
 * @param {number} dp - The number of decimal places to round the result (default: 1).
 * @returns {string} - The formatted string representing the size.
 */
export function formatSize(bytes, si = false, dp = 1) {
	const thresh = si ? 1000 : 1024
	if (Math.abs(bytes) < thresh) return bytes + " B"
	const units = si
		? ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
		: ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"]
	let u = -1
	const r = 10 ** dp
	do {
		bytes /= thresh
		++u
	} while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1)
	return bytes.toFixed(dp) + " " + units[u]
}

/**
 * Fetches data from a specified path.
 * @param {string|Buffer|ArrayBuffer} PATH - The path or buffer to fetch data from.
 * @returns {Object} - An object containing the fetched data and metadata.
 */
export async function fetchDataFromPath(PATH) {
	try {
		let filename = undefined
		let status, data

		if (Buffer.isBuffer(PATH) || PATH instanceof ArrayBuffer) {
			status = 200
			data = Buffer.from(PATH)
		} else if (/^data:.*?\/.*?;base64,/i.test(PATH)) {
			status = 200
			data = Buffer.from(PATH.split(",")[1], "base64")
		} else if (/^https?:\/\//.test(PATH)) {
			const res = await fetch(PATH)
			status = res.status
			data = await res.buffer()
		} else if (fs.existsSync(PATH)) {
			status = 200
			data = fs.readFileSync(PATH)
			filename = getFileName(PATH)
		} else {
			status = typeof PATH === "string" ? 200 : 404
			data = status === 200 ? PATH : Buffer.alloc(0)
		}

		const fileType = await fileTypeFromBuffer(data) || { mime: "application/octet-stream", ext: ".bin" }

		return { status, filename, filesize: (data.length || data.byteLength), ...fileType, data }
	} catch (error) {
		throw error
	}
}

/**
 * Parses mentions in a text and returns an array of JIDs.
 * @param {string} text - The text to parse mentions from.
 * @returns {Array} - An array of parsed JIDs.
 */
export function parseMention(text = "") {
	return [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + "@s.whatsapp.net")
}

export function isSameThing(thing1, thing2) {
	return Array.isArray(thing1) ?
		thing1.includes(thing2) : (typeof thing1 === "string") && !isEmpty(thing1) ?
			(thing1 === thing2) : (thing1 instanceof RegExp) ?
				thing1.test(thing2) : false
}

const more = String.fromCharCode(8206)
export const readmore = more.repeat(4001)

export function isObject(obj) {
	return obj !== null && typeof obj === 'object' && !Array.isArray(obj)
}
