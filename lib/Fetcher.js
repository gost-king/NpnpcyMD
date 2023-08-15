import { getRandomString } from "./Utility.js"
import axios from "axios"

export async function getBuffer(url, opts) {
	try {
		const res = await axios({
			method: "get",
			url,
			headers: {
				'DNT': 1,
				'Upgrade-Insecure-Requests': 1,
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36'
			},
			...opts,
			responseType: 'arraybuffer'
		})
		return res.data
	} catch (e) {
		throw e
	}
}