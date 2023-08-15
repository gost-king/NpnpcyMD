import { validateType, isEmpty, nullish } from "./Utility.js"

const commands = []

/**
 * Adds a command to the command list.
 * @param {Object} info - The information object containing details about the command.
 * @param {Function} func - The function to execute when the command is triggered.
 * @returns {Object} - The command structure that was added.
 */
function addCommand(info, func) {
	if (typeof func !== "function" || nullish(func)) throw new Error("Invalid function parameter, second parameter must be a function.")
	if (typeof info !== "object" || nullish(info)) throw new Error("Invalid info parameter, first parameter must be an object.")
	if (typeof info.on !== "string" || !["text","cmd"].includes(info.on)) throw new Error("Invalid info.on value, 'on' must be either 'text' or 'cmd'.")

	info.on = !nullish(info.pattern) && nullish(info.on) ? "cmd" : !nullish(info.title) && nullish(info.on) ? "text" : info.on

	const onTxt = {
		title: validateType(info.title, "string")
	}

	const onCmd = {
		desc: validateType(info.desc, "string"),
		usage: validateType(info.usage, "string"),
		category: validateType(info.category, "string", "Beta"),
		display: validateType(info.display, "string"),
		sucReact: validateType(info.sucReact, "string")
	}

	const commandStructure = {
		...(info.on === "text" ? onTxt : onCmd),
		on: info.on,
		ignore: validateType(info.ignore, "array"),
		noPrefix: validateType(info.noPrefix, "boolean"),
		execute: func
	}

	if (info.on === "cmd" && (
		nullish(info.pattern) &&
		typeof info.pattern !== "string" &&
		!Array.isArray(info.pattern) &&
		!(info.pattern instanceof RegExp)
	)) throw new Error("Invalid info.pattern value, 'pattern' must be a string, an array, or a regular expression.")

	if (info.on === "cmd") {
		if (Array.isArray(info.pattern)) {
			if (info.pattern.length === 0 || !info.pattern.every((cmd) => typeof cmd === "string")) throw new Error("Invalid info.pattern array, 'pattern' must be a non-empty array of strings.")
			if (info.pattern.length === 1) {
				commandStructure.display = nullish(info.display) || isEmpty(info.display) ? info.pattern[0] : info.display
			} else if (info.pattern.length > 1) {
				if (nullish(info.display) || isEmpty(info.display)) throw new Error("Invalid info.display value, 'display' must be provided when info.pattern has multiple value.")
				commandStructure.display = info.display
			}

		} else if (typeof info.pattern === "string") {
			commandStructure.display = nullish(info.display) || isEmpty(info.display) ? info.pattern : info.display

		} else if (info.pattern instanceof RegExp) {
			if (isEmpty(info.display)) throw new Error("Invalid info.display value, 'display' must be provided when info.pattern is a regular expression.")
			commandStructure.display = info.display
		}
		commandStructure.pattern = info.pattern
	}

	commands.push(commandStructure)
	return commandStructure
}

export { addCommand, commands }