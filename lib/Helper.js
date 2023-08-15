import { fileURLToPath, pathToFileURL } from "url"
import path from "path"
import os from "os"
import fs from "fs"

/**
 * Get the filename from a given path URL.
 * @param {URL|String} pathURL - The path URL to extract the filename from.
 * @param {Boolean} rmPrefix - Indicates whether to remove the prefix based on the operating system.
 * @returns {String} - The filename extracted from the path URL.
 */
const __filename = function(pathURL = import.meta, rmPrefix = os.platform() !== "win32") {
	const path = (pathURL).url || (pathURL)
	return rmPrefix ?
		/file:\/\/\//.test(path) ?
			fileURLToPath(path) : path
		: /file:\/\/\//.test(path) ?
			path : pathToFileURL(path).href
}

/**
 * Get the directory name from a given path URL.
 * @param {URL|String} pathURL - The path URL to extract the directory name from.
 * @returns {String} - The directory name extracted from the path URL.
 */
const __dirname = function(pathURL) {
	const dir = __filename(pathURL, true)
	const regex = /\/$/
	return regex.test(dir) ?
		dir : fs.existsSync(dir) && fs.statSync(dir).isDirectory() ?
			dir.replace(regex, "") : path.dirname(dir)
}

/**
 * Get the folder name from a given path URL.
 * @param {URL|String} pathURL - The path URL to extract the folder name from.
 * @returns {String} - The folder name extracted from the path URL.
 */
const getFolderName = function(pathURL) {
	const dirname = __dirname(pathURL)
	const array = dirname.split("/")
	return array[array.length - 1]
}

/**
 * Get the file name from a given path URL.
 * @param {URL|String} pathURL - The path URL to extract the file name from.
 * @returns {String} - The file name extracted from the path URL.
 */
const getFileName = function(pathURL) {
	const filename = __filename(pathURL, true)
	const array = filename.split("/")
	return array[array.length - 1]
}

/**
 * Get the temporary directory path by joining the given path URL with the temporary directory.
 * @param {URL|String} pathURL - The path URL to join with the temporary directory.
 * @returns {String} - The path of the temporary directory joined with the given path URL.
 */
const getTempDir = function(pathURL) {
	const dirname = __dirname(import.meta)
	const tempDir = path.join(dirname, "../data/tmp")
	return path.join(tempDir, pathURL)
}

export {
	__filename,
	__dirname,
	getFolderName,
	getFileName,
	getTempDir
}
